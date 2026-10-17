-- 20261017000000_shot_water_temperature.sql
-- Store the shot water temperature exactly as the user entered it: a value
-- plus its unit. Machines with numbered temperature steps (e.g. 1 cold to
-- 5 hot) record the step number with temp_unit = 'step'. temp_celsius keeps
-- holding the canonical Celsius value for C/F entries so existing queries
-- keep working.

alter table public.shots add column if not exists temp_value numeric(5,1);
alter table public.shots add column if not exists temp_unit text;
