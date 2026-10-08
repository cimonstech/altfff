import { createClient } from "@/lib/supabase/server";
import { canUpdatePublicFormsToggle } from "@/lib/publicFormsAuth";
import PublicFormsToggle from "@/components/admin/PublicFormsToggle";

/** Renders the toggle only for the one account allowed to manage it. */
export default async function PublicFormsToggleGate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!(await canUpdatePublicFormsToggle(user?.id))) return null;

  return (
    <div className="mt-8">
      <PublicFormsToggle />
    </div>
  );
}
