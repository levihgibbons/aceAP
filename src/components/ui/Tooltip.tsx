/**
 * Tooltip — CSS-only, shown on hover and keyboard focus; the trigger gets
 * aria-describedby pointing at the tooltip text. The child must be a single
 * focusable element (button, link…). Keep content short and non-essential.
 *   <Tooltip content="Evidence from 4 quizzes"><button …><Info /></button></Tooltip>
 */
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement<{ "aria-describedby"?: string }>;
  side?: "top" | "bottom";
  className?: string;
}

export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const id = useId();
  const trigger = isValidElement(children)
    ? cloneElement(children, {
        "aria-describedby": [children.props["aria-describedby"], id].filter(Boolean).join(" "),
      })
    : children;
  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {trigger}
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none invisible absolute left-1/2 z-50 w-max max-w-64 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-xs font-medium leading-snug text-canvas opacity-0 shadow-raised transition-opacity duration-100",
          "group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-focus-within/tooltip:visible group-focus-within/tooltip:opacity-100",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
        )}
      >
        {content}
      </span>
    </span>
  );
}
