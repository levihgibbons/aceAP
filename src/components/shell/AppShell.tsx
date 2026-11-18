/**
 * AppShell — the signed-in frame for /app, /teacher and /admin.
 *   const user = await requireStudent();
 *   return <AppShell user={user} area="student">{children}</AppShell>;
 *
 * Provides: skip link, desktop sidebar (collapsible), sticky top bar, mobile
 * bottom nav, demo banner, and a <main id="main"> whose inner container is
 * already width-limited (max-w-6xl) and padded. Pages should render
 * <PageHeader> first and then their content — no outer padding/max-width.
 */
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import type { SessionUser } from "@/modules/auth/service";
import { DemoBanner } from "./DemoBanner";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { SIDEBAR_COOKIE, type ShellArea, type ShellCourse } from "./nav";

const HOME: Record<ShellArea, string> = { student: "/app", staff: "/teacher", admin: "/admin" };

export async function AppShell({
  user,
  area,
  courses,
  children,
}: {
  user: SessionUser;
  area: ShellArea;
  /** Student area: the courses listed under the navigation. */
  courses?: ShellCourse[];
  children: ReactNode;
}) {
  const jar = await cookies();
  const collapsed = jar.get(SIDEBAR_COOKIE)?.value === "collapsed";
  const isPlatformAdmin = user.role === "platform_admin";
  const homeHref = HOME[area];

  return (
    <div className="flex min-h-dvh w-full">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-ink focus:shadow-overlay"
      >
        Skip to content
      </a>
      <Sidebar area={area} isPlatformAdmin={isPlatformAdmin} defaultCollapsed={collapsed} homeHref={homeHref} courses={courses} />
      <div className="flex min-w-0 flex-1 flex-col">
        {user.isDemo ? <DemoBanner /> : null}
        <TopBar user={user} area={area} homeHref={homeHref} />
        <main id="main" tabIndex={-1} className="flex-1 pb-24 focus:outline-none lg:pb-0">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div>
        </main>
      </div>
      <MobileNav area={area} isPlatformAdmin={isPlatformAdmin} courses={courses} />
    </div>
  );
}
