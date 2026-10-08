import { NextResponse } from "next/server";
import { EMAIL_DOMAIN_INVALID_MESSAGE, verifyEmailDomainAcceptsMail } from "@/lib/emailDomainValidation";

/**
 * Returns a 400 response when the email domain has no MX records, or null
 * when the address is acceptable (including fail-open infrastructure errors).
 */
export async function emailDomainValidationResponse(
  email: string,
): Promise<NextResponse | null> {
  const check = await verifyEmailDomainAcceptsMail(email);
  if (check.ok) return null;

  return NextResponse.json(
    {
      ok: false,
      error: check.message ?? EMAIL_DOMAIN_INVALID_MESSAGE,
      fieldErrors: { email: check.message ?? EMAIL_DOMAIN_INVALID_MESSAGE },
    },
    { status: 400 },
  );
}
