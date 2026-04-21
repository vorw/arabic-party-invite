create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  subtitle text,
  description text,
  event_date timestamptz,
  event_slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  location_name text,
  location_address text,
  location_maps_url text,
  location_image_url text,
  theme text not null default 'classic-blue',
  cover_image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.event_settings (
  event_id uuid primary key references public.events (id) on delete cascade,
  allow_decline boolean not null default true,
  collect_guest_count boolean not null default false,
  collect_phone boolean not null default false,
  collect_note boolean not null default false,
  show_location_after_accept boolean not null default true,
  response_limit_mode text not null default 'single' check (response_limit_mode in ('single', 'editable')),
  notify_email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  guest_name text not null,
  guest_email text,
  guest_phone text,
  guest_identifier text,
  invite_code text not null unique,
  status text not null default 'pending' check (status in ('pending', 'viewed', 'accepted', 'declined')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  response text not null check (response in ('accepted', 'declined')),
  guest_name_snapshot text not null,
  guest_count integer,
  note text,
  responded_at timestamptz not null default timezone('utc', now()),
  ip_hash text,
  user_agent text
);

create table if not exists public.event_assets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  kind text not null check (kind in ('logo', 'cover', 'location')),
  file_url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists events_owner_id_idx on public.events (owner_id);
create index if not exists guests_event_id_idx on public.guests (event_id);
create index if not exists guests_invite_code_idx on public.guests (invite_code);
create index if not exists responses_event_id_idx on public.responses (event_id, responded_at desc);
create index if not exists responses_guest_id_idx on public.responses (guest_id, responded_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

drop trigger if exists event_settings_set_updated_at on public.event_settings;
create trigger event_settings_set_updated_at
before update on public.event_settings
for each row
execute function public.set_updated_at();

drop trigger if exists guests_set_updated_at on public.guests;
create trigger guests_set_updated_at
before update on public.guests
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    lower(split_part(coalesce(new.email, new.id::text), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists auth_user_profile_bootstrap on auth.users;
create trigger auth_user_profile_bootstrap
after insert on auth.users
for each row
execute function public.handle_new_profile();

create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function public.can_access_guest_by_code(target_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.guests
    where invite_code = target_code
  );
$$;

create or replace function public.guest_event_snapshot(target_code text)
returns table (
  invite_code text,
  guest_name text,
  event_title text,
  event_copy text,
  event_date_label text,
  event_time_label text,
  venue_label text,
  location_url text,
  location_image_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    g.invite_code,
    g.guest_name,
    e.title as event_title,
    coalesce(e.description, '') as event_copy,
    coalesce(to_char(e.event_date at time zone 'Asia/Riyadh', 'FMDay DD FMMonth'), '') as event_date_label,
    coalesce(to_char(e.event_date at time zone 'Asia/Riyadh', 'HH12:MI PM'), '') as event_time_label,
    coalesce(e.location_name, '') as venue_label,
    coalesce(e.location_maps_url, '') as location_url,
    coalesce(e.location_image_url, '') as location_image_url
  from public.guests g
  join public.events e on e.id = g.event_id
  where g.invite_code = target_code
  limit 1;
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_settings enable row level security;
alter table public.guests enable row level security;
alter table public.responses enable row level security;
alter table public.event_assets enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "events owner all" on public.events;
create policy "events owner all"
on public.events
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "event settings owner all" on public.event_settings;
create policy "event settings owner all"
on public.event_settings
for all
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.owner_id = auth.uid()
  )
);

drop policy if exists "guests owner all" on public.guests;
create policy "guests owner all"
on public.guests
for all
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.owner_id = auth.uid()
  )
);

drop policy if exists "responses owner read" on public.responses;
create policy "responses owner read"
on public.responses
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.owner_id = auth.uid()
  )
);

drop policy if exists "responses public insert" on public.responses;
create policy "responses public insert"
on public.responses
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.guests g
    where g.id = guest_id
      and g.event_id = event_id
      and char_length(trim(guest_name_snapshot)) > 0
  )
);

drop policy if exists "assets owner all" on public.event_assets;
create policy "assets owner all"
on public.event_assets
for all
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.owner_id = auth.uid()
  )
);

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.can_access_guest_by_code(text) to anon, authenticated;
grant execute on function public.guest_event_snapshot(text) to anon, authenticated;

comment on table public.profiles is 'Host identities for Invitations.live product users.';
comment on table public.events is 'Events created by hosts.';
comment on table public.event_settings is 'Per-event RSVP behavior and notification settings.';
comment on table public.guests is 'Guests invited to each event, each with a unique invite code.';
comment on table public.responses is 'RSVP responses submitted by guests.';
comment on table public.event_assets is 'Uploads linked to an event such as logo, cover, or location images.';
