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
