"use client";
/**
 * Tabs — in-page tabs with the WAI-ARIA tabs pattern (roving tabindex,
 * ←/→/Home/End, automatic activation). For URL-driven tabs use TabLinks.
 *   <Tabs label="Lesson views" tabs={[
 *     { id: "explain", label: "Explanation", content: <Markdown>{md}</Markdown> },
 *     { id: "example", label: "Worked example", content: <Example /> },
 *   ]} defaultTab="explain" />
 * Panel content can be server-rendered and passed in as props.
 */
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  /** Accessible name for the tab list. */
  label?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, defaultTab, label, onChange, className }: TabsProps) {
  const baseId = useId();
  const [selected, setSelected] = useState(() => (tabs.some((t) => t.id === defaultTab) ? defaultTab! : tabs[0]?.id));
  const buttons = useRef<Map<string, HTMLButtonElement>>(new Map());
  const current = tabs.some((t) => t.id === selected) ? selected : tabs[0]?.id;

  const select = (id: string, focus = false) => {
    setSelected(id);
    onChange?.(id);
    if (focus) buttons.current.get(id)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((t) => t.id === current);
    if (index < 0) return;
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next >= 0) {
      e.preventDefault();
      select(tabs[next].id, true);
    }
  };

  return (
    <div className={className}>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex min-w-max gap-1 border-b border-line">
          {tabs.map((tab) => {
            const active = tab.id === current;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  if (el) buttons.current.set(tab.id, el);
                  else buttons.current.delete(tab.id);
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`${baseId}-panel-${tab.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => select(tab.id)}
                className={cn(
                  "-mb-px inline-flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
                  active ? "border-accent text-ink" : "border-transparent text-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== current}
          tabIndex={0}
          className="pt-5 focus-visible:outline-offset-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
