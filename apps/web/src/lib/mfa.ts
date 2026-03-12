import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'crypto';
import speakeasy from 'speakeasy';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const BACKUP_CODE_LENGTH = 8;
const BACKUP_CODE_COUNT = 10;

function getEncryptionKey(): Buffer | null {
  const key = process.env.MFA_ENCRYPTION_KEY;
  if (!key || key.length < 32) return null;
  return Buffer.from(key.slice(0, 32), 'utf8');
}

export function encryptTotpSecret(plain: string): string {
  const key = getEncryptionKey();
  if (!key) return plain;
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptTotpSecret(cipherText: string): string {
  const key = getEncryptionKey();
  if (!key) return cipherText;
  const buf = Buffer.from(cipherText, 'base64');
  if (buf.length < IV_LENGTH + TAG_LENGTH) return cipherText;
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const enc = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final('utf8');
}

export function generateTotpSecret(email: string): { secret: string; otpauthUrl: string } {
  const secret = speakeasy.generateSecret({
    name: `DependWatch (${email})`,
    length: 20,
  });
  return {
    secret: secret.base32 ?? secret.ascii!,
    otpauthUrl: secret.otpauth_url ?? `otpauth://totp/DependWatch:${encodeURIComponent(email)}?secret=${secret.base32 ?? secret.ascii}`,
  };
}

export function verifyTotpCode(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });
}

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    let s = '';
    for (let j = 0; j < BACKUP_CODE_LENGTH; j++) {
      s += CHARS[randomBytes(1)[0]! % CHARS.length];
    }
    codes.push(s.replace(/(.{4})/g, '$1-').replace(/-$/, ''));
  }
  return codes;
}

function hashBackupCode(code: string): string {
  return createHash('sha256').update(code.replace(/-/g, '').toUpperCase()).digest('hex');
}

export function hashBackupCodesForStorage(codes: string[]): string {
  return JSON.stringify(codes.map((c) => hashBackupCode(c)));
}

export function verifyAndConsumeBackupCode(
  storedHashesJson: string,
  code: string
): { valid: boolean; remainingHashesJson: string | null } {
  let hashes: string[] = [];
  try {
    hashes = JSON.parse(storedHashesJson);
  } catch {
    return { valid: false, remainingHashesJson: null };
  }
  const hash = hashBackupCode(code);
  const idx = hashes.indexOf(hash);
  if (idx === -1) return { valid: false, remainingHashesJson: null };
  hashes.splice(idx, 1);
  return { valid: true, remainingHashesJson: hashes.length > 0 ? JSON.stringify(hashes) : null };
}