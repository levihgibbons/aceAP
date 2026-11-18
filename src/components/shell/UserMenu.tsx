"use client";
/**
 * UserMenu — avatar button in the top bar opening a small panel with the
 * user's name and role, "Account settings", "Switch theme" and "Sign out" (a server-action form).
 * Uses the native popover API: Esc and outside clicks close it.
 */
import { useId } from "react";
import Link from "next/link";
import { LogOut, Moon, Settings, Sun } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import type { UserRole } from "@/db/schema";
import { useTheme } from "./ThemeToggle";
import { toggleTheme } from "./theme";

const ROLE_LABEL: Record<UserRole, string> = {
  student: "Student",
  teacher: "Teacher",
  school_admin: "School admin",
  platform_admin: "Platform admin",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

export function UserMenu({ name, email, role, isDemo }: { name: string; email: string; role: UserRole; isDemo: boolean }) {
  const id = useId();
  const popoverId = `${id}-user-menu`;
  const theme = useTheme();

  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        aria-haspopup="true"
        aria-label={`Account menu for ${name}`}
        className="inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-sunken"
      >
        {/* The initials are an avatar picture, not a text label: drawn with CSS
            content so the button's name ("Account menu for …") doesn't fail
            WCAG 2.5.3 Label in Name against visible text it doesn't contain. */}
        <span
          aria-hidden="true"
          data-initials={initials(name)}
          className="inline-flex size-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink ring-1 ring-line before:content-[attr(data-initials)]"
        />
      </button>
      <div
        id={popoverId}
        popover="auto"
        aria-label="Account"
        className="fixed inset-auto right-3 top-14 m-0 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-line bg-surface p-0 text-ink shadow-overlay sm:right-5"
      >
        <div className="border-b border-line px-4 py-3.5">
          <p className="truncate text-sm font-semibold text-ink">{name}</p>
          <p className="truncate text-xs text-muted">{email}</p>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded-md bg-sunken px-1.5 py-0.5 font-medium text-ink-2">{ROLE_LABEL[role]}</span>
            {isDemo ? <span className="rounded-md bg-warn-soft px-1.5 py-0.5 font-medium text-warn">Demo account</span> : null}
          </p>
        </div>
        <div className="p-1.5">
          <Link
            href={role === "student" ? "/app/settings" : "/teacher/settings"}
            onClick={(e) => e.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover()}
            className="flex min-h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm text-ink-2 hover:bg-sunken hover:text-ink"
          >
            <Settings aria-hidden="true" className="size-4 text-muted" />
            Account settings
          </Link>
          <button
            type="button"
            onClick={() => toggleTheme()}
            className="flex min-h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm text-ink-2 hover:bg-sunken hover:text-ink"
          >
            {theme === "dark" ? (
              <Sun aria-hidden="true" className="size-4 text-muted" />
            ) : (
              <Moon aria-hidden="true" className="size-4 text-muted" />
            )}
            Switch theme
            <span className="ml-auto text-xs text-faint">{theme === "dark" ? "Dark" : theme === "light" ? "Light" : ""}</span>
          </button>
          <form action={signOut}>
            <button
              type="submit"
              className="flex min-h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm text-ink-2 hover:bg-sunken hover:text-ink"
            >
              <LogOut aria-hidden="true" className="size-4 text-muted" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
