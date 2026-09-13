create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slug text unique not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  full_name text not null,
  company_name text not null,
  title text not null default 'Loan Officer',
  email text,
  phone text,
  nmls text not null,
  website text,
  welcome_message text check (char_length(welcome_message) <= 220),
  brand_color text not null default '#173f5f' check (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  headshot_url text,
  logo_url text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  label text not null check (char_length(label) between 1 and 100),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(profile_id,slug)
);

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  session_id text not null check (char_length(session_id) between 8 and 80),
  event_type text not null check (event_type in ('page_view','interview_started','interview_completed','generation_completed','copy_email','copy_prompts','copy_text','open_email','open_text')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_profile_created_idx on public.analytics_events(profile_id,created_at desc);
create index if not exists analytics_campaign_created_idx on public.analytics_events(campaign_id,created_at desc);

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.analytics_events enable row level security;

create policy "Published profiles are public" on public.profiles for select using (published or auth.uid()=user_id);
create policy "Owners create profiles" on public.profiles for insert with check (auth.uid()=user_id);
create policy "Owners update profiles" on public.profiles for update using (auth.uid()=user_id) with check (auth.uid()=user_id);

create policy "Active campaigns are public" on public.campaigns for select using (active or auth.uid()=profile_id);
create policy "Owners create campaigns" on public.campaigns for insert with check (auth.uid()=profile_id);
create policy "Owners update campaigns" on public.campaigns for update using (auth.uid()=profile_id);
create policy "Owners delete campaigns" on public.campaigns for delete using (auth.uid()=profile_id);

create policy "Anyone records approved events" on public.analytics_events for insert with check (event_type in ('page_view','interview_started','interview_completed','generation_completed','copy_email','copy_prompts','copy_text','open_email','open_text'));
create policy "Owners read their analytics" on public.analytics_events for select using (auth.uid()=profile_id);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('branding','branding',true,10485760,array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update set public=true,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

create policy "Public reads branding" on storage.objects for select using (bucket_id='branding');
create policy "Users upload own branding" on storage.objects for insert with check (bucket_id='branding' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Users update own branding" on storage.objects for update using (bucket_id='branding' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Users delete own branding" on storage.objects for delete using (bucket_id='branding' and (storage.foldername(name))[1]=auth.uid()::text);
