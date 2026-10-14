# ☕ Espresso Studio (Web + iOS + Android)

A cross-platform Espresso Barista & Machine Setup Dial-In application built with **Next.js (App Router)**, **Tailwind CSS**, **shadcn/ui**, **Supabase**, and **Capacitor**.

---

## 🚀 Features & Architecture

- **Universal UI:** Works on modern Web browsers and inside native iOS and Android apps.
- **Shot Logger & Live Timer:** Precision dose, yield, grind size steppers, extraction stopwatch, taste balance sliders, and sensory rating.
- **Capacitor Mobile Shell:** Ready-to-build Xcode (`ios/`) and Android Studio (`android/`) projects.
- **Supabase Integration Ready:** Client pre-configured in `lib/supabase.ts` for database and auth sync.
- **v0.dev Friendly:** Designed with clean components (`components/ui/*`) for 1-click importing from v0.dev.

---

## 🛠️ Project Structure

```text
├── app/                  # Next.js App Router (pages and layouts)
│   ├── globals.css       # Tailwind CSS styling
│   ├── layout.tsx        # App root layout and metadata
│   └── page.tsx          # Main entry screen
├── components/           # React / v0 components
│   ├── espresso-dial-app.tsx # Interactive barista dial-in prototype
│   └── ui/               # Reusable UI primitives (Button, Card, etc.)
├── lib/                  # Utilities & Supabase client
│   ├── supabase.ts       # Supabase client initialization
│   └── utils.ts          # Tailwind class merger (cn)
├── ios/                  # Native iOS (Xcode) project
├── android/              # Native Android (Android Studio) project
├── capacitor.config.json # Capacitor configuration
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

## 🎨 How to integrate new v0.dev components

1. Generate your screen or component in [v0.dev](https://v0.dev).
2. Either copy the `.tsx` code directly into `components/` or use the v0 CLI:
   ```bash
   npx v0 add <component-id>
   ```
3. Import your component into `app/page.tsx` or new route folders.
