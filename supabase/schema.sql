-- Enable extensions required for UUID generation.
create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1 from pg_type typ
    join pg_namespace nsp on nsp.oid = typ.typnamespace
    where typ.typname = 'user_role' and nsp.nspname = 'public'
  ) then
    create type public.user_role as enum ('super_admin', 'staff', 'corporate');
  end if;
end
$$;

-- Users table holds core profile and authorization metadata.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role public.user_role not null default 'corporate',
  created_at timestamptz not null default now(),
  created_by uuid references public.users (id) on delete set null,
  constraint users_email_check check (length(trim(email)) > 0)
);

-- Corporate clients mapped to auth users (corporate role expected).
create table if not exists public.corporate_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  company_name text not null,
  stall_number text,
  stall_position jsonb,
  created_at timestamptz not null default now(),
  constraint corporate_clients_company_name check (length(trim(company_name)) > 0),
  constraint corporate_clients_stall_position_shape check (
    stall_position is null or (
      (stall_position ? 'x') and
      (stall_position ? 'y') and
      (stall_position ? 'floor_id')
    )
  ),
  unique (user_id)
);

-- Floors represent physical locations within the venue.
create table if not exists public.floors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  map_image_url text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  constraint floors_name check (length(trim(name)) > 0)
);

-- Stalls belong to floors and can optionally be assigned to a corporate client.
create table if not exists public.stalls (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references public.floors (id) on delete cascade,
  stall_identifier text not null,
  position jsonb not null,
  corporate_client_id uuid references public.corporate_clients (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stalls_identifier check (length(trim(stall_identifier)) > 0),
  constraint stalls_position_shape check (
    (position ? 'x') and (position ? 'y')
  ),
  unique (floor_id, stall_identifier)
);

-- Student visit log tied to corporate clients.
create table if not exists public.student_visits (
  id uuid primary key default gen_random_uuid(),
  corporate_client_id uuid not null references public.corporate_clients (id) on delete cascade,
  student_name text not null,
  student_id text not null,
  student_email text not null,
  student_phone text,
  student_batch text,
  student_major text,
  notes text,
  is_flagged boolean not null default false,
  visited_at timestamptz not null default now(),
  constraint student_visits_name check (length(trim(student_name)) > 0),
  constraint student_visits_email check (length(trim(student_email)) > 0),
  constraint student_visits_id_format check (length(trim(student_id)) > 0),
  constraint student_visits_batch check (student_batch is null or length(trim(student_batch)) > 0),
  constraint student_visits_major check (
    student_major is null or student_major in (
      'Computer Science',
      'Computer Engineering',
      'Electrical Engineering',
      'Communication and Design',
      'Social, Development and Policy',
      'Comparative Humanities'
    )
  )
);


-- Administrative settings singleton storing global toggles and security controls.
create table if not exists public.admin_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  event_start_at timestamptz,
  event_end_at timestamptz,
  announcement_enabled boolean not null default false,
  announcement_title text,
  announcement_message text,
  default_export_scope text not null default 'all',
  default_export_format text not null default 'csv',
  session_timeout_minutes integer not null default 45,
  jwt_ttl_hours integer not null default 24,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id) on delete set null,
  constraint admin_settings_scope_check check (default_export_scope in ('all', 'flagged')),
  constraint admin_settings_format_check check (default_export_format in ('csv', 'pdf')),
  constraint admin_settings_timeout_check check (session_timeout_minutes between 10 and 480),
  constraint admin_settings_jwt_ttl_check check (jwt_ttl_hours between 1 and 168)
);


-- Helpful indexes.
create index if not exists idx_corporate_clients_user_id on public.corporate_clients (user_id);
create index if not exists idx_stalls_floor_id on public.stalls (floor_id);
create index if not exists idx_stalls_corporate_client_id on public.stalls (corporate_client_id);
create index if not exists idx_student_visits_client on public.student_visits (corporate_client_id);
create index if not exists idx_student_visits_flagged on public.student_visits (is_flagged);

-- Enable Row Level Security on all tables.
alter table public.users enable row level security;
alter table public.corporate_clients enable row level security;
alter table public.floors enable row level security;
alter table public.stalls enable row level security;
alter table public.student_visits enable row level security;
alter table public.admin_settings enable row level security;

alter table public.users force row level security;
alter table public.corporate_clients force row level security;
alter table public.floors force row level security;
alter table public.stalls force row level security;
alter table public.student_visits force row level security;
alter table public.admin_settings force row level security;

drop policy if exists "users_super_admin_all" on public.users;
create policy "users_super_admin_all" on public.users
  for all
  using (auth.jwt()->> 'role' = 'super_admin')
  with check (auth.jwt()->> 'role' = 'super_admin');

drop policy if exists "users_staff_insert" on public.users;
create policy "users_staff_insert" on public.users
  for insert
  with check (auth.jwt()->> 'role' in ('super_admin', 'staff'));

drop policy if exists "users_staff_select" on public.users;
create policy "users_staff_select" on public.users
  for select
  using (auth.jwt()->> 'role' in ('super_admin', 'staff'));

drop policy if exists "users_self_select" on public.users;
create policy "users_self_select" on public.users
  for select
  using (auth.uid() = id);

drop policy if exists "users_self_update" on public.users;
create policy "users_self_update" on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Corporate clients policies.
drop policy if exists "corporate_clients_super_admin_all" on public.corporate_clients;
create policy "corporate_clients_super_admin_all" on public.corporate_clients
  for all
  using (auth.jwt()->> 'role' = 'super_admin')
  with check (auth.jwt()->> 'role' = 'super_admin');

drop policy if exists "corporate_clients_staff_manage" on public.corporate_clients;
create policy "corporate_clients_staff_manage" on public.corporate_clients
  for all
  using (auth.jwt()->> 'role' = 'staff')
  with check (auth.jwt()->> 'role' = 'staff');

drop policy if exists "corporate_clients_corporate_select" on public.corporate_clients;
create policy "corporate_clients_corporate_select" on public.corporate_clients
  for select
  using (
    auth.jwt()->> 'role' = 'corporate' and user_id = auth.uid()
  );

drop policy if exists "corporate_clients_corporate_update" on public.corporate_clients;
create policy "corporate_clients_corporate_update" on public.corporate_clients
  for update
  using (
    auth.jwt()->> 'role' = 'corporate' and user_id = auth.uid()
  )
  with check (
    auth.jwt()->> 'role' = 'corporate' and user_id = auth.uid()
  );

-- Floors policies.
drop policy if exists "floors_all_roles_read" on public.floors;
create policy "floors_all_roles_read" on public.floors
  for select
  using (auth.jwt()->> 'role' is not null);

drop policy if exists "floors_admin_manage" on public.floors;
create policy "floors_admin_manage" on public.floors
  for all
  using (auth.jwt()->> 'role' in ('super_admin', 'staff'))
  with check (auth.jwt()->> 'role' in ('super_admin', 'staff'));

-- Stalls policies.
drop policy if exists "stalls_all_roles_read" on public.stalls;
create policy "stalls_all_roles_read" on public.stalls
  for select
  using (auth.jwt()->> 'role' is not null);

drop policy if exists "stalls_admin_manage" on public.stalls;
create policy "stalls_admin_manage" on public.stalls
  for all
  using (auth.jwt()->> 'role' in ('super_admin', 'staff'))
  with check (auth.jwt()->> 'role' in ('super_admin', 'staff'));

-- Student visits policies.
drop policy if exists "student_visits_admin_manage" on public.student_visits;
create policy "student_visits_admin_manage" on public.student_visits
  for all
  using (auth.jwt()->> 'role' in ('super_admin', 'staff'))
  with check (auth.jwt()->> 'role' in ('super_admin', 'staff'));

drop policy if exists "student_visits_corporate_select" on public.student_visits;
create policy "student_visits_corporate_select" on public.student_visits
  for select
  using (
    auth.jwt()->> 'role' = 'corporate' and
    exists (
      select 1
      from public.corporate_clients cc
      where cc.id = student_visits.corporate_client_id
        and cc.user_id = auth.uid()
    )
  );

  drop policy if exists "student_visits_corporate_modify" on public.student_visits;
  create policy "student_visits_corporate_modify" on public.student_visits
  for insert with check (
    auth.jwt()->> 'role' = 'corporate' and
    exists (
      select 1
      from public.corporate_clients cc
      where cc.id = student_visits.corporate_client_id
        and cc.user_id = auth.uid()
    )
  );

  drop policy if exists "student_visits_corporate_update" on public.student_visits;
  create policy "student_visits_corporate_update" on public.student_visits
  for update
  using (
    auth.jwt()->> 'role' = 'corporate' and
    exists (
      select 1
      from public.corporate_clients cc
      where cc.id = student_visits.corporate_client_id
        and cc.user_id = auth.uid()
    )
  )
  with check (
    auth.jwt()->> 'role' = 'corporate' and
    exists (
      select 1
      from public.corporate_clients cc
      where cc.id = student_visits.corporate_client_id
        and cc.user_id = auth.uid()
    )
  );

-- Admin settings policies.
drop policy if exists "admin_settings_super_admin_manage" on public.admin_settings;
create policy "admin_settings_super_admin_manage" on public.admin_settings
  for all
  using (auth.jwt()->> 'role' = 'super_admin')
  with check (auth.jwt()->> 'role' = 'super_admin');

drop policy if exists "admin_settings_staff_read" on public.admin_settings;
create policy "admin_settings_staff_read" on public.admin_settings
  for select
  using (auth.jwt()->> 'role' in ('super_admin', 'staff'));
