/**
 * SERVER-ONLY. Uses FISH_AFRICA_APP_SECRET (a real credential) - only ever
 * import this from Route Handlers, never from a client component.
 *
 * TEMPORARY: FISH_AFRICA_APP_ID / FISH_AFRICA_APP_SECRET / FISH_AFRICA_SENDER_ID
 * are borrowed AgroTalentHub credentials/sender ID for build and testing.
 * Replace with Alt.FFF's own registered credentials in the environment once
 * available, no code change needed when that happens.
 */
const FISH_AFRICA_ENDPOINT = "https://api.letsfish.africa/v1/sms";
const RETRY_DELAY_MS = 800;
const FISH_AFRICA_TIMEOUT_MS = 8_000;

type FishAfricaRecipientResult = {
  status?: string;
};

type FishAfricaResponse = {
  data?: FishAfricaRecipientResult[];
};

const GHANA_LOCAL_DIGIT_COUNT = 9; // digits remaining after stripping the leading 0

/**
 * Normalizes a submitted phone number for the Fish Africa API.
 *
 * Deliberately conservative given Alt.FFF's international audience (54
 * countries): only converts a number to Ghana's 233 country code when it
 * unambiguously looks like a local Ghanaian number (leading 0 + exactly 9
 * more digits). Blindly prepending 233 to any number starting with 0 -
 * as the reference implementation does - corrupts real international
 * numbers that happen to start with a 0 trunk prefix in their own country.
 * Anything that doesn't match a known shape is left exactly as submitted.
 */
export function formatPhoneForSms(rawPhone: string): string {
  const stripped = rawPhone.replace(/[\s-]/g, "");

  if (stripped.startsWith("+")) return stripped.slice(1);
  if (stripped.startsWith("00")) return stripped.slice(2);
  if (stripped.startsWith("0") && stripped.length === 1 + GHANA_LOCAL_DIGIT_COUNT) {
    return `233${stripped.slice(1)}`;
  }
  return stripped;
}

function isSuccessStatus(status: unknown): boolean {
  return status === "queued" || status === "sent";
}

async function callFishAfrica(
  phone: string,
  message: string,
  campaignName: string,
): Promise<{ ok: boolean; retryable: boolean; error?: string }> {
  const appId = process.env.FISH_AFRICA_APP_ID;
  const appSecret = process.env.FISH_AFRICA_APP_SECRET;
  const senderId = process.env.FISH_AFRICA_SENDER_ID;

  if (!appId || !appSecret || !senderId) {
    return { ok: false, retryable: false, error: "Fish Africa SMS credentials are not configured." };
  }

  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FISH_AFRICA_TIMEOUT_MS);
  try {
    response = await fetch(FISH_AFRICA_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${appId}.${appSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        campaign_name: campaignName,
        sender_id: senderId,
        message,
        recipients: [phone],
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, retryable: true, error: "Fish Africa SMS request timed out." };
    }
    return { ok: false, retryable: true, error: err instanceof Error ? err.message : "Network error." };
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status >= 500) {
    return { ok: false, retryable: true, error: `Fish Africa returned ${response.status}.` };
  }
  if (!response.ok) {
    return { ok: false, retryable: false, error: `Fish Africa returned ${response.status}.` };
  }

  let payload: FishAfricaResponse;
  try {
    payload = await response.json();
  } catch {
    // A 200 that doesn't even parse as JSON is not a success - this is the
    // exact class of bug flagged in the reference implementation ("the HTTP
    // call didn't throw" treated as success on its own).
    return { ok: false, retryable: false, error: "Fish Africa returned an unparseable response." };
  }

  const result = payload.data?.[0];
  if (!result || !isSuccessStatus(result.status)) {
    return {
      ok: false,
      retryable: false,
      error: `Fish Africa reported status "${result?.status ?? "missing"}".`,
    };
  }

  return { ok: true, retryable: false };
}

/**
 * Sends a single SMS via Fish Africa. One retry on network error or a 5xx
 * response - a deliberate improvement over the reference implementation
 * (zero retries), justified because this now carries real paid-exhibitor
 * and sponsor communications, not just fire-and-forget notifications.
 */
/** First token of a full name — what door SMS should use for {{name}}. */
export function firstNameForSms(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? "";
}

/** Shared walk-in + pre-registered check-in SMS. Uses first name only. */
export function buildDoorWelcomeSms(fullName: string | null | undefined): string {
  const first = firstNameForSms(fullName);
  const welcome = first ? `Welcome ${first}!` : "Welcome!";
  return `${welcome} 🎉 You're officially checked in. Explore our curated experience zones and join the conversation online #AltFFF2026.`;
}

export async function sendSms(
  phone: string,
  message: string,
  campaignName: string,
): Promise<{ success: boolean; error?: string }> {
  const formattedPhone = formatPhoneForSms(phone);

  const first = await callFishAfrica(formattedPhone, message, campaignName);
  if (first.ok) return { success: true };
  if (!first.retryable) return { success: false, error: first.error };

  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  const second = await callFishAfrica(formattedPhone, message, campaignName);
  return second.ok ? { success: true } : { success: false, error: second.error };
}
