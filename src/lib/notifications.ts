type MailInput = {
  to: string[];
  subject: string;
  html: string;
};

function normalizeEmails(list: (string | null | undefined)[]): string[] {
  return Array.from(new Set(list.map((e) => (e ?? "").trim()).filter(Boolean)));
}

export async function sendNotificationEmail(input: MailInput): Promise<void> {
  const to = normalizeEmails(input.to);
  if (to.length === 0) return;

  const webhookUrl = process.env.EMAIL_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    // No email provider configured; keep APIs non-blocking.
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        subject: input.subject,
        html: input.html,
      }),
    });
  } catch {
    // Ignore notification failures; business operation should still succeed.
  }
}

