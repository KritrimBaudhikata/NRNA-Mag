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

/** Segment ID (new) or legacy Audience ID from the Resend dashboard. */
function getMailingListSegmentId(): string | undefined {
  return (
    process.env.RESEND_SEGMENT_ID?.trim() ||
    process.env.RESEND_AUDIENCE_ID?.trim() ||
    undefined
  );
}

function isSendOnlyKeyError(message: string): boolean {
  return message.toLowerCase().includes("restricted to only send");
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

  const { error } = await getResend().emails.send({
    from,
    to: email,
    subject,
    text,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}

/**
 * Adds verified email to the Resend segment. Does not throw — download still succeeds
 * if the API key is send-only or contacts API fails.
 */
export async function addToAudience(email: string): Promise<void> {
  const segmentId = getMailingListSegmentId();
  if (!segmentId) {
    console.warn(
      "RESEND_SEGMENT_ID / RESEND_AUDIENCE_ID not set; skipping mailing list",
    );
    return;
  }

  const resend = getResend();

  const withSegment = await resend.contacts.create({
    email,
    unsubscribed: false,
    segments: [{ id: segmentId }],
  });

  if (!withSegment.error) return;

  if (isSendOnlyKeyError(withSegment.error.message)) {
    console.warn(
      "Resend mailing list skipped: API key is send-only. " +
        "Create a Full access key at resend.com/api-keys to add contacts to segments.",
    );
    return;
  }

  const legacyAudience = await resend.contacts.create({
    audienceId: segmentId,
    email,
    unsubscribed: false,
  });

  if (!legacyAudience.error) return;

  if (isSendOnlyKeyError(legacyAudience.error.message)) {
    console.warn(
      "Resend mailing list skipped: API key is send-only. " +
        "Create a Full access key at resend.com/api-keys to add contacts to segments.",
    );
    return;
  }

  const added = await resend.contacts.segments.add({
    email,
    segmentId,
  });

  if (added.error) {
    if (isSendOnlyKeyError(added.error.message)) {
      console.warn(
        "Resend mailing list skipped: API key is send-only. " +
          "Create a Full access key at resend.com/api-keys to add contacts to segments.",
      );
      return;
    }
    console.error(
      "Resend mailing list failed:",
      added.error.message,
      `(create: ${withSegment.error.message})`,
    );
  }
}
