-- 20261014000000_initial_schema.sql
-- Initial Schema for Espresso Studio / Portafilter

-- 1. Profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  username text,
  preferred_units jsonb default '{"weight": "g", "temp": "C", "pressure": "bar"}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Equipment (Machines & Grinders)
create table if not exists public.equipment (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('machine', 'grinder', 'accessory')),
  brand text not null,
  model text not null,
  nickname text,
  settings jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Coffee Beans Stash
create table if not exists public.beans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  roaster text not null,
  roast_date date,
  roast_level text,
  process text,
  origin text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Extraction Logs (Shots)
create table if not exists public.shots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  bean_id uuid references public.beans(id) on delete set null,
  grinder_id uuid references public.equipment(id) on delete set null,
  machine_id uuid references public.equipment(id) on delete set null,
  grind_setting numeric(5,2),
  dose_grams numeric(4,1),
  yield_grams numeric(4,1),
  duration_seconds numeric(4,1),
  temp_celsius numeric(4,1),
  pressure_bar numeric(4,1),
  taste_balance integer check (taste_balance between 0 and 100),
  rating integer check (rating between 1 and 5),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.equipment enable row level security;
alter table public.beans enable row level security;
alter table public.shots enable row level security;

-- Policies
create policy "Users can manage their own profile" on public.profiles for all using (auth.uid() = id);
create policy "Users can manage their own equipment" on public.equipment for all using (auth.uid() = user_id);
create policy "Users can manage their own beans" on public.beans for all using (auth.uid() = user_id);
create policy "Users can manage their own shots" on public.shots for all using (auth.uid() = user_id);
