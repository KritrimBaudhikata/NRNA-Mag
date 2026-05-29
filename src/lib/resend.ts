import { Resend } from "resend";
import en from "../../messages/en.json";
import ne from "../../messages/ne.json";
import type { Locale } from "@/i18n/locales";

const messages = { en, ne } as const;

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

export async function sendVerificationEmail(
  email: string,
  code: string,
  locale: Locale,
): Promise<void> {
  const m = messages[locale].email;
  const subject = m.subject;
  const text = m.body.replace("{code}", code);
  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  await getResend().emails.send({
    from,
    to: email,
    subject,
    text,
  });
}

export async function addToAudience(email: string): Promise<void> {
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    console.warn("RESEND_AUDIENCE_ID not set; skipping audience subscribe");
    return;
  }
  await getResend().contacts.create({
    audienceId,
    email,
    unsubscribed: false,
  });
}
