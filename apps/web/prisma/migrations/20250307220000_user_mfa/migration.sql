-- User MFA: TOTP and backup codes
ALTER TABLE "User" ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "totpSecretEncrypted" TEXT;
ALTER TABLE "User" ADD COLUMN "pendingTotpSecretEncrypted" TEXT;
ALTER TABLE "User" ADD COLUMN "backupCodesHashed" TEXT;
