const EXPIRY_HOURS = 24;

function buildMagicLinkHtml(url: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to DependWatch</title>
</head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#0a0a0a;color:#e5e5e5;padding:32px 16px;">
  <div style="max-width:420px;margin:0 auto;">
    <p style="font-size:14px;color:#a3a3a3;margin-bottom:24px;">◇ DependWatch</p>
    <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;">Sign in to DependWatch</h1>
    <p style="font-size:14px;color:#a3a3a3;margin:0 0 24px;line-height:1.5;">Use the button below to sign in. This link expires in ${EXPIRY_HOURS} hours.</p>
    <a href="${url}" style="display:inline-block;background:#171717;color:#fafafa;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:6px;border:1px solid #404040;">Sign in</a>
    <p style="font-size:12px;color:#737373;margin:24px 0 0;">If the button doesn’t work, copy and paste this link into your browser:</p>
    <p style="font-size:12px;word-break:break-all;color:#a3a3a3;margin:4px 0 0;">${url}</p>
  </div>
</body>
</html>`.trim();
}

function buildMagicLinkText(url: string): string {
  return `Sign in to DependWatch\n\nUse this link to sign in. It expires in ${EXPIRY_HOURS} hours.\n\n${url}`;
}

const SUBJECT = 'Sign in to DependWatch';

export function getMagicLinkEmailContent(url: string): { subject: string; html: string; text: string } {
  return {
    subject: SUBJECT,
    html: buildMagicLinkHtml(url),
    text: buildMagicLinkText(url),
  };
}

export async function sendMagicLinkForAuth(to: string, url: string): Promise<{ ok: boolean; error?: Error }> {
  const from = process.env.EMAIL_FROM ?? 'DependWatch <noreply@dependwatch.app>';
  const { subject, html, text } = getMagicLinkEmailContent(url);
  const { sendMailSmtp, isSmtpConfigured } = await import('./email-smtp');
  if (!isSmtpConfigured()) {
    return { ok: false, error: new Error('SMTP not configured') };
  }
  return sendMailSmtp({ from, to, subject, html, text });
}
