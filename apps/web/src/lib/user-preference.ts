import { prisma } from './db';

const DEFAULT_THEME = 'system';
const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_ALERT_DIGEST = 'instant';

export type AlertDigest = 'instant' | 'daily' | 'weekly';

export async function getOrCreateUserPreference(userId: string) {
  let prefs = await prisma.userPreference.findUnique({
    where: { userId },
  });
  if (!prefs) {
    prefs = await prisma.userPreference.create({
      data: {
        userId,
        theme: DEFAULT_THEME,
        timezone: DEFAULT_TIMEZONE,
        alertDigest: DEFAULT_ALERT_DIGEST,
      },
    });
  }
  return prefs;
}

export async function updateUserPreference(
  userId: string,
  data: {
    theme?: string;
    timezone?: string;
    dateFormat?: string | null;
    defaultLandingPage?: string | null;
    emailNotifications?: boolean;
    billingNotifications?: boolean;
    alertDigest?: AlertDigest;
  }
) {
  await getOrCreateUserPreference(userId);
  return prisma.userPreference.update({
    where: { userId },
    data,
  });
}
