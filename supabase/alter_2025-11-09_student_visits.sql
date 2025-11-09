-- Alterations for student_visits table applied on 2025-11-09.
-- This script assumes the base schema has already been executed.

alter table if exists public.student_visits
  add column if not exists student_batch text;

alter table if exists public.student_visits
  add column if not exists student_major text;

alter table if exists public.student_visits
  drop constraint if exists student_visits_batch;

alter table if exists public.student_visits
  add constraint student_visits_batch
  check (student_batch is null or length(trim(student_batch)) > 0);

alter table if exists public.student_visits
  drop constraint if exists student_visits_major;

alter table if exists public.student_visits
  add constraint student_visits_major
  check (
    student_major is null or student_major in (
      'Computer Science',
      'Computer Engineering',
      'Electrical Engineering',
      'Communication and Design',
      'Social, Development and Policy',
      'Comparative Humanities'
    )
  );

alter table if exists public.student_visits
  drop constraint if exists student_visits_id_format;

alter table if exists public.student_visits
  add constraint student_visits_id_format
  check (trim(student_id) ~* '^[A-Z]{2}[0-9]{5}$');

alter table if exists public.student_visits
  drop constraint if exists student_visits_email;

alter table if exists public.student_visits
  add constraint student_visits_email
  check (
    length(trim(student_email)) > 0 and
    trim(student_email) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  );
