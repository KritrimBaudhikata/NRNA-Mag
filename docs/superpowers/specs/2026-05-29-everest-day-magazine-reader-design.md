# Everest Day Hong Kong 2024 ù Online Magazine Reader

**Status:** Approved  
**Date:** 2026-05-29  
**Source asset:** `NRNA HK Everest Day_2.pdf` (~44 MB, 19 PDF pages ? 36 magazine pages)

---

## 1. Goals

| Goal | Requirement |
|------|-------------|
| **Read online** | Full magazine in browser; no login, no email |
| **Download** | Email + consent ? 6-digit code ? verify on site ? automatic PDF download |
| **Mailing list** | On successful verification, add contact to **Kritrim Mailing list** (Resend Audience) |
| **Experience** | Polished flipbook UI, smooth page-turn animations, mobile-first |
| **Security** | PDF not in public static assets; reader uses rasterized images only |
| **Branding** | Persistent footer credit for Kritrim Solutions + WhatsApp contact |
| **Languages** | UI in **English (en)** and **Nepali (ne)**; user can switch anytime |

---

## 2. Internationalization (UI)

### Scope

- **Translated:** All site chrome ù navigation, download modal, consent text, errors, language prompt, Kritrim footer, verification email body/subject.
- **Not translated:** Magazine pages (rasterized from PDF; content remains as designed in English).

### Locales

| Code | Language |
|------|----------|
| `en` | English (default fallback) |
| `ne` | Nepali (??????) |

### First visit

- If no saved preference (`localStorage` key `ui-locale` + optional cookie `NEXT_LOCALE`):
  - Show a lightweight **language picker** overlay/modal before or over the reader.
  - Two large choices: **English** | **??????**.
  - Selection persists immediately and dismisses the prompt.
- Do not block magazine load behind the prompt on slow networks ù reader may render underneath a semi-transparent scrim.

### Language switcher

- Persistent control in header (e.g. `EN | ??`): toggles locale without reload if possible (client context); otherwise soft refresh.
- Switching updates all UI strings and re-sends verification emails in the newly selected locale on next `send-code`.

### Implementation notes

- Message files: `messages/en.json`, `messages/ne.json`.
- Use `next-intl` or a thin `LocaleProvider` + `useTranslations()` hook.
- Verification email templates: two Resend templates (or one template with locale variables) for `en` and `ne`.
- HTML `lang` attribute and font stack: support Devanagari for Nepali UI (e.g. `Noto Sans Devanagari` via `next/font`).

---

## 3. Domain & DNS

**Primary host:** Vercel (full Next.js app)

**Subdomain (choose one at deploy time):**

| Option | URL | Notes |
|--------|-----|-------|
| A (recommended) | `https://everestday.nrnahk.org` | Event-branded, memorable |
| B | `https://magazine.nrnahk.org` | Generic; good if reused for future issues |

**DNS (Hostinger):** CNAME for chosen subdomain ? Vercel project (`cname.vercel-dns.com` or Vercel-provided target).

**Backup:** Same build can be deployed to Netlify or a second Vercel project; update CNAME if primary fails. No split static/API deployment.

**Environment:** `SITE_URL` set to the chosen canonical subdomain.

---

## 4. Magazine structure

### PDF ? magazine mapping

| PDF page | Flipbook sheet | Magazine content |
|----------|----------------|------------------|
| 1 | 0 | Front cover (single page) |
| 2ù18 | 1ù17 | Two-page spreads (pp. 2ù3 ù 34ù35) |
| 19 | 18 | Back cover (p. 36 ù ùThank Youùù) |

**Total:** 19 flipbook sheets, 36 logical magazine pages.

### Content pipeline (build-time)

1. Script (`scripts/export-pdf.mjs`, PyMuPDF) exports each PDF page to **WebP** at 1ù and 2ù widths.
2. Output: `public/magazine/` + `sheets.json` manifest (index, optional magazine page labels, dimensions).
3. Original PDF stored in **private** storage only (Vercel Blob or Cloudflare R2) ù never under `public/`.

Re-run export when the source PDF changes.

---

## 5. Reader UX

### Layout

- Full-viewport reader; soft off-white background; optional subtle mountain silhouette (brand-consistent).
- **Desktop / tablet (?768px):** two-page spread for sheets 1ù17; front and back covers as single-page views.
- **Mobile:** single page, swipe left/right; page indicator dots.

### Controls

- Previous / next (large touch targets, ?44px).
- Page indicator (e.g. spread index or magazine page numbers from manifest).
- **Download PDF** ù visible in header or floating action; does not block reading.

### Motion

- **page-flip** (StPageFlip) for realistic curl and inertia.
- Keyboard: ? / ?.
- `prefers-reduced-motion`: instant page change, no curl animation.

### Performance

- Lazy-load sheet images ù2 from current index.
- Low-quality placeholder (blur) until full WebP loads.
- Prioritize first spread after cover for fast first paint.

### Visual design tokens (from print)

- Accent: magenta/pink (~`#E91E63` family) for headings and UI accents.
- Body: clean sans-serif; display serif for cover / thank-you moments where appropriate.
- Footer rail styling on sheets is part of exported artwork (not recreated in HTML).

---

## 6. Download & verification flow

### User journey

```
[Download PDF]
  ? Step 1: Email + required consent checkbox
     Label: "Add me to the Kritrim Mailing list and let me download the PDF"
  ? [Send code]

  ? Resend email: 6-digit verification code (expires 15 minutes)

  ? Step 2: Enter 6-digit code in same modal
  ? [Verify & download]

  ? API validates code
  ? Add/update contact in Resend Audience ("Kritrim Mailing list")
  ? Set short-lived httpOnly session cookie
  ? Browser auto-downloads PDF from site (no PDF email, no magic link email)
```

### API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/send-code` | POST | Validate email + consent; store hashed code; send via Resend |
| `/api/auth/verify-code` | POST | Validate code; subscribe to Audience; set session cookie |
| `/api/download/pdf` | GET | Requires session cookie; stream PDF with `Content-Disposition: attachment` |

### Rules

- Code: 6 digits, cryptographically random, single-use, **15 min** expiry.
- Max **5** failed verify attempts per code; then require new code.
- Rate limit: **5** `send-code` requests per hour per IP and per email.
- Honeypot field on step 1 (hidden from users).
- Session cookie: httpOnly, secure, same-site; TTL **10 minutes** (enough for download retry).
- Optional: allow one re-download within session without re-verifying.

### 44 MB PDF

- Do **not** attach PDF to email (size limits, deliverability).
- Do **not** expose PDF URL in client bundle or `public/`.
- Stream from private Blob/R2 through `/api/download/pdf` after verification only.

---

## 7. Mailing list & privacy

- **Audience name (Resend):** `Kritrim Mailing list`
- Subscribe on **successful** code verification (not on `send-code` alone).
- Consent checkbox required before sending code (unchecked = cannot proceed).
- Footer / modal includes brief privacy note: who operates the list, unsubscribe via Resend/marketing preferences.
- **Stored fields (DB):** email, `verified_at`, `consent_at`, `resend_contact_id` (optional), hashed IP for abuse (optional, rotatable).

---

## 8. Kritrim footer bar

Persistent, unobtrusive bar at bottom of all pages (reader + landing if any):

| Element | Content |
|---------|---------|
| Credit | `Site developed by Kritrim Solutions` |
| Contact | WhatsApp link |

**WhatsApp**

- Number: `+85263451395`
- Link: `https://wa.me/85263451395?text={encoded}`
- Prefilled message: `Hi, I want to contact about IT and AI services`

**Presentation**

- Fixed bottom bar, ~32ù40px height, semi-transparent dark or light strip; does not cover flipbook controls.
- `z-index` above reader chrome; safe-area padding for notched phones.
- Opens WhatsApp app on mobile, WhatsApp Web on desktop.

---

## 9. Architecture

```
User
  ??? https://everestday.nrnahk.org  (or magazine.nrnahk.org)
        ??? Vercel ù Next.js 15 (App Router)
              ??? /                    Reader (client component + flipbook)
              ??? /api/auth/send-code
              ??? /api/auth/verify-code
              ??? /api/download/pdf

Hostinger          DNS CNAME only
Resend             Verification emails + Audiences (Kritrim Mailing list)
Turso / Vercel PG  codes, verification state, audit
Vercel Blob / R2   private PDF + optional export cache
```

### Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router), TypeScript |
| Deploy | Vercel (primary); Netlify optional mirror |
| Flipbook | `page-flip` (StPageFlip) via React wrapper |
| Styling | Tailwind CSS + CSS variables for brand tokens |
| Email | Resend (codes + Audience API) |
| Database | Turso (libSQL) or Vercel Postgres |
| PDF storage | Vercel Blob (signed/server-side read only) |
| PDF export | Python PyMuPDF in `scripts/export-pdf.mjs` |

### Environment variables

```
SITE_URL=
RESEND_API_KEY=
RESEND_AUDIENCE_ID=          # Kritrim Mailing list
RESEND_FROM_EMAIL=           # e.g. magazine@nrnahk.org or verified domain
TOKEN_SECRET=                # code hashing / session signing
BLOB_READ_WRITE_TOKEN=       # if using Vercel Blob
DATABASE_URL=
```

---

## 10. Security

- PDF and full-res assets not in public directory.
- API routes rate-limited; codes stored hashed (bcrypt or HMAC).
- CORS not needed (same-origin API).
- Security headers via Next.js / Vercel config (`X-Frame-Options`, etc.).
- No PDF hotlinking: download route checks session every request.

---

## 11. Out of scope (v1)

- Admin analytics dashboard
- Full-text search inside magazine
- Translating magazine page artwork (PDF remains English)
- WeChat mini-program
- Email with PDF attachment or download link
- Print stylesheet
- User accounts / login beyond download session

---

## 12. Testing checklist (pre-ship)

- [ ] All 19 sheets render; spreads correct on desktop; single page on mobile
- [ ] First-visit language prompt; preference persists across refresh
- [ ] EN/NE switcher updates all UI strings; `lang` attribute correct
- [ ] Verification email sent in selected locale
- [ ] Swipe and keyboard navigation work
- [ ] `prefers-reduced-motion` disables curl
- [ ] Send-code / verify-code / download happy path
- [ ] Invalid, expired, and brute-forced codes rejected
- [ ] Download blocked without verification
- [ ] Contact appears in Resend Audience after verify
- [ ] Footer WhatsApp link opens with correct prefilled message
- [ ] Lighthouse: acceptable LCP on 4G throttling
- [ ] Smoke test in Safari iOS + Chrome Android + WeChat in-app browser (best effort)

---

## 13. Resolved decisions log

| Decision | Choice |
|----------|--------|
| Hosting | Option 2 ù full Next.js on Vercel; Hostinger DNS |
| Read vs download | Read free; download gated |
| Verification | 6-digit code on site |
| PDF delivery | Auto browser download after verify |
| Mailing list | Kritrim Mailing list (Resend Audience) |
| Subdomain | `everestday.nrnahk.org` (preferred) or `magazine.nrnahk.org` |
| Footer | Kritrim Solutions credit + WhatsApp +85263451395 |
| UI languages | English + Nepali; first-visit picker + header switcher |

---

## 14. Next step

Implementation plan: `docs/superpowers/plans/2026-05-29-everest-day-magazine-reader.md`
