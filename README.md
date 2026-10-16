# ☕ Portafilter / Espresso Studio (Web + iOS + Android)

A cross-platform Espresso Barista Journal & Machine Setup Dial-In application built with **Next.js (App Router)**, **Tailwind CSS v4**, **shadcn/ui**, **Supabase**, and **Capacitor**.

Integrated with components and design from **v0.dev / Vercel** (`espresso-brewing-tracker`).

---

## 🚀 Features & Architecture

- **Universal UI:** Works on modern Web browsers and inside native iOS and Android apps.
- **Portafilter Journal & Dashboard:** Integrated v0 espresso tracking dashboard, shot journal, tasting flavor chips, sourness/bitterness balance meters, and coffee shelf.
- **Machine & Grinder Setup Corner:** Configurable espresso machines (e.g. La Marzocco Linea Mini, Decent) and grinder dial-in settings (e.g. Niche Zero, DF64, Mazzer).
- **Capacitor Mobile Shell:** Ready-to-build Xcode (`ios/`) and Android Studio (`android/`) projects.
- **Supabase Integration Ready:** Client pre-configured in `lib/supabase.ts` and SQL migration schema in `supabase/schema.sql`.
- **v0.dev Friendly:** Designed with clean components (`components/ui/*`) for 1-click importing from v0.dev.

---

## 🛠️ Project Structure

```text
├── app/                  # Next.js App Router (pages and layouts)
│   ├── globals.css       # Tailwind CSS styling & custom theme variables
│   ├── layout.tsx        # App root layout with metadata
│   └── page.tsx          # Main entry screen (Portafilter Journal & Dial-In)
├── components/           # React / v0 components
│   ├── auth-modal.tsx         # Email & password authentication dialog
│   ├── espresso-dashboard.tsx # Espresso dashboard component
│   ├── espresso-dial-app.tsx  # Interactive barista dial-in prototype
│   └── ui/               # Reusable UI primitives (Button, Card, etc.)
├── lib/                  # Utilities & Supabase client
│   ├── supabase.ts       # Supabase client initialization
│   └── utils.ts          # Tailwind class merger (cn)
├── ios/                  # Native iOS (Xcode) project
├── android/              # Native Android (Android Studio) project
├── capacitor.config.ts   # Capacitor configuration
├── next.config.mjs       # Next.js configuration (static export)
└── package.json          # Dependencies and scripts
```

---

## 💻 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Web Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view and test in your browser.

### 3. Connect Supabase (Optional)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase Project URL and Anon Public Key.

---

## 📱 Mobile Workflow (iOS & Android)

### Sync Web Build to Mobile
```bash
npm run cap:sync
```
*(This builds the static Next.js export into `out/` and syncs assets to both `ios/` and `android/`)*.

### Open Native IDEs
- **iOS (Xcode):**
  ```bash
  npm run cap:open:ios
  ```
- **Android (Android Studio):**
  ```bash
  npm run cap:open:android
  ```

---

## 🔄 CI/CD with GitHub Actions

The repository includes an automated pipeline in `.github/workflows/ci-cd.yml` with three stages:
1. **Build & Verify:** Runs Next.js static export build and verification on PRs & pushes.
2. **Supabase Database CI/CD:** Automatically applies new SQL migrations (`supabase/migrations/`) to your Supabase Cloud database on `git push` to `main`.
3. **Web Frontend Deployment (VM via SSH):** Transmits and deploys the optimized web build directory (`out/`) to your target virtual machine via rsync/SSH.

### Staging environment (`.github/workflows/staging.yml`)

Every push to a `feature/**` or `bugfix/**` branch deploys to a shared staging
environment instead of production:

1. **Validate:** refuses to run if the staging URL equals the production URL —
   the reset below can never touch production.
2. **Database reset:** `supabase/staging/reset.sql` wipes app data + auth users
   and clears migration history (fresh, deterministic state every run).
3. **Migrations & grants:** every file in `supabase/migrations/` is replayed,
   then `supabase/staging/grants.sql` grants the Data API roles access.
4. **Seed:** `supabase/staging/seed.sql` loads realistic test data
   (see test accounts below).
5. **Build & Deploy:** builds the static export against the *staging* Supabase
   URL/keys and scp's `out/` to the staging directory on the same VM as
   production (`~/espresso-app-staging`, served by nginx on port **3002**).

All SQL runs through the Supabase **Management API**
(`POST /v1/projects/{ref}/database/query`) via `supabase/staging/run_sql.sh` —
no DB connection string or password is needed, SQL errors fail the job
(HTTP 400), and the only credential used is `SUPABASE_ACCESS_TOKEN`.
Runs are serialized via a `concurrency` group, so the staging database and
deploy path are never touched by two runs at once.

**GitHub configuration** (Repository Settings -> Secrets and variables -> Actions):

| Name | Type | Description |
| :--- | :--- | :--- |
| `STAGING_SUPABASE_PROJECT_ID` | Variable | Project ref of the staging Supabase project |
| `NEXT_PUBLIC_STAGING_SUPABASE_URL` | Secret | Staging project URL (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_STAGING_SUPABASE_PUBLISHABLE_KEY` | Secret | Staging project publishable key |
| `VM_STAGING_DEPLOY_PATH` *(Optional)* | Secret | Staging dir on VM (default `~/espresso-app-staging`) |
| `VM_SSH_PORT` *(Optional)* | Secret | SSH port (default `22`, shared with prod deploy) |

**Staging test accounts** (email confirmation pre-set, no SMTP on the staging
project):

| Email | Password |
| :--- | :--- |
| `staging@example.com` | `StagingTest123!` |
| `taster@example.com` | `TasterTest123!` |

### Required GitHub Secrets:
Set these in **Repository Settings -> Secrets and variables -> Actions**:

| Secret Name | Description | Where to find |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Cloud project URL | Supabase Dashboard -> Project Settings -> API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Publishable API key (`sb_publishable_...`) | Supabase Dashboard -> Project Settings -> API (API Keys) |
| `SUPABASE_ACCESS_TOKEN` | Personal Access Token for CLI | [supabase.com/account/tokens](https://supabase.com/account/tokens) |
| `SUPABASE_PROJECT_ID` | Project Reference ID (e.g. `abcdefghijklm`) | Supabase Dashboard -> Project Settings -> General |
| `SUPABASE_DB_PASSWORD` | Database password set at creation | Supabase project creation |
| `SUPABASE_DB_URL` *(Optional)* | Direct PostgreSQL URI (bypasses Management API) | Supabase Dashboard -> Project Settings -> Database -> Connection String |
| `VM_SSH_HOST` | VM IP or Domain Name | Virtual Machine provider |
| `VM_SSH_USER` | SSH Username (e.g. `ubuntu` or `root`) | Virtual Machine |
| `VM_SSH_KEY` | Private SSH Key (`id_rsa` or `id_ed25519`) | Your SSH key pair |
| `VM_DEPLOY_PATH` | Target directory on VM (e.g. `/var/www/espresso-app`) | VM web server root |
