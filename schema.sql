begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  email text,
  phone text,
  avatar_url text,
  email_confirmed_at timestamptz,
  mfa_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  default_currency char(3) not null default 'RUB',
  push_reminders_enabled boolean not null default true,
  require_mfa boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (default_currency ~ '^[A-Z]{3}$')
);

create table if not exists public.counterparties (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  contact_hint text not null default '',
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debt_records (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  counterparty_id uuid references public.counterparties (id) on delete set null,
  counterparty_name text not null check (length(trim(counterparty_name)) > 0),
  obligation_type text not null check (obligation_type in ('lent', 'borrowed')),
  issued_on date not null default current_date,
  due_on date not null,
  comment text not null default '',
  amount_kopecks bigint not null check (amount_kopecks > 0),
  paid_kopecks bigint not null default 0 check (paid_kopecks >= 0 and paid_kopecks <= amount_kopecks),
  currency char(3) not null default 'RUB' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'active' check (status in ('draft', 'pending_confirmation', 'active', 'overdue', 'closed', 'canceled')),
  confirmed_by_counterparty boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  debt_record_id uuid not null references public.debt_records (id) on delete cascade,
  amount_kopecks bigint not null check (amount_kopecks > 0),
  paid_on date not null default current_date,
  note text not null default '',
  status text not null default 'confirmed' check (status in ('pending_confirmation', 'confirmed', 'declined', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.confirmation_requests (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  debt_record_id uuid references public.debt_records (id) on delete cascade,
  payment_id uuid references public.payments (id) on delete cascade,
  request_kind text not null check (request_kind in ('debt_create', 'debt_update', 'payment_create', 'debt_close')),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'canceled')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (debt_record_id is not null or payment_id is not null)
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  debt_record_id uuid references public.debt_records (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  event_type text not null check (length(trim(event_type)) > 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  insert into public.profiles (user_id, display_name, email, email_confirmed_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1), ''),
    new.email,
    new.email_confirmed_at
  )
  on conflict (user_id) do update
    set email = excluded.email,
        email_confirmed_at = excluded.email_confirmed_at,
        updated_at = now();

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

drop trigger if exists counterparties_set_updated_at on public.counterparties;
create trigger counterparties_set_updated_at before update on public.counterparties
  for each row execute function public.set_updated_at();

drop trigger if exists debt_records_set_updated_at on public.debt_records;
create trigger debt_records_set_updated_at before update on public.debt_records
  for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

drop trigger if exists confirmation_requests_set_updated_at on public.confirmation_requests;
create trigger confirmation_requests_set_updated_at before update on public.confirmation_requests
  for each row execute function public.set_updated_at();

create unique index if not exists counterparties_owner_name_unique
  on public.counterparties (owner_user_id, lower(display_name));

create index if not exists debt_records_owner_status_idx
  on public.debt_records (owner_user_id, status);

create index if not exists debt_records_owner_due_idx
  on public.debt_records (owner_user_id, due_on);

create index if not exists debt_records_counterparty_idx
  on public.debt_records (counterparty_id);

create index if not exists payments_owner_debt_idx
  on public.payments (owner_user_id, debt_record_id);

create index if not exists confirmation_requests_owner_status_idx
  on public.confirmation_requests (owner_user_id, status);

create index if not exists activity_events_owner_created_idx
  on public.activity_events (owner_user_id, created_at desc);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.counterparties to authenticated;
grant select, insert, update, delete on public.debt_records to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.confirmation_requests to authenticated;
grant select, insert on public.activity_events to authenticated;

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.counterparties enable row level security;
alter table public.debt_records enable row level security;
alter table public.payments enable row level security;
alter table public.confirmation_requests enable row level security;
alter table public.activity_events enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own on public.user_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists user_settings_insert_own on public.user_settings;
create policy user_settings_insert_own on public.user_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists counterparties_select_own on public.counterparties;
create policy counterparties_select_own on public.counterparties
  for select to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists counterparties_insert_own on public.counterparties;
create policy counterparties_insert_own on public.counterparties
  for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists counterparties_update_own on public.counterparties;
create policy counterparties_update_own on public.counterparties
  for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists counterparties_delete_own on public.counterparties;
create policy counterparties_delete_own on public.counterparties
  for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists debt_records_select_own on public.debt_records;
create policy debt_records_select_own on public.debt_records
  for select to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists debt_records_insert_own on public.debt_records;
create policy debt_records_insert_own on public.debt_records
  for insert to authenticated
  with check (
    (select auth.uid()) = owner_user_id
    and (
      counterparty_id is null
      or exists (
        select 1 from public.counterparties c
        where c.id = debt_records.counterparty_id
          and c.owner_user_id = (select auth.uid())
      )
    )
  );

drop policy if exists debt_records_update_own on public.debt_records;
create policy debt_records_update_own on public.debt_records
  for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists debt_records_delete_own on public.debt_records;
create policy debt_records_delete_own on public.debt_records
  for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists payments_insert_own on public.payments;
create policy payments_insert_own on public.payments
  for insert to authenticated
  with check (
    (select auth.uid()) = owner_user_id
    and exists (
      select 1 from public.debt_records dr
      where dr.id = payments.debt_record_id
        and dr.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists payments_update_own on public.payments;
create policy payments_update_own on public.payments
  for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists payments_delete_own on public.payments;
create policy payments_delete_own on public.payments
  for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists confirmation_requests_select_own on public.confirmation_requests;
create policy confirmation_requests_select_own on public.confirmation_requests
  for select to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists confirmation_requests_insert_own on public.confirmation_requests;
create policy confirmation_requests_insert_own on public.confirmation_requests
  for insert to authenticated
  with check (
    (select auth.uid()) = owner_user_id
    and (
      debt_record_id is null
      or exists (
        select 1 from public.debt_records dr
        where dr.id = confirmation_requests.debt_record_id
          and dr.owner_user_id = (select auth.uid())
      )
    )
    and (
      payment_id is null
      or exists (
        select 1 from public.payments p
        where p.id = confirmation_requests.payment_id
          and p.owner_user_id = (select auth.uid())
      )
    )
  );

drop policy if exists confirmation_requests_update_own on public.confirmation_requests;
create policy confirmation_requests_update_own on public.confirmation_requests
  for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists confirmation_requests_delete_own on public.confirmation_requests;
create policy confirmation_requests_delete_own on public.confirmation_requests
  for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists activity_events_select_own on public.activity_events;
create policy activity_events_select_own on public.activity_events
  for select to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists activity_events_insert_own on public.activity_events;
create policy activity_events_insert_own on public.activity_events
  for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);

commit;
