import crypto from "crypto";
import { createHmac } from "crypto";

export interface TwoFactorSetup {
  secret: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export interface VerifyTwoFactorResult {
  valid: boolean;
  remainingAttempts?: number;
}

const base32Encode = (buffer: Buffer): string => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
};

const base32Decode = (input: string): Buffer => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < input.length; i++) {
    value = (value << 5) | alphabet.indexOf(input[i]);
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
};

const generateTOTPToken = (secret: string): string => {
  const decodedSecret = base32Decode(secret);
  const now = Math.floor(Date.now() / 1000);
  const timeCounter = Math.floor(now / 30);
  const buffer = Buffer.alloc(8);

  for (let i = 7; i >= 0; i--) {
    buffer[i] = timeCounter & 0xff;
    timeCounter = timeCounter >> 8;
  }

  const hmac = createHmac("sha1", decodedSecret);
  hmac.update(buffer);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code = (
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  ) % 1000000;

  return String(code).padStart(6, "0");
};

export const generate2FASecret = async (email: string): Promise<TwoFactorSetup> => {
  const secret = base32Encode(crypto.randomBytes(20));
  const encodedEmail = encodeURIComponent(email);
  const manualEntryKey = secret;

  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );

  return { secret, manualEntryKey, backupCodes };
};

export const verify2FAToken = (token: string, secret: string): boolean => {
  if (!/^\d{6}$/.test(token)) return false;

  const currentToken = generateTOTPToken(secret);
  return token === currentToken;
};

export const generateBackupCodes = (): string[] => {
  return Array.from({ length: 10 }, () => crypto.randomBytes(4).toString("hex").toUpperCase());
};

export const useBackupCode = (
  code: string,
  codes: string[]
): { valid: boolean; remaining: string[] } => {
  const index = codes.indexOf(code.toUpperCase());
  if (index === -1) return { valid: false, remaining: codes };

  const remaining = codes.filter((_, i) => i !== index);
  return { valid: true, remaining };
};
