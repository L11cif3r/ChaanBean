import crypto from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { blindIndex, decryptField, encryptField, EnvKeyProvider, setKeyProvider } from "@/server/crypto";

beforeAll(() => {
  setKeyProvider(
    new EnvKeyProvider({
      FIELD_ENCRYPTION_KEY: crypto.randomBytes(32).toString("base64"),
      BLIND_INDEX_KEY: crypto.randomBytes(32).toString("base64"),
    }),
  );
});

describe("field encryption (PRD section 15)", () => {
  it("round-trips a value and never repeats ciphertext", () => {
    const a = encryptField("9876543210", "counterparties.mobile");
    const b = encryptField("9876543210", "counterparties.mobile");
    expect(a).not.toBe(b);
    expect(a.startsWith("v1.env1.")).toBe(true);
    expect(decryptField(a, "counterparties.mobile")).toBe("9876543210");
  });

  it("will not decrypt a value moved to another column", () => {
    const c = encryptField("AAPFU0939F", "counterparties.pan");
    expect(() => decryptField(c, "counterparties.mobile")).toThrow();
  });

  it("detects tampering", () => {
    const c = encryptField("secret", "x");
    const [v, k, body] = c.split(".");
    const bytes = Buffer.from(body, "base64");
    bytes[bytes.length - 1] ^= 1;
    expect(() => decryptField(`${v}.${k}.${bytes.toString("base64")}`, "x")).toThrow();
  });
});

describe("blind index", () => {
  it("is stable for the same value and purpose, and differs across purposes", () => {
    expect(blindIndex("9876543210", "mobile")).toBe(blindIndex("9876543210", "mobile"));
    expect(blindIndex("9876543210", "mobile")).not.toBe(blindIndex("9876543210", "pan"));
    expect(blindIndex("9876543210", "mobile")).toMatch(/^[0-9a-f]{64}$/);
  });
});
