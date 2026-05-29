import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import ne from "../messages/ne.json";

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return keys(v as Record<string, unknown>, p);
    }
    return [p];
  });
}

describe("messages", () => {
  it("en and ne have the same keys", () => {
    expect(keys(ne).sort()).toEqual(keys(en).sort());
  });
});
