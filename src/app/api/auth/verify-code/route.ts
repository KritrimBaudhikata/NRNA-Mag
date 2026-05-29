import { NextResponse } from "next/server";
import { z } from "zod";
import { isExpired, verifyCode } from "@/lib/auth-codes";
import { initDb, getDb } from "@/lib/db";
import { addToAudience } from "@/lib/resend";
import { COOKIE_NAME, createDownloadToken } from "@/lib/session";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "invalidCode" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const code = parsed.data.code;

    await initDb();
    const db = getDb();
    const row = await db.execute({
      sql: `SELECT id, code_hash, attempts, created_at, consumed_at
            FROM verification_requests
            WHERE email = ?
            ORDER BY created_at DESC
            LIMIT 1`,
      args: [email],
    });

    const record = row.rows[0];
    if (!record || record.consumed_at) {
      return NextResponse.json({ error: "invalidCode" }, { status: 400 });
    }

    const attempts = Number(record.attempts ?? 0);
    if (attempts >= 5) {
      return NextResponse.json({ error: "invalidCode" }, { status: 400 });
    }

    const createdAt = new Date(String(record.created_at));
    if (isExpired(createdAt, 15)) {
      return NextResponse.json({ error: "invalidCode" }, { status: 400 });
    }

    const valid = await verifyCode(code, String(record.code_hash));
    if (!valid) {
      await db.execute({
        sql: `UPDATE verification_requests SET attempts = attempts + 1 WHERE id = ?`,
        args: [String(record.id)],
      });
      return NextResponse.json({ error: "invalidCode" }, { status: 400 });
    }

    const now = new Date().toISOString();
    await db.execute({
      sql: `UPDATE verification_requests SET consumed_at = ? WHERE id = ?`,
      args: [now, String(record.id)],
    });
    await db.execute({
      sql: `INSERT INTO download_sessions (email, verified_at) VALUES (?, ?)
            ON CONFLICT(email) DO UPDATE SET verified_at = excluded.verified_at`,
      args: [email, now],
    });

    try {
      await addToAudience(email);
    } catch (e) {
      console.error("mailing list subscribe failed", e);
    }

    const token = await createDownloadToken(email);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });
    return response;
  } catch (err) {
    console.error("verify-code", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
