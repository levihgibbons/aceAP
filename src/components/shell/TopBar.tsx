/**
 * TopBar — sticky header inside the shell: logo (below lg), global search
 * (student area), theme toggle and the user menu. Rendered by AppShell.
 */
import Link from "next/link";
import type { SessionUser } from "@/modules/auth/service";
import { GlobalSearchBox } from "./GlobalSearchBox";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { AREA_LABEL, type ShellArea } from "./nav";

export function TopBar({ user, area, homeHref }: { user: SessionUser; area: ShellArea; homeHref: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Link href={homeHref} className="shrink-0 rounded-lg lg:hidden" aria-label="AceAP home">
          <Logo showWordmark={false} className="sm:hidden" />
          <Logo className="hidden sm:inline-flex" />
        </Link>
        {area === "student" ? (
          <GlobalSearchBox className="min-w-0 flex-1" />
        ) : (
          <p className="hidden min-w-0 flex-1 truncate text-sm font-medium text-muted lg:block">{AREA_LABEL[area]}</p>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ThemeToggle className="hidden sm:inline-flex" />
          <UserMenu name={user.name} email={user.email} role={user.role} isDemo={user.isDemo} />
        </div>
      </div>
    </header>
  );
}
