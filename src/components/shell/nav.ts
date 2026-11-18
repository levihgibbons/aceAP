/**
 * Navigation definitions for the three shells. Imported by the client nav
 * components (icons are components, so they can't cross the server→client
 * boundary as props).
 */
import {
  Archive,
  BookOpen,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  Home,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Plug,
  ScrollText,
  ShieldCheck,
  Table2,
  Target,
  Users,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export type ShellArea = "student" | "staff" | "admin";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only active on an exact match (area roots). */
  exact?: boolean;
}

export const SIDEBAR_COOKIE = "aceap_sidebar";

const STUDENT: NavItem[] = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/courses", label: "My courses", icon: BookOpen, exact: true },
  { href: "/app/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/app/exam-prep", label: "Exam prep", icon: Target },
  { href: "/app/progress", label: "Progress", icon: LineChart },
  { href: "/app/vault", label: "Knowledge vault", icon: Archive },
];

/** A course the student is taking, listed under the student navigation. */
export interface ShellCourse {
  id: string;
  name: string;
}

export const shortCourseName = (name: string) => name.replace(/^AP\s+/, "");

const STAFF: NavItem[] = [
  { href: "/teacher", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/teacher/classes", label: "Classes", icon: Users },
  { href: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/teacher/gradebook", label: "Gradebook", icon: Table2 },
  { href: "/teacher/integrations", label: "Integrations", icon: Plug },
];

const STAFF_ADMIN_LINK: NavItem = { href: "/admin", label: "Admin", icon: ShieldCheck };

const ADMIN: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/content", label: "Content review", icon: FileCheck2 },
  { href: "/admin/licensing", label: "Licensing", icon: KeyRound },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/policies", label: "Mastery policy", icon: SlidersHorizontal },
];

const ADMIN_SECONDARY: NavItem[] = [{ href: "/teacher", label: "Teaching tools", icon: GraduationCap }];

export function navFor(area: ShellArea, opts: { isPlatformAdmin: boolean }): { primary: NavItem[]; secondary: NavItem[] } {
  switch (area) {
    case "student":
      return { primary: STUDENT, secondary: [] };
    case "staff":
      return { primary: STAFF, secondary: opts.isPlatformAdmin ? [STAFF_ADMIN_LINK] : [] };
    case "admin":
      return { primary: ADMIN, secondary: ADMIN_SECONDARY };
  }
}

export const AREA_LABEL: Record<ShellArea, string> = {
  student: "Student",
  staff: "Teaching",
  admin: "Platform admin",
};

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
