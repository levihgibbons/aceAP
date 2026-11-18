"use client";
/**
 * Toasts — brief, non-blocking confirmations announced politely.
 * The <Toaster /> is already mounted once in the root layout; from any Client
 * Component:
 *   const { toast } = useToast();
 *   toast({ title: "Saved", description: "Your answer was recorded.", tone: "good" });
 * Don't use toasts for errors the user must act on — show those inline.
 */
import { useSyncExternalStore } from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone = "neutral" | "good" | "warn" | "bad" | "info";

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss (default 5000; 0 keeps it until closed). */
  duration?: number;
}

interface ToastRecord extends Required<Omit<ToastInput, "description">> {
  id: number;
  description?: string;
}

let toasts: ToastRecord[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const EMPTY: ToastRecord[] = [];

function emit() {
  for (const l of listeners) l();
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(input: ToastInput): number {
  const id = nextId++;
  const record: ToastRecord = { id, title: input.title, description: input.description, tone: input.tone ?? "neutral", duration: input.duration ?? 5000 };
  toasts = [...toasts.slice(-3), record];
  emit();
  if (record.duration > 0) setTimeout(() => dismissToast(id), record.duration);
  return id;
}

const api = { toast, dismiss: dismissToast };

export function useToast() {
  return api;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const ICON = {
  neutral: Info,
  info: Info,
  good: CheckCircle2,
  warn: TriangleAlert,
  bad: XCircle,
} as const;

const ICON_TONE: Record<ToastTone, string> = {
  neutral: "text-muted",
  info: "text-info",
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
};

export function Toaster() {
  const items = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY,
  );
  return (
    <div
      role="status"
      aria-live="polite"
      aria-relevant="additions text"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6 lg:bottom-6"
    >
      {items.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-xl border border-line bg-surface p-3.5 pr-2 shadow-overlay"
          >
            <Icon aria-hidden="true" className={cn("mt-0.5 size-4.5 shrink-0", ICON_TONE[t.tone])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{t.title}</p>
              {t.description ? <p className="mt-0.5 text-[0.8125rem] text-muted">{t.description}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
              className="-my-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-faint hover:bg-sunken hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
