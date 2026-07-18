create table if not exists debt_records (
  id uuid primary key,
  owner_user_id uuid not null,
  counterparty_name text not null,
  obligation_type text not null check (obligation_type in ('lent', 'borrowed')),
  issued_on date not null,
  due_on date not null,
  comment text not null,
  amount_kopecks bigint not null check (amount_kopecks > 0),
  paid_kopecks bigint not null default 0 check (paid_kopecks >= 0),
  status text not null default 'pending' check (status in ('pending', 'active', 'overdue', 'closed')),
  confirmed_by_other boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists debt_records_owner_status_idx
  on debt_records (owner_user_id, status);

create index if not exists debt_records_owner_due_idx
  on debt_records (owner_user_id, due_on);
