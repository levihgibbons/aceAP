"use client";
/**
 * NavLinks — the active-aware link list used by Sidebar and MobileNav.
 * Active state comes from usePathname() and is exposed as aria-current="page".
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isActive, type NavItem } from "./nav";

export function NavLinks({
  items,
  collapsed = false,
  onNavigate,
  label,
}: {
  items: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
  label?: string;
}) {
  const pathname = usePathname() ?? "";
  return (
    <ul className="space-y-0.5" aria-label={label}>
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              onClick={onNavigate}
              className={cn(
                "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors lg:min-h-10",
                collapsed && "lg:justify-center lg:px-0",
                active ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:bg-sunken hover:text-ink",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn("size-[1.1rem] shrink-0", active ? "text-accent" : "text-muted group-hover:text-ink-2")}
              />
              <span className={cn("truncate", collapsed && "lg:sr-only")}>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Bottom-bar variant: icon over a short label, ≥ 44px tall. */
export function BottomNavLink({ item }: { item: NavItem }) {
  const pathname = usePathname() ?? "";
  const active = isActive(pathname, item);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[0.6875rem] font-medium transition-colors",
        active ? "text-accent" : "text-muted hover:text-ink",
      )}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}
