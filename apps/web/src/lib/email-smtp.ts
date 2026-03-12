import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

const DEFAULT_SENDGRID_HOST = 'smtp.sendgrid.net';
const DEFAULT_SENDGRID_PORT = 587;
const DEFAULT_SENDGRID_USER = 'apikey';

let _transporter: Transporter | null = null;

function hasSmtpConfig(): boolean {
  const pass = process.env.SMTP_PASS ?? process.env.SENDGRID_API_KEY ?? null;
  const user = process.env.SMTP_USER ?? (process.env.SENDGRID_API_KEY ? DEFAULT_SENDGRID_USER : null);
  return !!(pass && (user || process.env.SENDGRID_API_KEY));
}

export function getSmtpTransporter(): Transporter | null {
  if (_transporter) return _transporter;
  const host = process.env.SMTP_HOST ?? (process.env.SENDGRID_API_KEY ? DEFAULT_SENDGRID_HOST : null);
  const port = process.env.SMTP_PORT
    ? parseInt(process.env.SMTP_PORT, 10)
    : process.env.SENDGRID_API_KEY
      ? DEFAULT_SENDGRID_PORT
      : 587;
  const user = process.env.SMTP_USER ?? (process.env.SENDGRID_API_KEY ? DEFAULT_SENDGRID_USER : null);
  const pass = process.env.SMTP_PASS ?? process.env.SENDGRID_API_KEY ?? null;
  if (!host || !user || !pass) return null;
  _transporter = nodemailer.createTransport({
    host,
    port: Number.isNaN(port) ? 587 : port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
  return _transporter;
}

export function isSmtpConfigured(): boolean {
  return hasSmtpConfig() && !!getSmtpTransporter();
}

export async function sendMailSmtp(opts: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; error?: Error }> {
  const transporter = getSmtpTransporter();
  if (!transporter) {
    return { ok: false, error: new Error('SMTP not configured') };
  }
  try {
    await transporter.sendMail({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text ?? opts.html.replace(/<[^>]+>/g, '').trim(),
    });
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (process.env.NODE_ENV !== 'production') {
      console.error('[SMTP]', error.message);
    }
    return { ok: false, error };
  }
}
