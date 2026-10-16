-- Staging pipeline: Data API grants for the staging branch.
-- Branches start without default privileges on `public`, so without these
-- grants the anon/authenticated/service_role roles get 42501 errors from the
-- Data API even though RLS policies exist. Applied after `supabase db push`.
-- RLS still governs all row access; these grants only allow the API roles to
-- reach the objects at all.

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
