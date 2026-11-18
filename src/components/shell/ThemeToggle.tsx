"use client";
/**
 * ThemeToggle — icon button that switches light/dark and remembers the choice
 * (localStorage, try/catch). Also exports useTheme() for other client code.
 *   <ThemeToggle />
 */
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { readTheme, subscribeTheme, toggleTheme, type Theme } from "./theme";

export function useTheme(): Theme | null {
  return useSyncExternalStore(subscribeTheme, readTheme, () => null);
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const label = theme === "dark" ? "Switch to light theme" : theme === "light" ? "Switch to dark theme" : "Switch theme";
  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink",
        className,
      )}
    >
      {theme === "dark" ? <Sun aria-hidden="true" className="size-4.5" /> : <Moon aria-hidden="true" className="size-4.5" />}
    </button>
  );
}
