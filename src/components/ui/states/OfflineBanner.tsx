"use client";

import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Slim connectivity banner — prioritised for /admin/checkin but safe to
 * mount globally in the admin shell.
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowReconnected(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setShowReconnected(true);
    const t = setTimeout(() => setShowReconnected(false), 3000);
    return () => clearTimeout(t);
  }, [online]);

  if (online && !showReconnected) return null;

  return (
    <div
      role="status"
      className={`border-b px-4 py-2 text-center text-sm font-semibold ${
        online ? "border-forest/30 bg-forest/10 text-forest" : "border-madder/30 bg-madder/10 text-madder"
      }`}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {!online && <WifiOff className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />}
        {online ? "Back online" : "You are offline — scans and saves may fail until connectivity returns."}
      </span>
    </div>
  );
}
