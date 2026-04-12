create extension if not exists pgcrypto;

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null check (char_length(trim(guest_name)) > 0),
  response text not null check (response in ('accepted', 'declined')),
  source text not null default 'web',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists rsvps_created_at_idx on public.rsvps (created_at desc);
create index if not exists rsvps_response_idx on public.rsvps (response);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.rsvps enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "public can insert rsvps" on public.rsvps;
create policy "public can insert rsvps"
on public.rsvps
for insert
to anon, authenticated
with check (
  char_length(trim(guest_name)) > 0
  and response in ('accepted', 'declined')
);

drop policy if exists "admins can read rsvps" on public.rsvps;
create policy "admins can read rsvps"
on public.rsvps
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can delete rsvps" on public.rsvps;
create policy "admins can delete rsvps"
on public.rsvps
for delete
to authenticated
using (public.is_admin());

drop policy if exists "users can read own admin row" on public.admin_users;
create policy "users can read own admin row"
on public.admin_users
for select
to authenticated
using (auth.uid() = user_id);

comment on table public.rsvps is 'Guest RSVP submissions from the invitation page.';
comment on table public.admin_users is 'Auth users allowed to access the /admin dashboard.';
