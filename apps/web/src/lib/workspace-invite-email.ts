const SUBJECT = 'You\'re invited to a DependWatch workspace';

function buildInviteHtml(workspaceName: string, acceptUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workspace invite</title>
</head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#0a0a0a;color:#e5e5e5;padding:32px 16px;">
  <div style="max-width:420px;margin:0 auto;">
    <p style="font-size:14px;color:#a3a3a3;margin-bottom:24px;">◇ DependWatch</p>
    <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;">You're invited</h1>
    <p style="font-size:14px;color:#a3a3a3;margin:0 0 24px;line-height:1.5;">You've been invited to join the workspace <strong>${escapeHtml(workspaceName)}</strong>. Accept the invite to get access.</p>
    <a href="${escapeHtml(acceptUrl)}" style="display:inline-block;background:#171717;color:#fafafa;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:6px;border:1px solid #404040;">Accept invite</a>
    <p style="font-size:12px;color:#737373;margin:24px 0 0;">If the button doesn't work, copy and paste this link:</p>
    <p style="font-size:12px;word-break:break-all;color:#a3a3a3;margin:4px 0 0;">${escapeHtml(acceptUrl)}</p>
  </div>
</body>
</html>`.trim();
}

function buildInviteText(workspaceName: string, acceptUrl: string): string {
  return `You're invited to join the DependWatch workspace "${workspaceName}".\n\nAccept the invite: ${acceptUrl}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getInviteEmailContent(workspaceName: string, acceptUrl: string): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: SUBJECT,
    html: buildInviteHtml(workspaceName, acceptUrl),
    text: buildInviteText(workspaceName, acceptUrl),
  };
}

export async function sendInviteEmail(
  to: string,
  workspaceName: string,
  acceptUrl: string
): Promise<{ ok: boolean; error?: Error }> {
  const from = process.env.EMAIL_FROM ?? 'DependWatch <noreply@dependwatch.app>';
  const { subject, html, text } = getInviteEmailContent(workspaceName, acceptUrl);
  const { sendMailSmtp, isSmtpConfigured } = await import('./email-smtp');
  if (isSmtpConfigured()) {
    return sendMailSmtp({ from, to, subject, html, text });
  }
  const hasResend = !!process.env.AUTH_RESEND_KEY;
  if (hasResend) {
    const { getResend } = await import('./resend');
    try {
      await getResend().emails.send({ from, to, subject, html });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e : new Error('Failed to send') };
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DependWatch] Invite email (dev)', { to, workspaceName, acceptUrl });
    return { ok: true };
  }
  return { ok: false, error: new Error('Email not configured') };
}
