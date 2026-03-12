/**
 * Waitlist confirmation (thank-you) email. Transactional, premium tone.
 * Reusable for early access, launch invites, and lifecycle messaging.
 */

export const WAITLIST_CONFIRMATION_SUBJECT = "You're on the DependWatch early access list";

function buildHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Early access confirmed</title>
</head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#0a0a0a;color:#e5e5e5;padding:32px 16px;">
  <div style="max-width:480px;margin:0 auto;">
    <p style="font-size:14px;color:#a3a3a3;margin-bottom:24px;">◇ DependWatch</p>
    <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;">You're on the list</h1>
    <p style="font-size:14px;color:#a3a3a3;margin:0 0 16px;line-height:1.55;">
      Thanks for joining early access. We've confirmed your registration.
    </p>
    <p style="font-size:14px;color:#a3a3a3;margin:0 0 16px;line-height:1.55;">
      DependWatch is observability for the APIs and tools your software depends on — including the ones your AI agents call. One place for latency, failures, cost, and guardrails across Stripe, OpenAI, Twilio, auth providers, and the rest.
    </p>
    <p style="font-size:14px;color:#a3a3a3;margin:0 0 24px;line-height:1.55;">
      We're actively building. Early users will hear first when access opens and may get priority onboarding.
    </p>
    <p style="font-size:13px;color:#737373;margin:0;line-height:1.5;">
      Keep an eye on this inbox for launch and access updates. No spam — only what matters.
    </p>
    <p style="font-size:13px;color:#525252;margin:24px 0 0;line-height:1.5;">
      — The DependWatch team
    </p>
  </div>
</body>
</html>`.trim();
}

function buildText(): string {
  return `You're on the list

Thanks for joining DependWatch early access. We've confirmed your registration.

DependWatch is observability for the APIs and tools your software depends on — including the ones your AI agents call. One place for latency, failures, cost, and guardrails across your stack.

We're actively building. Early users will hear first when access opens and may get priority onboarding.

Keep an eye on this inbox for launch and access updates.

— The DependWatch team`;
}

export function getWaitlistConfirmationContent(): { subject: string; html: string; text: string } {
  return {
    subject: WAITLIST_CONFIRMATION_SUBJECT,
    html: buildHtml(),
    text: buildText(),
  };
}

export type SendWaitlistConfirmationOptions = {
  to: string;
};

/**
 * Sends the waitlist thank-you email. Uses Resend if AUTH_RESEND_KEY is set,
 * otherwise SMTP (e.g. SendGrid). In dev with no config, logs and returns ok.
 */
export async function sendWaitlistConfirmationEmail(
  opts: SendWaitlistConfirmationOptions
): Promise<{ ok: boolean; error?: Error }> {
  const from = process.env.EMAIL_FROM ?? 'DependWatch <noreply@dependwatch.app>';
  const { subject, html, text } = getWaitlistConfirmationContent();

  const { sendMailSmtp, isSmtpConfigured } = await import('./email-smtp');
  if (isSmtpConfigured()) {
    const result = await sendMailSmtp({ from, to: opts.to, subject, html, text });
    return result;
  }

  const hasResend = !!process.env.AUTH_RESEND_KEY;
  if (hasResend) {
    const { getResend } = await import('./resend');
    try {
      const { error } = await getResend().emails.send({
        from,
        to: opts.to,
        subject,
        html,
        text,
      });
      if (error) {
        console.error('[waitlist] confirmation_email_failed', error);
        return { ok: false, error: new Error(error.message) };
      }
      return { ok: true };
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to send');
      console.error('[waitlist] confirmation_email_failed', err);
      return { ok: false, error: err };
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[waitlist] confirmation email (dev, no provider)', { to: opts.to });
    return { ok: true };
  }

  return { ok: false, error: new Error('Email not configured') };
}
