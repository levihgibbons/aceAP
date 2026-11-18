"use client";
/**
 * MobileNav — bottom tab bar below lg. Shows up to five destinations; when
 * an area has more, the last slot is "More", which opens a Drawer with the
 * full navigation. Rendered by AppShell.
 */
import { useState } from "react";
import { Menu } from "lucide-react";
import { Drawer } from "@/components/ui/Dialog";
import { BottomNavLink, NavLinks } from "./NavLinks";
import { CourseLinks } from "./CourseLinks";
import { AREA_LABEL, navFor, type ShellArea, type ShellCourse } from "./nav";

export function MobileNav({ area, isPlatformAdmin, courses = [] }: { area: ShellArea; isPlatformAdmin: boolean; courses?: ShellCourse[] }) {
  const [open, setOpen] = useState(false);
  const { primary, secondary } = navFor(area, { isPlatformAdmin });
  const all = [...primary, ...secondary];
  const needsMore = all.length > 5;
  const shown = needsMore ? all.slice(0, 4) : all;

  return (
    <>
      <nav
        aria-label={`${AREA_LABEL[area]} navigation`}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex max-w-xl">
          {shown.map((item) => (
            <li key={item.href} className="flex min-w-0 flex-1">
              <BottomNavLink item={item} />
            </li>
          ))}
          {needsMore ? (
            <li className="flex min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={open}
                className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[0.6875rem] font-medium text-muted hover:text-ink"
              >
                <Menu aria-hidden="true" className="size-5" />
                More
              </button>
            </li>
          ) : null}
        </ul>
      </nav>
      {needsMore ? (
        <Drawer open={open} onClose={() => setOpen(false)} title={`${AREA_LABEL[area]} menu`}>
          <nav aria-label={`${AREA_LABEL[area]} navigation (full)`}>
            <NavLinks items={primary} onNavigate={() => setOpen(false)} />
            {courses.length > 0 ? (
              <>
                <div className="my-3 h-px bg-line" />
                <CourseLinks courses={courses} onNavigate={() => setOpen(false)} />
              </>
            ) : null}
            {secondary.length > 0 ? (
              <>
                <div className="my-3 h-px bg-line" />
                <NavLinks items={secondary} onNavigate={() => setOpen(false)} />
              </>
            ) : null}
          </nav>
        </Drawer>
      ) : null}
    </>
  );
}
