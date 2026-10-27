import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

/**
 * Derives a 32-byte key from the configured secret using SHA-256.
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.EMAIL_PAYLOAD_SECRET ||
    process.env.ACCESS_TOKEN_SECRET ||
    "fitpro_default_dev_email_payload_secret_32chars!";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts an arbitrary JSON-serializable payload using AES-256-GCM.
 * Formats output as: "ivHex:ciphertextHex:authTagHex".
 */
export function encryptPayload(data: unknown): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const jsonString = JSON.stringify(data);
  let ciphertext = cipher.update(jsonString, "utf8", "hex");
  ciphertext += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${ciphertext}:${authTag.toString("hex")}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string and parses it as JSON.
 * Throws if tampering or invalid key is detected.
 */
export function decryptPayload<T = unknown>(encryptedString: string): T {
  const parts = encryptedString.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format: expected iv:ciphertext:tag");
  }

  const [ivHex, ciphertextHex, tagHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted) as T;
}
