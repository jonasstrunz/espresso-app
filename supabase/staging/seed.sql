-- Staging pipeline: deterministic seed with realistic test data.
-- Runs after reset.sql + `supabase db push` on every pipeline run.
--
-- Test accounts (email confirmation is pre-set because the staging branch
-- has no SMTP credentials and cannot send confirmation mails):
--   staging@example.com / StagingTest123!  (main tester, full machine setup)
--   taster@example.com   / TasterTest123!   (second user, legacy machine
--                                            settings, for RLS checks)
--   newbie@example.com   / NewbieTest123!   (no equipment at all, exercises
--                                            the guided setup wizard)

begin;

-- 1. Test users. The on_auth_user_created trigger created by the migrations
--    inserts the matching public.profiles rows automatically.
--    GoTrue scans the token columns (confirmation_token, ...) into plain
--    strings - they must be '' not NULL, or every read of the row fails with
--    "Database error querying schema". Same for email_change.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change_token_current, phone_change_token, reauthentication_token,
  email_change
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'staging@example.com',
    '$2a$10$bgB72kzsl4NwEk/fWM5k7.LHIBogKSf3XY/RdL9PwgRgwTCtdrY0S',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"Staging Tester"}'::jsonb,
    now(), now(),
    '', '', '', '', '', '',
    ''
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'taster@example.com',
    '$2a$10$jVFsQV0mscJBvVoTm9OuoOm2bCFL98KLmAG9kwbCkbZN5T/UZ.Me2',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"Second Taster"}'::jsonb,
    now(), now(),
    '', '', '', '', '', '',
    ''
  ),
  (
    '99999999-9999-4999-8999-999999999999',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'newbie@example.com',
    '$2a$10$YE4hIrIjMc6onikIty40kOaQQdVBzMs7iLUrvpV4SDwdd124o6dHO',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"Fresh Barista"}'::jsonb,
    now(), now(),
    '', '', '', '', '', '',
    ''
  )
on conflict (id) do nothing;

-- 2. Identities: GoTrue requires one identity row per user for logins
--    (normally created by signup); password login 500s without them.
--    `email` is a generated column (identity_data->>'email') - do not insert it.
insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values
  (
    'ffffffff-ffff-4fff-8fff-fffffffff001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "email": "staging@example.com", "username": "Staging Tester", "email_verified": true, "phone_verified": false}'::jsonb,
    'email', now(), now(), now()
  ),
  (
    'ffffffff-ffff-4fff-8fff-fffffffff002',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '{"sub": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "email": "taster@example.com", "username": "Second Taster", "email_verified": true, "phone_verified": false}'::jsonb,
    'email', now(), now(), now()
  ),
  (
    'ffffffff-ffff-4fff-8fff-fffffffff003',
    '99999999-9999-4999-8999-999999999999',
    '99999999-9999-4999-8999-999999999999',
    '{"sub": "99999999-9999-4999-8999-999999999999", "email": "newbie@example.com", "username": "Fresh Barista", "email_verified": true, "phone_verified": false}'::jsonb,
    'email', now(), now(), now()
  )
on conflict (id) do nothing;

-- 3. Equipment. staging@example.com has the new machine-setup settings shape;
--    taster@example.com deliberately keeps the legacy shape (free-text style
--    keys) so the app's backwards-compatible parsing stays exercised.
--    newbie@example.com gets no equipment at all: logging in must guide them
--    through the setup wizard.
insert into public.equipment (id, user_id, type, brand, model, nickname, settings) values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'machine',
   'La Marzocco', 'Linea Mini', 'Linea Mini (staging)',
   '{"machineDetails": "Dual boiler · 58 mm portafilter", "basketDiameter": "58",
     "tempMode": "C", "defaultTemp": "93",
     "tempStepMin": "1", "tempStepMax": "5", "tempStepMinLabel": "cold", "tempStepMaxLabel": "hot",
     "preinfusionEnabled": true, "preinfusionSeconds": "5",
     "grinder": "Niche Zero", "grinderDetails": "Single dose · 63 mm conical burrs",
     "grindMin": "1.5", "grindMax": "4.5", "dialDirection": "cw"}'::jsonb),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'grinder',
   'Niche', 'Zero', 'Niche Zero (staging)',
   '{"stepless": true}'::jsonb),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'accessory',
   'Acaia', 'Pearl', 'Scale', '{}'::jsonb),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc4', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'machine',
   'Breville', 'Bambino Plus', 'Bambino (staging)',
   '{"temp_celsius": 92, "pressure_bar": 9}'::jsonb);

-- 4. Beans
insert into public.beans (id, user_id, name, roaster, roast_date, roast_level, process, origin) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'Guji Highlands', 'Test Roastery', date '2026-10-01', 'light', 'washed', 'Ethiopia'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'Fazenda Esperanca', 'Test Roastery', date '2026-09-15', 'medium', 'natural', 'Brazil'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd3', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'Night Shift Decaf', 'Sample Coffee', date '2026-09-28', 'dark', 'swiss water', 'Colombia');

-- 5. Shots -- mix of relation-based (bean_id + denormalized names, the state
--    the backfill migration produces) and direct bean_name style (legacy
--    shots with no catalog row); both are supported by the app.
insert into public.shots (
  id, user_id, bean_id, grinder_id, machine_id,
  bean_name, roaster,
  grind_setting, dose_grams, yield_grams, duration_seconds,
  temp_celsius, pressure_bar, taste_balance, rating, notes
) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
   'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
   'Guji Highlands', 'Test Roastery',
   18.0, 18.0, 36.0, 28.5, 93.0, 9.0, 78, 5, 'Baseline: sweet, clean, citrus finish.'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
   'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
   'Guji Highlands', 'Test Roastery',
   17.5, 18.0, 40.0, 31.0, 94.0, 9.0, 65, 4, 'Sour, upped grind one click next time.'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
   'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
   'Fazenda Esperanca', 'Test Roastery',
   18.5, 18.0, 34.0, 27.0, 92.0, 9.0, 82, 5, null),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'dddddddd-dddd-4ddd-8ddd-ddddddddddd3', null, 'cccccccc-cccc-4ccc-8ccc-ccccccccccc4',
   'Night Shift Decaf', 'Sample Coffee',
   14.0, 18.0, 36.0, 30.0, 91.0, 9.0, 60, 3, 'Decaf is hard. Chocolatey though.');

insert into public.shots (
  id, user_id, bean_id, grinder_id, machine_id,
  bean_name, roaster, flavors, acidity, bitterness,
  grind_setting, dose_grams, yield_grams, duration_seconds,
  temp_celsius, pressure_bar, taste_balance, rating, notes
) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   null, 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
   'Guji Highlands', 'Test Roastery', '["citrus", "jasmine", "honey"]'::jsonb, 4, 2,
   18.0, 18.0, 37.0, 29.0, 93.0, 9.0, 80, 5, 'Direct-style log entry.');

commit;
