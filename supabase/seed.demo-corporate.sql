-- Configuration -----------------------------------------------------------------
-- Update the literals in the params CTE if you need different demo credentials.

with params as (
  select
    'demo.corporate@career-city.test'::text as email,
    'DemoPass123!'::text as password,
    'Career City Demo Partners'::text as company_name,
    'D-07'::text as stall_number
),
upsert_user as (
  insert into public.users (email, password_hash, role)
  select params.email, crypt(params.password, gen_salt('bf')), 'corporate'
  from params
  on conflict (email) do update
    set password_hash = excluded.password_hash,
        role = excluded.role
  returning id
),
upsert_client as (
  insert into public.corporate_clients (user_id, company_name, stall_number, stall_position)
  select upsert_user.id, params.company_name, params.stall_number, null
  from upsert_user
  cross join params
  on conflict (user_id) do update
    set company_name = excluded.company_name,
        stall_number = excluded.stall_number,
        stall_position = excluded.stall_position
  returning id
)
select
  'Demo corporate tester ready' as status,
  params.email,
  params.password,
  params.company_name,
  params.stall_number
from params;
