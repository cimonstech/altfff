import { MESSAGE_TYPES } from "@/lib/messageLog";

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  [MESSAGE_TYPES.visitorRegistrationConfirmation]: "Visitor registration confirmation",
  [MESSAGE_TYPES.visitorRegistrationInternal]: "Visitor registration (internal alert)",
  [MESSAGE_TYPES.exhibitorApplicationConfirmation]: "Exhibitor application confirmation",
  [MESSAGE_TYPES.exhibitorApplicationInternal]: "Exhibitor application (internal alert)",
  [MESSAGE_TYPES.sponsorInquiryConfirmation]: "Sponsor inquiry confirmation",
  [MESSAGE_TYPES.sponsorInquiryInternal]: "Sponsor inquiry (internal alert)",
  [MESSAGE_TYPES.contactInternal]: "Contact form (internal alert)",
  [MESSAGE_TYPES.walkInConfirmationEmail]: "Walk-in confirmation email",
  [MESSAGE_TYPES.walkInConfirmationSms]: "Walk-in confirmation SMS",
  [MESSAGE_TYPES.visitorApprovalQr]: "Visitor approval QR email",
  [MESSAGE_TYPES.visitorDeclined]: "Visitor declined email",
  [MESSAGE_TYPES.visitorConfirmationResend]: "Visitor confirmation resend",
  [MESSAGE_TYPES.bulkConfirmationResend]: "Bulk confirmation resend",
  [MESSAGE_TYPES.bulkCommunicationEmail]: "Bulk communication (email)",
  [MESSAGE_TYPES.bulkCommunicationSms]: "Bulk communication (SMS)",
  [MESSAGE_TYPES.checkInWelcomeSms]: "Check-in welcome SMS",
};

export const MESSAGE_TYPE_OPTIONS = Object.entries(MESSAGE_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function formatMessageType(value: string): string {
  return MESSAGE_TYPE_LABELS[value] ?? value.replace(/_/g, " ");
}

export function formatMessageStatus(value: string): string {
  if (value === "quota_exceeded") return "Quota exceeded";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatMessageChannel(value: string): string {
  return value.toUpperCase();
}
