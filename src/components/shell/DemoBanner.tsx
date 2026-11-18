"use client";
/**
 * DemoBanner — slim notice shown to demo accounts. Dismissible for the
 * browser session (sessionStorage, try/catch). Rendered by AppShell when
 * user.isDemo is true.
 */
import { useSyncExternalStore } from "react";
import { Info, X } from "lucide-react";

const KEY = "aceap-demo-banner-dismissed";
const EVENT = "aceap:demo-banner";

function read(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

let dismissedInMemory = false;

export function DemoBanner() {
  const dismissed = useSyncExternalStore(subscribe, () => dismissedInMemory || read(), () => false);
  if (dismissed) return null;

  const dismiss = () => {
    dismissedInMemory = true;
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      // Storage unavailable: stays dismissed until reload.
    }
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    // A labelled <section> (region landmark) so the notice isn't content outside every landmark.
    <section aria-label="Demo account notice" className="border-b border-line bg-warn-soft text-warn">
      <div className="flex items-center gap-2 px-4 py-1.5 text-[0.8125rem] font-medium sm:px-6 lg:px-10">
        <Info aria-hidden="true" className="size-4 shrink-0" />
        <p className="min-w-0 flex-1">Demo account — all people and data here are fictional.</p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss demo notice"
          className="-my-1 -mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md hover:bg-surface/60"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </section>
  );
}
