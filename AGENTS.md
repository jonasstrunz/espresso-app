<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Espresso app

Cross-platform espresso barista journal (web + iOS/Android). Next.js App Router with **static export**, React 19, Tailwind CSS v4, shadcn/ui, Supabase, Capacitor. CI uses Node 22.

## Commands (verified)

- `npm install` — install dependencies.
- `npm run dev` — dev server (default port 3000).
- `npm run build` — static export into `out/`; this is what CI runs. Succeeds without `.env.local` because `lib/supabase.ts` falls back to placeholder Supabase values.
- `npx tsc --noEmit` — type check. `next build` does **not** type-check (`typescript.ignoreBuildErrors: true` in `next.config.mjs`), so run this separately.
- `npm run lint` — ESLint flat config (`eslint.config.mjs`). Note: it currently fails on `main` with pre-existing `no-explicit-any` errors and CI does not run lint — a red lint may not be your doing, but don't add new errors either.
- `npm run cap:sync` — build + sync `out/` into `ios/`/`android/`; `cap:open:ios` / `cap:open:android` open the native IDEs.

There is no test suite and no formatter config (no Prettier, no pre-commit).

## Layout

- `app/` — App Router; `page.tsx` is the single main screen.
- `components/` — feature components plus shadcn primitives in `components/ui/` (configured by `components.json`). The ones actually wired into `app/page.tsx` are `auth-modal.tsx`, `setup-wizard.tsx`, and `machine-setup.tsx`; `espresso-dashboard.tsx` and `espresso-dial-app.tsx` are currently referenced nowhere.
- `lib/` — `supabase.ts` (client, placeholder fallback) and `utils.ts` (`cn` class merger).
- `supabase/` — `config.toml`, `schema.sql`, and timestamped `migrations/*.sql`.
- `ios/`, `android/` — Capacitor native shells (`webDir: 'out'`); edit the web app, then `npm run cap:sync` — don't hand-edit their copies of the web assets.

## Gotchas

- Static export only: no API routes, server actions, middleware, or other server-side Next.js features.
- Env vars: copy `.env.example` to `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`); without them everything builds but Supabase calls hit placeholders and won't work.
- CI (`.github/workflows/ci-cd.yml`): PRs run only `npm ci` + `npm run build`. Pushes to `main` additionally push `supabase/migrations/` to the cloud database (`supabase db push --include-all`) and scp `out/` to a VM over SSH. New migrations go in `supabase/migrations/` as `YYYYMMDDHHMMSS_description.sql` and are applied automatically on merge — keep them idempotent (`if not exists`, `create or replace`, like the existing ones).
- Branch names matter: pushes to `feature/**` or `bugfix/**` branches trigger `.github/workflows/staging.yml` instead of the production pipeline — it resets the shared staging Supabase database, replays all migrations, seeds it, builds against the staging credentials, and deploys `out/` to the staging path on the same VM (details and test accounts in `README.md`).
