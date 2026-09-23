-- Run in Supabase SQL Editor.
create type public.user_role as enum ('student', 'tutor');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  subject text not null,
  due_at timestamptz,
  source_file_name text,
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score numeric(5,2),
  feedback text,
  submitted_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

alter table public.profiles enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;

create policy "profiles read self" on public.profiles for select using (auth.uid() = id);
create policy "profiles insert self" on public.profiles for insert with check (auth.uid() = id);
create policy "tutors manage own assignments" on public.assignments for all using (auth.uid() = tutor_id) with check (auth.uid() = tutor_id);
create policy "students read open assignments" on public.assignments for select using (status = 'open');
create policy "students manage own submissions" on public.submissions for all using (auth.uid() = student_id) with check (auth.uid() = student_id);
create policy "tutors read submissions for own assignments" on public.submissions for select using (exists (select 1 from public.assignments a where a.id = assignment_id and a.tutor_id = auth.uid()));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer as $$
begin insert into public.profiles (id, full_name, role) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Người dùng'), coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'student')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
