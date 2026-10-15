-- 20261015000000_update_schema.sql
-- Add bean_name, roaster, flavors, acidity, bitterness columns to shots table for direct storage

alter table public.shots add column if not exists bean_name text;
alter table public.shots add column if not exists roaster text;
alter table public.shots add column if not exists flavors jsonb default '[]'::jsonb;
alter table public.shots add column if not exists acidity integer default 3;
alter table public.shots add column if not exists bitterness integer default 2;

-- Setup profile auto-creation trigger on new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    username = coalesce(excluded.username, public.profiles.username);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Ensure RLS allows insert with auth.uid() check
drop policy if exists "Users can insert their own shots" on public.shots;
create policy "Users can insert their own shots" on public.shots
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can select their own shots" on public.shots;
create policy "Users can select their own shots" on public.shots
  for select using (auth.uid() = user_id);

drop policy if exists "Users can update their own shots" on public.shots;
create policy "Users can update their own shots" on public.shots
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own shots" on public.shots;
create policy "Users can delete their own shots" on public.shots
  for delete using (auth.uid() = user_id);

-- Setup table policies
drop policy if exists "Users can insert their own equipment" on public.equipment;
create policy "Users can insert their own equipment" on public.equipment
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can select their own equipment" on public.equipment;
create policy "Users can select their own equipment" on public.equipment
  for select using (auth.uid() = user_id);

drop policy if exists "Users can update their own equipment" on public.equipment;
create policy "Users can update their own equipment" on public.equipment
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own equipment" on public.equipment;
create policy "Users can delete their own equipment" on public.equipment
  for delete using (auth.uid() = user_id);
