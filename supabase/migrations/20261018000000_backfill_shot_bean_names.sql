-- 20261018000000_backfill_shot_bean_names.sql
-- `shots.bean_id` is now the source of truth: the app resolves a shot's bean
-- and roaster through the linked `beans` row, and renames update the link.
-- Keep the denormalized `bean_name`/`roaster` copy in sync so anything
-- reading the columns directly (older clients, ad-hoc queries) doesn't show
-- stale names after a bean is renamed. Idempotent: rows already in sync are
-- not touched.

update public.shots s
set bean_name = b.name,
    roaster = b.roaster
from public.beans b
where s.bean_id = b.id
  and s.user_id = b.user_id
  and (s.bean_name is distinct from b.name or s.roaster is distinct from b.roaster);