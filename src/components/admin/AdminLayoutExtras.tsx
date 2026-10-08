"use client";

import OfflineBanner from "@/components/ui/states/OfflineBanner";

/** Client-only extras mounted once in the admin dashboard shell. */
export default function AdminLayoutExtras() {
  return <OfflineBanner />;
}
