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
│   ├── layout.tsx        # App root layout with Vercel Analytics & metadata
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
