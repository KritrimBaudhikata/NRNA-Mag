# Everest Day Hong Kong 2026 — Online Magazine Reader

Bilingual (English / Nepali) web magazine for **NRNA Hong Kong Everest Day 2026**. Visitors read the magazine in the browser; PDF download requires email verification and consent to the **Kritrim Mailing list**.

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Turso/libSQL, Resend, Vercel Blob.

---

## Features

| Feature | Description |
|---------|-------------|
| **Online reader** | 36 magazine pages (from 19 Canva/PDF spreads), slide/crossfade/push transitions, swipe and keyboard navigation |
| **Responsive** | Two-page spread on desktop; single page on mobile portrait |
| **Languages** | English and Nepali UI (first-visit picker + header switcher) |
| **PDF download** | Email → 6-digit code on site → browser download (PDF is **not** emailed) |
| **Mailing list** | Successful verification adds the address to your Resend Audience |
| **Footer** | “Site developed by Kritrim Solutions” + WhatsApp contact link |

---

## Magazine structure

The source material has **19 pages** (1 cover + 17 two-page spreads + 1 back cover). The export script splits each spread into **left + right**, producing **36 flipbook pages**.

| Source # | Content |
|----------|---------|
| 1 | Front cover |
| 2–18 | Spreads → pages 2–3, 4–5, … 34–35 |
| 19 | Back cover (page 36) |

Output files: `public/magazine/page-01.png` … `page-36.png` plus `public/magazine/pages.json`.

---

## Prerequisites

- **Node.js** 20+ and **npm**
- **Python** 3.10+ (for the export script only)
- **Git**
- For production: [Vercel](https://vercel.com), [Turso](https://turso.tech) (or libSQL), [Resend](https://resend.com), [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)

---

## Step 1 — Clone and install

```bash
git clone <your-repo-url>
cd NepaliInHk
npm install
```

---

## Step 2 — Source assets (local only)

These files stay **out of Git** (see `.gitignore`). You need them on your machine to run the export.

### Option A — Canva (recommended, sharpest text)

1. Export **19 PNG pages** from Canva (highest resolution).
2. Save them in `source/canva/` as `01.png` … `19.png` (see [`source/canva/README.md`](source/canva/README.md)).

### Option B — PDF fallback

1. Place `NRNA HK Everest Day_2.pdf` in the project root (~44 MB).
2. The export script rasterizes it at 300 DPI if Canva files are missing.

---

## Step 3 — Export magazine images

Install Python dependencies (once):

```bash
pip install pymupdf pillow
```

Run the export:

```bash
npm run export:magazine
```

- With 19 Canva PNGs: writes **lossless PNG** pages (best quality, ~2–5 minutes).
- Without Canva: uses the root PDF and writes WebP pages instead.

Verify output:

```bash
# Should list 36 PNGs and pages.json
dir public\magazine\page-*.png
```

---

## Step 4 — Environment variables (local)

1. Copy the example file:

   ```bash
   copy .env.example .env.local
   ```

2. Edit `.env.local`. **Never commit this file.**

| Variable | Required locally | Description |
|----------|------------------|-------------|
| `SITE_URL` | Optional | e.g. `http://localhost:3000` |
| `TOKEN_SECRET` | Yes | Long random string (JWT for download session) |
| `DATABASE_URL` | Optional | Default: `file:./data/verifications.db` |
| `RESEND_API_KEY` | Optional* | Resend API key — if empty, codes print in the terminal |
| `RESEND_AUDIENCE_ID` | Optional | Resend Audience ID for “Kritrim Mailing list” |
| `RESEND_FROM_EMAIL` | Optional | Verified sender, e.g. `magazine@nrnahk.org` |
| `PDF_LOCAL_PATH` | Yes** | Path to PDF for download API, e.g. `./NRNA HK Everest Day_2.pdf` |
| `BLOB_READ_WRITE_TOKEN` | No | Production Blob token |
| `PDF_BLOB_PATH` | No | Blob object name in production |

\* Without `RESEND_API_KEY`, dev mode logs: `[dev] Verification code for user@example.com: 123456`  
\** Or use Blob vars instead of `PDF_LOCAL_PATH` if testing Blob locally.

Generate a secret (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## Step 5 — Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Quick test without email:** leave `RESEND_API_KEY` empty, use Download PDF → enter email + consent → check the terminal for the 6-digit code.

---

## Step 6 — Tests and production build

```bash
npm test
npm run build
npm start
```

---

## What to commit (Git)

| Commit | Do not commit |
|--------|----------------|
| All source under `src/`, `messages/`, `scripts/`, config files | `.env.local`, `.env` (secrets) |
| `public/magazine/page-*.png` + `pages.json` (~200 MB) | `*.pdf`, `source/canva/*.png`, `source/backup/` |
| `source/canva/README.md` | `node_modules/`, `.next/`, `data/` |
| `.env.example` (placeholders only) | Crash logs (`hs_err_pid*.log`) |

After export, stage magazine assets:

```bash
git add public/magazine/
git status
```

Ensure no secrets or master PNGs appear in `git status` before pushing.

---

## Deploy to Vercel (step by step)

### 1. Push to GitHub

Commit application code **and** `public/magazine/page-*.png` + `pages.json`. Vercel builds with `npm run build` only (no PDF/Canva on the server).

### 2. Import project on Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. Build command: `npm run build` (already set in `vercel.json`).

### 3. Turso database (production)

Local SQLite (`file:./data/...`) does **not** persist on Vercel.

1. Create a database at [turso.tech](https://turso.tech).
2. Create an auth token.
3. Set in Vercel → **Settings → Environment Variables**:

   ```
   DATABASE_URL=libsql://your-db-name-org.turso.io
   ```

   Plus the libSQL auth token if your client URL requires it (use the connection string Turso provides for `@libsql/client`).

Tables are created automatically on first API request (`initDb()`).

### 4. Resend (email codes + mailing list)

1. [resend.com](https://resend.com) → API key → `RESEND_API_KEY`.
2. Add and verify your sending domain → set `RESEND_FROM_EMAIL` (e.g. `magazine@nrnahk.org`).
3. **Audiences** → create **Kritrim Mailing list** → copy Audience ID → `RESEND_AUDIENCE_ID`.

### 5. Vercel Blob (PDF download)

1. Vercel project → **Storage** → create a **Blob** store.
2. Upload `NRNA HK Everest Day_2.pdf` (or a renamed copy).
3. Note the blob pathname (e.g. `everest-day-2026.pdf`).
4. Set environment variables:

   ```
   BLOB_READ_WRITE_TOKEN=<from Vercel Blob settings>
   PDF_BLOB_PATH=everest-day-2026.pdf
   ```

Remove or leave `PDF_LOCAL_PATH` unset in production.

### 6. Remaining Vercel environment variables

| Variable | Example / notes |
|----------|-----------------|
| `SITE_URL` | `https://everestday.nrnahk.org` |
| `TOKEN_SECRET` | New long random string (not the same as local) |
| `DATABASE_URL` | Turso `libsql://...` URL |
| `RESEND_API_KEY` | From Resend dashboard |
| `RESEND_AUDIENCE_ID` | Kritrim Mailing list audience ID |
| `RESEND_FROM_EMAIL` | Verified sender on your domain |
| `BLOB_READ_WRITE_TOKEN` | From Vercel Blob |
| `PDF_BLOB_PATH` | Blob file path/name |

Redeploy after changing env vars.

### 7. Custom domain (Hostinger DNS)

1. Vercel → **Settings → Domains** → add `everestday.nrnahk.org` (or `magazine.nrnahk.org`).
2. In **Hostinger** DNS for `nrnahk.org`, add the record Vercel shows (usually **CNAME** `everestday` → `cname.vercel-dns.com`).
3. Wait for SSL (often a few minutes).

Update `SITE_URL` to match the live HTTPS URL.

---

## User flows

### Read online

1. Open the site → choose English or Nepali.
2. Flip pages: toolbar buttons, keyboard arrows, swipe (mobile), or tap left/right edges.
3. Optional: change transition style in the toolbar (saved in browser `localStorage`).

### Download PDF

1. Click **Download PDF** in the header.
2. Enter email, check consent (mailing list + download).
3. Receive a **6-digit code by email** (or see it in the dev console without Resend).
4. Enter the code on the site → PDF downloads in the browser.
5. Email is added to the Resend Audience (if `RESEND_AUDIENCE_ID` is set).

Codes expire after **15 minutes**; max **5** wrong attempts per request. Rate limits: **5** send-code requests per hour per IP and per email.

---

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run production build locally |
| `npm test` | Vitest (messages, auth codes, rate limit) |
| `npm run lint` | ESLint |
| `npm run export:magazine` | Build `public/magazine/` from Canva or PDF |

---

## Project layout

```
├── messages/              # en.json, ne.json (UI + email copy)
├── public/magazine/       # page-01.png … page-36.png, pages.json (committed)
├── scripts/export-pdf.py  # Canva/PDF → magazine pages
├── source/canva/          # 19 master PNGs (local only) + README
├── src/
│   ├── app/               # pages + API routes
│   │   └── api/
│   │       ├── auth/send-code/
│   │       ├── auth/verify-code/
│   │       └── download/pdf/
│   ├── components/        # Reader, modal, footer, i18n UI
│   ├── i18n/
│   └── lib/               # db, resend, session, blob-pdf, preload
├── .env.example           # Template (safe to commit)
├── vercel.json            # buildCommand: npm run build
└── NRNA HK Everest Day_2.pdf   # Local only (gitignored)
```

---

## API routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/send-code` | Validate email + consent, store hashed code, send email |
| `POST` | `/api/auth/verify-code` | Verify code, set session cookie, subscribe to audience |
| `GET` | `/api/download/pdf` | Stream PDF (requires valid session cookie) |

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Reader shows “Loading…” forever | `public/magazine/pages.json` exists; PNG paths match manifest |
| Blurry text | Re-export from **Canva PNG**, not low-res PDF raster |
| Top/bottom of page clipped | Hard-refresh; layout uses measured viewport — report device if it persists |
| No email in dev | Expected without `RESEND_API_KEY` — read code in terminal |
| No email in production | Resend domain verified, `RESEND_FROM_EMAIL` matches, check Resend logs |
| PDF download 401 | Verify code first; cookie expires in 10 minutes |
| PDF download 500 | Set `PDF_BLOB_PATH` + token on Vercel, or `PDF_LOCAL_PATH` locally |
| Vercel build fails | Ensure `page-*.png` and `pages.json` are in Git; run `npm run build` locally |
| Database errors on Vercel | Use Turso `libsql://` URL, not `file:./data/...` |
| `git push` very slow | ~200 MB of PNGs — normal; consider Git LFS only if needed |

---

## Security notes

- Verification codes are **bcrypt-hashed** in the database; plain codes are never stored.
- Download access uses a short-lived **httpOnly** JWT cookie.
- Honeypot field `website` on send-code silently rejects bots.
- Rate limiting on send-code (in-memory; resets on cold start in serverless).
- Never commit `.env.local`, API keys, or the source PDF.

---

## Credits

Site developed by **Kritrim Solutions** — WhatsApp [+852 6345 1395](https://wa.me/85263451395?text=Hi%2C%20I%20want%20to%20contact%20about%20IT%20and%20AI%20services).

Design spec and implementation plan: `docs/superpowers/specs/` and `docs/superpowers/plans/`.
