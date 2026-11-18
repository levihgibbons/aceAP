"use client";
/**
 * OfflineNotice — a small fixed banner while navigator.onLine is false.
 * Mounted once in the root layout.
 */
import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function OfflineNotice() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-2 z-[65] flex justify-center px-4">
      {!online ? (
        <p className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-line bg-ink px-3.5 py-1.5 text-[0.8125rem] font-medium text-canvas shadow-overlay">
          <WifiOff aria-hidden="true" className="size-4" />
          You&apos;re offline. Answers can&apos;t be submitted until you reconnect.
        </p>
      ) : null}
    </div>
  );
}
