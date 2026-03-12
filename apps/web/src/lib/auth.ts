import NextAuth, { type NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import EmailProvider from 'next-auth/providers/email';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { prisma } from './db';
import { cacheGet, cacheSet, cacheDel, cacheKey } from '@/lib/cache';
import { getResend } from './resend';
import { isSmtpConfigured } from './email-smtp';
import { sendMagicLinkForAuth, getMagicLinkEmailContent } from './auth-email';

const SESSION_VERSION_CACHE_TTL_SEC = 45;

/**
 * Session version cache: Redis when REDIS_URL is set, else in-memory.
 * Avoids DB hit on every /api/auth/session request.
 */
async function getSessionVersionCached(userId: string): Promise<number> {
  const key = cacheKey(['session_version', userId]);
  const raw = await cacheGet(key);
  if (raw !== null) {
    const v = parseInt(raw, 10);
    if (!Number.isNaN(v)) return v;
  }
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  const version = u?.sessionVersion ?? 0;
  await cacheSet(key, String(version), SESSION_VERSION_CACHE_TTL_SEC);
  return version;
}

/** Call after revoking sessions (e.g. revoke-all) so the next session read sees the new version. */
export async function invalidateSessionVersionCache(userId: string): Promise<void> {
  await cacheDel(cacheKey(['session_version', userId]));
}

const from = process.env.EMAIL_FROM ?? 'DependWatch <noreply@dependwatch.app>';
const hasResend = !!process.env.AUTH_RESEND_KEY;
const hasGitHub = !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
const hasGoogle = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

function logMagicLinkEmailInDev(email: string, url: string) {
  if (process.env.NODE_ENV === 'production') return;
  const { subject, html, text } = getMagicLinkEmailContent(url);
  console.log('[DependWatch] -------- Magic link email (dev) --------');
  console.log('[DependWatch] From:', from);
  console.log('[DependWatch] To:', email);
  console.log('[DependWatch] Subject:', subject);
  console.log('[DependWatch] --- Text body ---\n' + text);
  console.log('[DependWatch] --- HTML body ---\n' + html);
  console.log('[DependWatch] ----------------------------------------');
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(hasGoogle
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          }),
        ]
      : []),
    ...(hasGitHub
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID!,
            clientSecret: process.env.AUTH_GITHUB_SECRET!,
          }),
        ]
      : []),
    EmailProvider({
      from,
      sendVerificationRequest: async ({ identifier: email, url }) => {
        if (isSmtpConfigured()) {
          const result = await sendMagicLinkForAuth(email, url);
          if (!result.ok) {
            if (process.env.NODE_ENV !== 'production') {
              console.error('[DependWatch] SMTP send failed:', result.error?.message);
              logMagicLinkEmailInDev(email, url);
              return;
            }
            throw result.error ?? new Error('Failed to send magic link');
          }
          logMagicLinkEmailInDev(email, url);
          return;
        }
        if (hasResend && process.env.NODE_ENV === 'production') {
          const { subject, html } = getMagicLinkEmailContent(url);
          await getResend().emails.send({ from, to: email, subject, html });
          return;
        }
        if (!hasResend && process.env.NODE_ENV !== 'production') {
          logMagicLinkEmailInDev(email, url);
          return;
        }
        const { subject, html } = getMagicLinkEmailContent(url);
        await getResend().emails.send({ from, to: email, subject, html });
        logMagicLinkEmailInDev(email, url);
      },
    }),
  ],
  pages: {
    signIn: '/login',
    verifyRequest: '/login/verify',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days absolute max
    updateAge: 24 * 60 * 60,   // extend session when used at least once per 24h (rolling)
  },
  cookies: {
    sessionToken: {
      // Must match getToken() default: NEXTAUTH_URL https → __Secure-*, else unprefixed
      name:
        process.env.NEXTAUTH_URL?.startsWith('https://') || process.env.VERCEL
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false,
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days, aligned with session.maxAge
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        const u = await prisma.user.findUnique({
          where: { id: user.id },
          select: { sessionVersion: true },
        });
        token.sessionVersion = u?.sessionVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      const userId = token.id as string | undefined;
      if (userId && session.user) {
        const tokenVersion = (token.sessionVersion as number | undefined) ?? 0;
        const dbVersion = await getSessionVersionCached(userId);
        if (tokenVersion !== dbVersion) {
          return { ...session, user: { ...session.user, id: '', email: null, name: null, image: null } };
        }
        session.user.id = userId;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  events: {},
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}
