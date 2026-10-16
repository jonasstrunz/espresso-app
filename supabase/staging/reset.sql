-- Staging pipeline: full reset of the long-lived staging branch.
-- Every pipeline run starts from a deterministic state: all application data
-- and auth users are wiped, and the migration history is cleared so
-- `supabase db push` replays supabase/migrations/ from scratch.

begin;

-- Remove all auth users (identities, sessions, refresh tokens cascade with
-- them; profiles and app data cascade via public.profiles).
delete from auth.users;

-- Rebuild the application schema. Only `public` is touched -- auth, storage
-- and extensions schemas belong to the platform.
drop schema if exists public cascade;
create schema public;
grant usage, create on schema public to postgres;
grant usage on schema public to anon, authenticated, service_role;

-- New Supabase branches are created without default privileges on `public`,
-- so grant them up-front: tables/functions/sequences created by the
-- migration push below become reachable through the Data API immediately.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- Clear migration history so db push reapplies every local migration.
drop schema if exists supabase_migrations cascade;

commit;
