import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "download_session";
const TTL = "10m";

function secret(): Uint8Array {
  const s = process.env.TOKEN_SECRET;
  if (!s) throw new Error("TOKEN_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function createDownloadToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(secret());
}

export async function verifyDownloadToken(
  token: string,
): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const email = payload.email;
    if (typeof email !== "string") return null;
    return { email };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
