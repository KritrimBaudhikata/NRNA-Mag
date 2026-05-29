# Everest Day Magazine Reader ? Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a bilingual (EN/NE) Next.js flipbook reader for the Everest Day 2024 magazine with email-code-gated PDF download and Kritrim footer branding.

**Architecture:** Single Next.js 15 app on Vercel. Magazine sheets as WebP assets from a build script. Auth via 6-digit codes (Turso + Resend). PDF in Vercel Blob, streamed post-verify. UI strings in `messages/en.json` and `messages/ne.json` with first-visit language picker.

**Tech Stack:** Next.js 15, TypeScript, Tailwind, page-flip, Turso, Resend, Vercel Blob, Vitest, PyMuPDF (export script)

**Spec:** `docs/superpowers/specs/2026-05-29-everest-day-magazine-reader-design.md`

---

## File structure

```
/
??? NRNA HK Everest Day_2.pdf          # source (git-lfs or deploy-time upload)
??? scripts/
?   ??? export-pdf.py                  # PDF ? WebP + sheets.json
??? messages/
?   ??? en.json
?   ??? ne.json
??? src/
?   ??? app/
?   ?   ??? layout.tsx
?   ?   ??? page.tsx                   # reader shell
?   ?   ??? globals.css
?   ?   ??? api/
?   ?       ??? auth/send-code/route.ts
?   ?       ??? auth/verify-code/route.ts
?   ?       ??? download/pdf/route.ts
?   ??? components/
?   ?   ??? MagazineReader.tsx
?   ?   ??? DownloadModal.tsx
?   ?   ??? LanguagePrompt.tsx
?   ?   ??? LanguageSwitcher.tsx
?   ?   ??? KritrimFooter.tsx
?   ??? lib/
?   ?   ??? db.ts
?   ?   ??? auth-codes.ts
?   ?   ??? rate-limit.ts
?   ?   ??? resend.ts
?   ?   ??? session.ts
?   ?   ??? blob-pdf.ts
?   ??? i18n/
?       ??? locales.ts
?       ??? LocaleProvider.tsx
??? public/magazine/                   # generated WebP + sheets.json
??? tests/
?   ??? auth-codes.test.ts
?   ??? messages.test.ts
??? package.json
??? next.config.ts
??? tailwind.config.ts
??? vitest.config.ts
??? .env.example
??? vercel.json
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.env.example`, `.gitignore`

- [ ] **Step 1: Initialize Next.js app**

Run from repo root:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

If prompted about non-empty directory, confirm (PDF already present).

- [ ] **Step 2: Add dependencies**

```bash
npm install page-flip @libsql/client bcryptjs jose zod
npm install -D vitest @vitejs/plugin-react @types/bcryptjs
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "node" },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Verify dev server**

```bash
npm run dev
```

Expected: app on `http://localhost:3000`.

---

### Task 2: PDF export pipeline

**Files:**
- Create: `scripts/export-pdf.py`, `public/magazine/.gitkeep`

- [ ] **Step 1: Write export script**

Create `scripts/export-pdf.py`:

```python
#!/usr/bin/env python3
"""Export PDF pages to WebP for flipbook. Requires: pip install pymupdf pillow"""
import json
import sys
from pathlib import Path

import fitz  # pymupdf

PDF = Path(__file__).resolve().parents[1] / "NRNA HK Everest Day_2.pdf"
OUT = Path(__file__).resolve().parents[1] / "public" / "magazine"
DPI = 150  # adjust for quality vs size

def main():
    if not PDF.exists():
        print(f"Missing PDF: {PDF}", file=sys.stderr)
        sys.exit(1)
    OUT.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(PDF)
    sheets = []
    for i in range(doc.page_count):
        page = doc[i]
        mat = fitz.Matrix(DPI / 72, DPI / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        name = f"sheet-{i:02d}"
        path_1x = OUT / f"{name}.webp"
        pix.save(path_1x.as_posix())
        sheets.append({
            "index": i,
            "src": f"/magazine/{name}.webp",
            "width": pix.width,
            "height": pix.height,
            "isCover": i == 0 or i == doc.page_count - 1,
        })
    (OUT / "sheets.json").write_text(json.dumps({"sheets": sheets}, indent=2))
    print(f"Exported {len(sheets)} sheets to {OUT}")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run export**

```bash
pip install pymupdf pillow
python scripts/export-pdf.py
```

Expected: `public/magazine/sheet-00.webp` ? `sheet-18.webp` and `sheets.json` with 19 entries.

- [ ] **Step 3: Add npm script**

In `package.json`: `"export:pdf": "python scripts/export-pdf.py"`

---

### Task 3: i18n foundation

**Files:**
- Create: `messages/en.json`, `messages/ne.json`, `src/i18n/locales.ts`, `src/i18n/LocaleProvider.tsx`, `tests/messages.test.ts`

- [ ] **Step 1: Write failing test for message parity**

Create `tests/messages.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import en from "../messages/en.json";
import ne from "../messages/ne.json";

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v))
      return keys(v as Record<string, unknown>, p);
    return [p];
  });
}

describe("messages", () => {
  it("en and ne have the same keys", () => {
    expect(keys(ne).sort()).toEqual(keys(en).sort());
  });
});
```

- [ ] **Step 2: Run test (fail)**

```bash
npm test
```

Expected: FAIL (files missing).

- [ ] **Step 3: Create message files**

`messages/en.json`:

```json
{
  "language": {
    "promptTitle": "Choose your language",
    "english": "English",
    "nepali": "??????"
  },
  "reader": {
    "downloadPdf": "Download PDF",
    "prev": "Previous",
    "next": "Next",
    "pageOf": "Page {current} of {total}"
  },
  "download": {
    "title": "Download the magazine",
    "email": "Email address",
    "consent": "Add me to the Kritrim Mailing list and let me download the PDF",
    "sendCode": "Send code",
    "codeLabel": "Enter 6-digit code",
    "verify": "Verify & download",
    "success": "Download started. Thank you!",
    "invalidEmail": "Please enter a valid email.",
    "consentRequired": "Consent is required to continue.",
    "codeSent": "We sent a code to your email.",
    "invalidCode": "Invalid or expired code.",
    "rateLimited": "Too many attempts. Please try again later."
  },
  "footer": {
    "developedBy": "Site developed by Kritrim Solutions",
    "whatsapp": "Contact on WhatsApp"
  },
  "email": {
    "subject": "Your Everest Day magazine verification code",
    "body": "Your verification code is: {code}\n\nIt expires in 15 minutes."
  }
}
```

`messages/ne.json` (Nepali translations for every key above):

```json
{
  "language": {
    "promptTitle": "????? ???? ??????????",
    "english": "English",
    "nepali": "??????"
  },
  "reader": {
    "downloadPdf": "PDF ???????",
    "prev": "???????",
    "next": "?????",
    "pageOf": "????? {current} / {total}"
  },
  "download": {
    "title": "??????? ??????? ?????????",
    "email": "???? ??????",
    "consent": "???? Kritrim Mailing list ?? ????????? ? PDF ??????? ???? ????????",
    "sendCode": "??? ??????????",
    "codeLabel": "? ?????? ??? ???????? ?????????",
    "verify": "???????? ??? ???????",
    "success": "??????? ???? ???? ???????!",
    "invalidEmail": "????? ????? ???? ???????? ??????????",
    "consentRequired": "???? ????? ????? ?????? ??",
    "codeSent": "?????? ??????? ?????? ??? ???????",
    "invalidCode": "?????? ?? ????? ?????? ????",
    "rateLimited": "???? ??????? ??? ???? ?????? ??????????"
  },
  "footer": {
    "developedBy": "???? Kritrim Solutions ?? ????? ?????",
    "whatsapp": "WhatsApp ?? ???????"
  },
  "email": {
    "subject": "Everest Day ??????? ?????????? ???",
    "body": "??????? ?????????? ???: {code}\n\n?? ?? ??????? ?????? ??????"
  }
}
```

- [ ] **Step 4: Create LocaleProvider**

`src/i18n/locales.ts`:

```typescript
export type Locale = "en" | "ne";
export const LOCALES: Locale[] = ["en", "ne"];
export const STORAGE_KEY = "ui-locale";
export const DEFAULT_LOCALE: Locale = "en";
```

`src/i18n/LocaleProvider.tsx` ? client component with `locale`, `setLocale`, `t(key, vars?)`, reads/writes `localStorage`, sets `document.documentElement.lang`, loads JSON by locale.

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: PASS.

---

### Task 4: Language prompt and switcher

**Files:**
- Create: `src/components/LanguagePrompt.tsx`, `src/components/LanguageSwitcher.tsx`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: LanguagePrompt**

Modal overlay if `!localStorage.getItem(STORAGE_KEY)` ? two buttons English / ?????? calling `setLocale`.

- [ ] **Step 2: LanguageSwitcher**

Header `EN | ??` toggle bound to `setLocale`.

- [ ] **Step 3: Wire in layout**

Wrap app in `LocaleProvider`. Load `Noto Sans` + `Noto Sans Devanagari` via `next/font/google`.

- [ ] **Step 4: Manual test**

Clear localStorage ? prompt appears. Switch languages ? download button label changes.

---

### Task 5: Magazine flipbook reader

**Files:**
- Create: `src/components/MagazineReader.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement MagazineReader**

- Fetch `/magazine/sheets.json`.
- Use `page-flip` on a ref container; map 19 images.
- `usePortrait: window.innerWidth < 768` (resize listener).
- Covers (index 0, 18): single page mode if library supports, else portrait.
- Lazy-load images near current index.
- Prev/next buttons + keyboard; `prefers-reduced-motion` disables animation duration.

- [ ] **Step 2: Style reader chrome**

Magenta accent `#E91E63`, off-white `#FAFAF8` background, full viewport height minus footer/header.

- [ ] **Step 3: Manual test**

Desktop: spread view. Mobile DevTools: single page + swipe.

---

### Task 6: Kritrim footer

**Files:**
- Create: `src/components/KritrimFooter.tsx`

- [ ] **Step 1: Implement footer**

```tsx
const WA = "https://wa.me/85263451395?text=" +
  encodeURIComponent("Hi, I want to contact about IT and AI services");
```

Fixed bottom bar, `t("footer.developedBy")`, WhatsApp link with `t("footer.whatsapp")`, safe-area-inset.

- [ ] **Step 2: Add to page layout**

Ensure flipbook controls sit above footer (padding-bottom on main).

---

### Task 7: Database and auth code logic

**Files:**
- Create: `src/lib/db.ts`, `src/lib/auth-codes.ts`, `tests/auth-codes.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/auth-codes.test.ts` ? test `generateCode()` returns 6 digits, `hashCode`/`verifyCode` roundtrip, `isExpired(createdAt, 15min)`.

- [ ] **Step 2: Run tests ? FAIL**

- [ ] **Step 3: Implement `auth-codes.ts`**

```typescript
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

export function generateCode(): string {
  return String(randomInt(100000, 999999));
}

export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

export function isExpired(createdAt: Date, minutes = 15): boolean {
  return Date.now() - createdAt.getTime() > minutes * 60 * 1000;
}
```

- [ ] **Step 4: Turso schema**

`src/lib/db.ts` ? migrations or init SQL:

```sql
CREATE TABLE IF NOT EXISTS verification_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  locale TEXT DEFAULT 'en',
  created_at TEXT NOT NULL,
  consumed_at TEXT
);
CREATE TABLE IF NOT EXISTS download_sessions (
  email TEXT PRIMARY KEY,
  verified_at TEXT NOT NULL
);
```

- [ ] **Step 5: Run tests ? PASS**

---

### Task 8: Rate limiting helper

**Files:**
- Create: `src/lib/rate-limit.ts`, `tests/rate-limit.test.ts`

- [ ] **Step 1: In-memory sliding window** (per IP + per email, 5/hour for send-code)

Implement `checkRateLimit(key: string): { ok: boolean }` with Map + timestamps (document: replace with Upstash Redis if serverless cold starts become an issue).

- [ ] **Step 2: Tests + PASS**

---

### Task 9: Resend integration

**Files:**
- Create: `src/lib/resend.ts`

- [ ] **Step 1: `sendVerificationEmail(email, code, locale)`**

Use Resend SDK; subject/body from `messages/{locale}.json` `email` keys.

- [ ] **Step 2: `addToAudience(email)`**

Resend Audiences API ? **Kritrim Mailing list** (`RESEND_AUDIENCE_ID`).

---

### Task 10: API ? send-code

**Files:**
- Create: `src/app/api/auth/send-code/route.ts`

- [ ] **Step 1: POST handler**

Body: `{ email, consent, locale }` (Zod validated).

- Reject if `!consent`.
- Rate limit IP + email.
- Generate code, hash, insert row, send email.
- Return `{ ok: true }` (never return code in JSON).

---

### Task 11: API ? verify-code

**Files:**
- Create: `src/lib/session.ts`, `src/app/api/auth/verify-code/route.ts`

- [ ] **Step 1: POST handler**

Body: `{ email, code }`.

- Load latest unconsumed request for email; check expiry, attempts (<5), `verifyCode`.
- On success: mark consumed, `addToAudience`, set httpOnly cookie `download_session` (JWT via `jose`, 10min, contains email).

- [ ] **Step 2: Return `{ ok: true }`**

Client will then call download endpoint.

---

### Task 12: PDF blob + download API

**Files:**
- Create: `src/lib/blob-pdf.ts`, `src/app/api/download/pdf/route.ts`

- [ ] **Step 1: Upload PDF once**

CLI or script: upload `NRNA HK Everest Day_2.pdf` to Vercel Blob; store path in env `PDF_BLOB_PATH`.

- [ ] **Step 2: GET `/api/download/pdf`**

Verify JWT cookie ? stream blob with headers:

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="Everest-Day-Hong-Kong-2024.pdf"
```

---

### Task 13: Download modal UI

**Files:**
- Create: `src/components/DownloadModal.tsx`

- [ ] **Step 1: Two-step modal**

Step 1: email + consent ? POST send-code.  
Step 2: 6-digit input ? POST verify-code ? on success `window.location.href = '/api/download/pdf'` (or fetch blob + createObjectURL + programmatic click).

- [ ] **Step 2: Error states**

Show `t("download.invalidCode")` etc. from API error codes.

- [ ] **Step 3: Wire Download button in reader header**

---

### Task 14: Security headers and env

**Files:**
- Modify: `next.config.ts`, `.env.example`

- [ ] **Step 1: `.env.example`**

```
SITE_URL=https://everestday.nrnahk.org
RESEND_API_KEY=
RESEND_AUDIENCE_ID=
RESEND_FROM_EMAIL=magazine@nrnahk.org
TOKEN_SECRET=
DATABASE_URL=
BLOB_READ_WRITE_TOKEN=
PDF_BLOB_PATH=everest-day-2024.pdf
```

- [ ] **Step 2: Security headers** in `next.config.ts` (`X-Frame-Options`, `X-Content-Type-Options`, etc.)

---

### Task 15: Deploy to Vercel

- [ ] **Step 1: Push to GitHub, import on Vercel**

- [ ] **Step 2: Set env vars in Vercel dashboard**

- [ ] **Step 3: CNAME `everestday.nrnahk.org` at Hostinger ? Vercel**

- [ ] **Step 4: Verify Resend domain for `RESEND_FROM_EMAIL`**

- [ ] **Step 5: Run pre-ship checklist from spec §12**

---

## Spec coverage (self-review)

| Spec section | Task(s) |
|--------------|---------|
| i18n EN/NE + picker + switcher | 3, 4 |
| Magazine 19 sheets | 2, 5 |
| Reader UX / motion / mobile | 5 |
| Download code flow | 7?8, 10?11, 13 |
| Kritrim footer + WhatsApp | 6 |
| Mailing list | 9, 11 |
| PDF private + browser download | 12 |
| Vercel + DNS | 15 |
| Security | 10?12, 14 |

All v1 requirements mapped. No placeholders in task steps.

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-29-everest-day-magazine-reader.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** ? fresh subagent per task, review between tasks  
2. **Inline Execution** ? implement tasks in this session with checkpoints  

**Which approach do you want?**
