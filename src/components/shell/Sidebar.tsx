"use client";
/**
 * Sidebar — desktop (lg+) navigation. Collapsible to an icon rail; the choice
 * is stored in a cookie so the server renders the right width (no flash).
 * Rendered by AppShell; not used directly by pages.
 */
import Link from "next/link";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import { LogoMark } from "./Logo";
import { NavLinks } from "./NavLinks";
import { AREA_LABEL, SIDEBAR_COOKIE, navFor, type ShellArea } from "./nav";

export function Sidebar({
  area,
  isPlatformAdmin,
  defaultCollapsed,
  homeHref,
}: {
  area: ShellArea;
  isPlatformAdmin: boolean;
  defaultCollapsed: boolean;
  homeHref: string;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const { primary, secondary } = navFor(area, { isPlatformAdmin });

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; SameSite=Lax`;
  };

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex",
        collapsed ? "w-[4.25rem]" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center border-b border-line", collapsed ? "justify-center px-2" : "px-4")}>
        <Link href={homeHref} className="inline-flex items-center gap-2.5 rounded-lg" aria-label="AceAP home">
          <LogoMark className="size-7" />
          {!collapsed ? (
            <span className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
              Ace<span className="text-accent">AP</span>
            </span>
          ) : null}
        </Link>
      </div>

      <nav aria-label={`${AREA_LABEL[area]} navigation`} className="flex-1 overflow-y-auto px-2.5 py-4">
        {!collapsed ? (
          <p className="mb-2 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-faint">{AREA_LABEL[area]}</p>
        ) : null}
        <NavLinks items={primary} collapsed={collapsed} />
        {secondary.length > 0 ? (
          <>
            <div className="mx-3 my-4 h-px bg-line" />
            <NavLinks items={secondary} collapsed={collapsed} />
          </>
        ) : null}
      </nav>

      <div className={cn("border-t border-line p-2.5", collapsed && "flex justify-center")}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "inline-flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-sunken hover:text-ink",
            collapsed ? "w-10 justify-center px-0" : "w-full",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" className="size-[1.1rem]" />
          ) : (
            <>
              <PanelLeftClose aria-hidden="true" className="size-[1.1rem]" />
              Collapse
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
