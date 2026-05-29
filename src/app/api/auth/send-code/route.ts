import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCode, hashCode } from "@/lib/auth-codes";
import { initDb, getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/resend";
import type { Locale } from "@/i18n/locales";

const bodySchema = z.object({
  email: z.string().email(),
  consent: z.boolean(),
  locale: z.enum(["en", "ne"]).default("en"),
  website: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalidEmail" },
        { status: 400 },
      );
    }

    const { email, consent, locale, website } = parsed.data;
    if (website) {
      return NextResponse.json({ ok: true });
    }
    if (!consent) {
      return NextResponse.json(
        { error: "consentRequired" },
        { status: 400 },
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    if (!checkRateLimit(`send:${ip}`, 5, 3_600_000).ok) {
      return NextResponse.json({ error: "rateLimited" }, { status: 429 });
    }
    if (!checkRateLimit(`send:${email}`, 5, 3_600_000).ok) {
      return NextResponse.json({ error: "rateLimited" }, { status: 429 });
    }

    await initDb();
    const code = generateCode();
    const codeHash = await hashCode(code);
    const id = randomUUID();
    const now = new Date().toISOString();

    await getDb().execute({
      sql: `INSERT INTO verification_requests (id, email, code_hash, attempts, locale, created_at)
            VALUES (?, ?, ?, 0, ?, ?)`,
      args: [id, email.toLowerCase(), codeHash, locale as Locale, now],
    });

    if (process.env.RESEND_API_KEY) {
      await sendVerificationEmail(email, code, locale as Locale);
    } else if (process.env.NODE_ENV !== "production") {
      console.info(`[dev] Verification code for ${email}: ${code}`);
    } else {
      return NextResponse.json({ error: "server" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-code", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
