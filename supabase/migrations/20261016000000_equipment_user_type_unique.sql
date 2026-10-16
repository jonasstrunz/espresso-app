-- 20261016000000_equipment_user_type_unique.sql
-- Fix duplicate equipment rows (issue #3): the app saved setup with
-- `upsert` but no unique constraint on (user_id, type), so every save
-- inserted a new machine/grinder row.

-- Keep only the newest row per (user_id, type); older duplicates are removed.
delete from public.equipment e
using public.equipment newer
where e.user_id = newer.user_id
  and e.type = newer.type
  and (
    newer.created_at > e.created_at
    or (newer.created_at = e.created_at and newer.id > e.id)
  );

-- Enforce one row per user and equipment type.
do $$
begin
  alter table public.equipment
    add constraint equipment_user_type_key unique (user_id, type);
exception
  when duplicate_object then null; -- constraint already exists
end $$;
