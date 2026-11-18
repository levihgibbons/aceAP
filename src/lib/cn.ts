/**
 * Join class names conditionally.
 *   cn("px-3", isActive && "bg-accent-soft", { "opacity-50": disabled })
 */
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export type { ClassValue };
