"use client";
/**
 * LessonShell — the focused three-zone lesson layout.
 *   outline: course/unit lesson navigation, in a drawer (kept off the page so
 *            the lesson has the room)
 *   center : the lesson
 *   right  : AI tutor + related skills (inline and collapsible from 2xl,
 *            a drawer below)
 * Server-rendered pieces come in as props; this component only owns the
 * open/closed state and the tutor's suggested prompts, which lesson blocks
 * (tutor_prompt chips) can set through useLessonUI().
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { ListTree, PanelRightClose, PanelRightOpen, Sparkles } from "lucide-react";
import { TutorPanel } from "@/components/tutor/TutorPanel";
import type { TutorPanelProps } from "@/components/tutor/types";
import { Button, Drawer } from "@/components/ui";
import { cn } from "@/lib/cn";

interface LessonUI {
  /** Open the tutor panel, optionally with suggested prompts (first = the one tapped). */
  openTutor: (prompts?: string[]) => void;
  tutorAvailable: boolean;
}

const LessonUIContext = createContext<LessonUI>({ openTutor: () => {}, tutorAvailable: false });

export const useLessonUI = () => useContext(LessonUIContext);

const WIDE = "(min-width: 96rem)"; // Tailwind 2xl: the right panel is inline

export interface LessonShellProps {
  nav: ReactNode;
  /** Related skills etc., shown under the tutor in the right panel. */
  aside: ReactNode;
  tutor: Omit<TutorPanelProps, "compact">;
  children: ReactNode;
}

export function LessonShell({ nav, aside, tutor, children }: LessonShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [asideDrawer, setAsideDrawer] = useState(false);
  const [asideCollapsed, setAsideCollapsed] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | undefined>(tutor.suggestions);
  const asideRef = useRef<HTMLElement>(null);
  const tutorAvailable = tutor.availability.status === "available";

  const openTutor = useCallback((prompts?: string[]) => {
    if (prompts?.length) setSuggestions(prompts);
    if (typeof window !== "undefined" && window.matchMedia(WIDE).matches) {
      setAsideCollapsed(false);
      requestAnimationFrame(() => {
        asideRef.current?.scrollIntoView({ block: "nearest" });
        asideRef.current?.querySelector<HTMLElement>("textarea, input, button")?.focus();
      });
    } else setAsideDrawer(true);
  }, []);

  const ui = useMemo(() => ({ openTutor, tutorAvailable }), [openTutor, tutorAvailable]);

  const asideContent = (compact: boolean) => (
    <div className="space-y-6">
      <section aria-label="AI tutor">
        <TutorPanel context={tutor.context} availability={tutor.availability} suggestions={suggestions} compact={compact} />
      </section>
      {aside}
    </div>
  );

  return (
    <LessonUIContext.Provider value={ui}>
      <div className={cn(!asideCollapsed && "2xl:grid 2xl:grid-cols-[minmax(0,1fr)_18rem] 2xl:gap-10")}>
        <div className="mx-auto min-w-0 max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 empty:hidden">
            <Button variant="secondary" size="sm" icon={<ListTree aria-hidden="true" className="size-4" />} onClick={() => setNavOpen(true)}>
              Course outline
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className={cn(!asideCollapsed && "2xl:hidden")}
              icon={asideCollapsed ? <PanelRightOpen aria-hidden="true" className="size-4" /> : <Sparkles aria-hidden="true" className="size-4" />}
              onClick={() => {
                if (window.matchMedia(WIDE).matches) setAsideCollapsed(false);
                else setAsideDrawer(true);
              }}
            >
              Tutor
            </Button>
          </div>
          {children}
        </div>

        {!asideCollapsed ? (
          <aside ref={asideRef} aria-label="Tutor and related skills" className="hidden 2xl:block">
            <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pb-6 pl-1">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Help &amp; context</h2>
                <Button variant="ghost" size="sm" onClick={() => setAsideCollapsed(true)} icon={<PanelRightClose aria-hidden="true" className="size-4" />}>
                  Hide
                </Button>
              </div>
              {asideContent(true)}
            </div>
          </aside>
        ) : null}
      </div>

      <Drawer open={navOpen} onClose={() => setNavOpen(false)} title="Course outline">
        <div onClick={(e) => (e.target as HTMLElement).closest("a") && setNavOpen(false)}>{nav}</div>
      </Drawer>
      <Drawer open={asideDrawer} onClose={() => setAsideDrawer(false)} title="Tutor & related skills">
        {asideDrawer ? asideContent(true) : null}
      </Drawer>
    </LessonUIContext.Provider>
  );
}
