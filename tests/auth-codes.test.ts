import { describe, expect, it } from "vitest";
import {
  generateCode,
  hashCode,
  isExpired,
  verifyCode,
} from "@/lib/auth-codes";

describe("auth-codes", () => {
  it("generateCode returns 6 digits", () => {
    const code = generateCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("verifyCode roundtrips", async () => {
    const code = "482913";
    const hash = await hashCode(code);
    expect(await verifyCode(code, hash)).toBe(true);
    expect(await verifyCode("000000", hash)).toBe(false);
  });

  it("isExpired respects window", () => {
    const old = new Date(Date.now() - 16 * 60 * 1000);
    expect(isExpired(old, 15)).toBe(true);
    const recent = new Date();
    expect(isExpired(recent, 15)).toBe(false);
  });
});
