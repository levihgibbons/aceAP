"use client";
/**
 * Tracks the furthest lesson block the student has reached (a block counts
 * once its top passes 60% of the viewport) and saves it, debounced, so they
 * resume where they stopped. On return it scrolls to the saved block and
 * shows a "Resume where you left off" notice. Engagement only — never mastery.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowUp, BookmarkCheck, X } from "lucide-react";
import { sendOnUnload } from "@/components/activity/interaction";

const SAVE_DEBOUNCE_MS = 1_500;

export function LessonProgressTracker({ lessonId, containerId, initialFurthest, resumeAt }: { lessonId: string; containerId: string; initialFurthest: number; resumeAt: number | null }) {
  const [notice, setNotice] = useState(resumeAt !== null);
  const furthest = useRef(initialFurthest);
  const saved = useRef(initialFurthest);

  // Resume: scroll the saved block into view once the page has laid out.
  useEffect(() => {
    if (resumeAt === null) return;
    const timer = window.setTimeout(() => {
      document.getElementById(containerId)?.querySelector<HTMLElement>(`[data-lesson-block="${resumeAt}"]`)?.scrollIntoView({ block: "start" });
    }, 60);
    const hide = window.setTimeout(() => setNotice(false), 12_000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(hide);
    };
  }, [containerId, resumeAt]);

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;
    let timer: number | null = null;
    const url = `/api/lessons/${encodeURIComponent(lessonId)}/progress`;

    const save = () => {
      timer = null;
      const value = furthest.current;
      if (value <= saved.current) return;
      void fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ furthestBlock: value }) })
        .then((res) => {
          if (res.ok) saved.current = Math.max(saved.current, value);
        })
        .catch(() => {});
    };

    const observer = new IntersectionObserver(
      (entries) => {
        let changed = false;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.lessonBlock);
          if (Number.isFinite(index) && index > furthest.current) {
            furthest.current = index;
            changed = true;
          }
        }
        if (changed) {
          if (timer) window.clearTimeout(timer);
          timer = window.setTimeout(save, SAVE_DEBOUNCE_MS);
        }
      },
      { rootMargin: "0px 0px -40% 0px", threshold: 0 },
    );
    container.querySelectorAll<HTMLElement>("[data-lesson-block]").forEach((el) => observer.observe(el));

    const flushOnLeave = () => {
      if (furthest.current > saved.current) {
        sendOnUnload(url, { furthestBlock: furthest.current });
        saved.current = furthest.current;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushOnLeave();
    };
    window.addEventListener("pagehide", flushOnLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("pagehide", flushOnLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      flushOnLeave();
    };
  }, [containerId, lessonId]);

  if (!notice) return null;
  return (
    <div
      role="status"
      className="fixed bottom-24 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-overlay animate-rise lg:bottom-6"
    >
      <BookmarkCheck aria-hidden="true" className="size-4.5 shrink-0 text-accent" />
      <p className="min-w-0 flex-1 text-ink">
        <span className="font-medium">Resume where you left off.</span> <span className="text-muted">We scrolled to your last place.</span>
      </p>
      <button
        type="button"
        onClick={() => {
          window.scrollTo({ top: 0 });
          setNotice(false);
        }}
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft"
      >
        <ArrowUp aria-hidden="true" className="size-3.5" />
        Start from the top
      </button>
      <button type="button" onClick={() => setNotice(false)} aria-label="Dismiss" className="-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink">
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
