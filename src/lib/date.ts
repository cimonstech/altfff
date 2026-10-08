/** en-GB style date formatting ("17 September 2026"), used consistently
 * anywhere a date is shown to visitors (news cards, article pages). */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}


