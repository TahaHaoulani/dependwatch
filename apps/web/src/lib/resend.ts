import { Resend } from 'resend';

let _resend: Resend | null = null;
export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.AUTH_RESEND_KEY;
    if (!key) {
      if (process.env.NODE_ENV === 'production') throw new Error('AUTH_RESEND_KEY is not set');
      _resend = { emails: { send: async () => ({ data: null, error: null }) } } as unknown as Resend;
    } else {
      _resend = new Resend(key);
    }
  }
  return _resend;
}

const FROM = process.env.EMAIL_FROM ?? 'DependWatch <onboarding@resend.dev>';

export async function sendAlertEmail(opts: {
  to: string;
  subject: string;
  body: string;
}) {
  const { data, error } = await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.body,
  });
  if (error) {
    console.error('[Resend]', error);
    return { ok: false, error };
  }
  return { ok: true, id: data?.id };
}

export async function sendMagicLinkEmail(opts: {
  to: string;
  url: string;
}) {
  const { data, error } = await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: 'Sign in to DependWatch',
    html: `
      <p>Click the link below to sign in to DependWatch:</p>
      <p><a href="${opts.url}">${opts.url}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
  if (error) {
    console.error('[Resend]', error);
    return { ok: false, error };
  }
  return { ok: true, id: data?.id };
}

/** Contact form: sends to CONTACT_EMAIL or support-style address derived from EMAIL_FROM. */
export async function sendContactEmail(opts: {
  email: string;
  subject: string;
  message: string;
  topic?: string;
}) {
  const to = process.env.CONTACT_EMAIL || 'support@dependwatch.app';
  const body = `
    <p><strong>From:</strong> ${escapeHtml(opts.email)}</p>
    ${opts.topic ? `<p><strong>Topic:</strong> ${escapeHtml(opts.topic)}</p>` : ''}
    <p><strong>Message:</strong></p>
    <pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(opts.message)}</pre>
  `;
  const { data, error } = await getResend().emails.send({
    from: FROM,
    to,
    replyTo: opts.email,
    subject: `[Contact] ${opts.subject.slice(0, 80)}`,
    html: body,
  });
  if (error) {
    console.error('[Resend contact]', error);
    return { ok: false, error };
  }
  return { ok: true, id: data?.id };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
