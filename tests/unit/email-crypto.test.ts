import { describe, it, expect } from "vitest";
import { encryptPayload, decryptPayload } from "@/lib/email/crypto";

describe("Email Payload AES-256-GCM Encryption", () => {
  it("encrypts and decrypts payloads round-trip cleanly", () => {
    const original = {
      name: "John Doe",
      link: "https://example.com/verify-email/secret-token-123",
      timestamp: 1729000000,
    };

    const encrypted = encryptPayload(original);
    expect(typeof encrypted).toBe("string");
    expect(encrypted.split(":")).toHaveLength(3);

    const decrypted = decryptPayload<typeof original>(encrypted);
    expect(decrypted).toEqual(original);
  });

  it("produces distinct ciphertexts for identical inputs due to random IVs", () => {
    const data = { token: "same-sensitive-token" };
    const enc1 = encryptPayload(data);
    const enc2 = encryptPayload(data);

    expect(enc1).not.toBe(enc2);
    expect(decryptPayload(enc1)).toEqual(data);
    expect(decryptPayload(enc2)).toEqual(data);
  });

  it("rejects tampered ciphertexts and auth tags with an error", () => {
    const original = { secret: "confidential" };
    const encrypted = encryptPayload(original);
    const [iv, ciphertext, tag] = encrypted.split(":");

    // Tamper with ciphertext
    const tamperedCiphertext = ciphertext.slice(0, -2) + "00";
    expect(() => decryptPayload(`${iv}:${tamperedCiphertext}:${tag}`)).toThrow();

    // Tamper with auth tag
    const tamperedTag = tag.slice(0, -2) + "ff";
    expect(() => decryptPayload(`${iv}:${ciphertext}:${tamperedTag}`)).toThrow();
  });

  it("rejects malformed encrypted strings", () => {
    expect(() => decryptPayload("invalid-format")).toThrow(/Invalid encrypted payload format/);
    expect(() => decryptPayload("iv:ciphertext")).toThrow(/Invalid encrypted payload format/);
  });
});
