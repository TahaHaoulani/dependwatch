-- User.sessionVersion: increment to invalidate all JWTs (revoke all other sessions)
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
