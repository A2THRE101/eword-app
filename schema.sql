begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.debt_records (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  counterparty_name text not null check (length(trim(counterparty_name)) > 0),
  obligation_type text not null check (obligation_type in ('lent', 'borrowed')),
  issued_on date not null default current_date,
  due_on date not null,
  comment text not null default '',
  amount_kopecks bigint not null check (amount_kopecks > 0),
  paid_kopecks bigint not null default 0 check (paid_kopecks >= 0 and paid_kopecks <= amount_kopecks),
  status text not null default 'pending' check (status in ('pending', 'active', 'overdue', 'closed')),
  confirmed_by_other boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.debt_records
  alter column id set default gen_random_uuid(),
  alter column paid_kopecks set default 0,
  alter column status set default 'pending',
  alter column confirmed_by_other set default false,
  alter column created_at set default now(),
  alter column updated_at set default now();

create table if not exists public.confirmation_requests (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  related_debt_record_id uuid references public.debt_records (id) on delete set null,
  request_type text not null check (length(trim(request_type)) > 0),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.confirmation_requests
  alter column id set default gen_random_uuid(),
  alter column status set default 'pending',
  alter column created_at set default now(),
  alter column updated_at set default now();

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

drop trigger if exists debt_records_set_updated_at on public.debt_records;
create trigger debt_records_set_updated_at
  before update on public.debt_records
  for each row
  execute function public.set_updated_at();

drop trigger if exists confirmation_requests_set_updated_at on public.confirmation_requests;
create trigger confirmation_requests_set_updated_at
  before update on public.confirmation_requests
  for each row
  execute function public.set_updated_at();

create index if not exists debt_records_owner_status_idx
  on public.debt_records (owner_user_id, status);

create index if not exists debt_records_owner_due_idx
  on public.debt_records (owner_user_id, due_on);

create index if not exists confirmation_requests_owner_status_idx
  on public.confirmation_requests (owner_user_id, status);

create index if not exists confirmation_requests_related_debt_idx
  on public.confirmation_requests (related_debt_record_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.debt_records to authenticated;
grant select, insert, update, delete on public.confirmation_requests to authenticated;

alter table public.debt_records enable row level security;
alter table public.confirmation_requests enable row level security;

drop policy if exists debt_records_select_own on public.debt_records;
create policy debt_records_select_own
  on public.debt_records
  for select
  to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists debt_records_insert_own on public.debt_records;
create policy debt_records_insert_own
  on public.debt_records
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists debt_records_update_own on public.debt_records;
create policy debt_records_update_own
  on public.debt_records
  for update
  to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists debt_records_delete_own on public.debt_records;
create policy debt_records_delete_own
  on public.debt_records
  for delete
  to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists confirmation_requests_select_own on public.confirmation_requests;
create policy confirmation_requests_select_own
  on public.confirmation_requests
  for select
  to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists confirmation_requests_insert_own on public.confirmation_requests;
create policy confirmation_requests_insert_own
  on public.confirmation_requests
  for insert
  to authenticated
  with check (
    (select auth.uid()) = owner_user_id
    and (
      related_debt_record_id is null
      or exists (
        select 1
        from public.debt_records dr
        where dr.id = confirmation_requests.related_debt_record_id
          and dr.owner_user_id = (select auth.uid())
      )
    )
  );

drop policy if exists confirmation_requests_update_own on public.confirmation_requests;
create policy confirmation_requests_update_own
  on public.confirmation_requests
  for update
  to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check (
    (select auth.uid()) = owner_user_id
    and (
      related_debt_record_id is null
      or exists (
        select 1
        from public.debt_records dr
        where dr.id = confirmation_requests.related_debt_record_id
          and dr.owner_user_id = (select auth.uid())
      )
    )
  );

drop policy if exists confirmation_requests_delete_own on public.confirmation_requests;
create policy confirmation_requests_delete_own
  on public.confirmation_requests
  for delete
  to authenticated
  using ((select auth.uid()) = owner_user_id);

commit;
