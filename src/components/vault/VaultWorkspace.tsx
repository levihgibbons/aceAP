"use client";
/**
 * Three-pane vault layout: sidebar (search, filters, notes) · open note ·
 * connections. On large screens all three show side by side (the side panes
 * can be hidden for focus); on small screens each side pane is a toggle.
 */
import { useState, type ReactNode } from "react";
import { Network, PanelLeft, PanelRight } from "lucide-react";
import { cn } from "@/lib/cn";

export interface VaultWorkspaceProps {
  sidebar: ReactNode;
  main: ReactNode;
  aside: ReactNode;
  /** Whether a note is open (decides which pane small screens show first). */
  hasNote: boolean;
  noteCount: number;
}

export function VaultWorkspace({ sidebar, main, aside, hasNote, noteCount }: VaultWorkspaceProps) {
  const [showSidebar, setShowSidebar] = useState(!hasNote);
  const [showAside, setShowAside] = useState(false);
  const [desktopSidebar, setDesktopSidebar] = useState(true);
  const [desktopAside, setDesktopAside] = useState(true);

  const toggle =
    "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[0.8125rem] font-medium text-ink-2 shadow-card hover:bg-surface-2";

  return (
    <div>
      {/* Small screens: pane toggles */}
      <div className="mb-3 flex flex-wrap gap-2 lg:hidden">
        <button
          type="button"
          aria-expanded={showSidebar}
          aria-controls="vault-sidebar"
          onClick={() => setShowSidebar((v) => !v)}
          className={toggle}
        >
          <PanelLeft aria-hidden="true" className="size-4" />
          {showSidebar ? "Hide notes" : `Notes (${noteCount})`}
        </button>
        <button
          type="button"
          aria-expanded={showAside}
          aria-controls="vault-aside"
          onClick={() => setShowAside((v) => !v)}
          className={toggle}
        >
          <Network aria-hidden="true" className="size-4" />
          {hasNote
            ? showAside
              ? "Hide connections"
              : "Connections"
            : showAside
              ? "Hide recent changes"
              : "Recent changes"}
        </button>
      </div>
      {/* Large screens: focus toggles */}
      <div className="mb-3 hidden justify-end gap-2 lg:flex">
        <button
          type="button"
          aria-expanded={desktopSidebar}
          aria-controls="vault-sidebar"
          onClick={() => setDesktopSidebar((v) => !v)}
          className={toggle}
        >
          <PanelLeft aria-hidden="true" className="size-4" />
          {desktopSidebar ? "Hide sidebar" : "Show sidebar"}
        </button>
        <button
          type="button"
          aria-expanded={desktopAside}
          aria-controls="vault-aside"
          onClick={() => setDesktopAside((v) => !v)}
          className={toggle}
        >
          <PanelRight aria-hidden="true" className="size-4" />
          {desktopAside ? "Hide connections" : "Show connections"}
        </button>
      </div>

      <div
        className={cn(
          "grid gap-5",
          desktopSidebar &&
            desktopAside &&
            "lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_16rem]",
          desktopSidebar && !desktopAside && "lg:grid-cols-[15rem_minmax(0,1fr)]",
          !desktopSidebar &&
            desktopAside &&
            "lg:grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_16rem]",
        )}
      >
        <nav
          id="vault-sidebar"
          aria-label="Vault notes"
          className={cn(
            "min-w-0",
            showSidebar ? "block" : "hidden",
            desktopSidebar ? "lg:block" : "lg:hidden",
            "lg:row-span-2 xl:row-span-1",
          )}
        >
          {sidebar}
        </nav>
        <div className="min-w-0">{main}</div>
        <aside
          id="vault-aside"
          aria-label="Connections"
          className={cn(
            "min-w-0",
            showAside ? "block" : "hidden",
            desktopAside ? "lg:block" : "lg:hidden",
            desktopSidebar && "lg:col-start-2 xl:col-start-auto",
          )}
        >
          {aside}
        </aside>
      </div>
    </div>
  );
}
