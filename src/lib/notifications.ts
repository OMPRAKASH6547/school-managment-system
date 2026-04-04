/**
 * Notifications (email + WhatsApp). Configure via env — if nothing is set, calls no-op safely.
 *
 * Email (first match wins):
 *   - SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM (optional: SMTP_SECURE=true)
 *   - Or POST JSON to EMAIL_WEBHOOK_URL: { to[], subject, html }
 *
 * WhatsApp (first match wins):
 *   - Meta Cloud: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, optional WHATSAPP_API_VERSION (default v21.0)
 *   - Or POST JSON to WHATSAPP_WEBHOOK_URL: { to, body } (implement your bridge: Twilio, Gupshup, etc.)
 *
 * Global: NOTIFICATIONS_ENABLED=false disables all outbound notifications.
 */

import nodemailer from "nodemailer";

type MailInput = {
  to: string[];
  subject: string;
  html: string;
};

export function notificationsEnabled(): boolean {
  return (process.env.NOTIFICATIONS_ENABLED ?? "true").toLowerCase() !== "false";
}

function normalizeEmails(list: (string | null | undefined)[]): string[] {
  return Array.from(new Set(list.map((e) => (e ?? "").trim()).filter(Boolean)));
}

/** Strip tags for WhatsApp / plain-text fallbacks. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let smtpTransporter: nodemailer.Transporter | null | undefined;

function getSmtpTransporter(): nodemailer.Transporter | null {
  if (smtpTransporter !== undefined) return smtpTransporter;
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    smtpTransporter = null;
    return null;
  }
  const port = Number(process.env.SMTP_PORT || "587");
  const secure =
    (process.env.SMTP_SECURE ?? "").toLowerCase() === "true" || port === 465;
  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  });
  return smtpTransporter;
}

export async function sendNotificationEmail(input: MailInput): Promise<void> {
  if (!notificationsEnabled()) return;
  const to = normalizeEmails(input.to);
  if (to.length === 0) return;

  const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || "noreply@localhost";

  const transport = getSmtpTransporter();
  if (transport) {
    try {
      await transport.sendMail({
        from,
        to: to.join(", "),
        subject: input.subject,
        html: input.html,
        text: htmlToPlainText(input.html),
      });
    } catch (e) {
      console.error("[notifications] SMTP send failed", e);
    }
    return;
  }

  const webhookUrl = process.env.EMAIL_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

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
  } catch (e) {
    console.error("[notifications] EMAIL_WEBHOOK_URL failed", e);
  }
}

/** E.164 without + for Meta (e.g. 9198xxxxxxxx). Digits only. */
export function normalizeWhatsAppRecipient(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export async function sendNotificationWhatsApp(toDigits: string, body: string): Promise<void> {
  if (!notificationsEnabled()) return;
  const to = toDigits.replace(/\D/g, "");
  if (to.length < 10) return;

  const text = body.length > 4000 ? `${body.slice(0, 3997)}...` : body;

  const bridgeUrl = process.env.WHATSAPP_WEBHOOK_URL?.trim();
  if (bridgeUrl) {
    try {
      await fetch(bridgeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, body: text }),
      });
    } catch (e) {
      console.error("[notifications] WHATSAPP_WEBHOOK_URL failed", e);
    }
    return;
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) return;

  const version = process.env.WHATSAPP_API_VERSION?.trim() || "v21.0";
  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text, preview_url: false },
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("[notifications] WhatsApp Cloud API:", res.status, errText.slice(0, 500));
    }
  } catch (e) {
    console.error("[notifications] WhatsApp Cloud API failed", e);
  }
}

export type NotifyChannelsInput = {
  emails?: (string | null | undefined)[];
  phones?: (string | null | undefined)[];
  subject: string;
  html: string;
};

/** Fire-and-forget email + WhatsApp to all recipients; failures are logged only. */
export async function notifyEmailAndWhatsApp(input: NotifyChannelsInput): Promise<void> {
  if (!notificationsEnabled()) return;
  const emailList = normalizeEmails(input.emails ?? []);
  const phoneSet = new Set<string>();
  for (const p of input.phones ?? []) {
    const n = normalizeWhatsAppRecipient(p ?? undefined);
    if (n) phoneSet.add(n);
  }
  const plain = htmlToPlainText(input.html);
  const waBody = `${input.subject}\n\n${plain}`;

  await Promise.allSettled([
    emailList.length > 0
      ? sendNotificationEmail({ to: emailList, subject: input.subject, html: input.html })
      : Promise.resolve(),
    ...[...phoneSet].map((digits) => sendNotificationWhatsApp(digits, waBody)),
  ]);
}
