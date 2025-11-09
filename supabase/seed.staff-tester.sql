-- Seed helper -------------------------------------------------------------------
-- Run this script to create or update a staff tester account for exercising the
-- Habib University staff dashboard features.

with params as (
  select
    'tester.staff@career-city.test'::text as email,
    'StaffPass123!'::text as password
),
upsert_user as (
  insert into public.users (email, password_hash, role)
  select params.email, crypt(params.password, gen_salt('bf')), 'staff'
  from params
  on conflict (email) do update
    set password_hash = excluded.password_hash,
        role = excluded.role
  returning id
)
select
  'Staff tester account ready' as status,
  params.email,
  params.password
from params;
