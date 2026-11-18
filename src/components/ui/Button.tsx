/**
 * Button / ButtonLink — the only button styles in the product.
 *   <Button onClick={save} loading={pending}>Save</Button>
 *   <Button variant="secondary" size="sm" type="submit">Filter</Button>
 *   <ButtonLink href="/app/courses" variant="primary">Browse courses</ButtonLink>
 * Variants: primary | secondary | ghost | danger | link. Sizes: sm | md | lg.
 * `loading` disables the button, shows a spinner and sets aria-busy.
 * No hooks, so it works in Server and Client Components.
 */
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent shadow-card hover:bg-accent-hover",
  secondary: "border border-line-strong bg-surface text-ink shadow-card hover:bg-surface-2 hover:border-faint",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
  danger: "bg-bad text-surface shadow-card hover:opacity-90",
  link: "text-accent underline-offset-4 hover:underline",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 rounded-lg px-3 text-[0.8125rem]",
  md: "h-10 rounded-lg px-4 text-sm",
  lg: "h-11 rounded-xl px-5 text-[0.9375rem]",
};

const LINK_SIZE: Record<ButtonSize, string> = {
  sm: "text-[0.8125rem]",
  md: "text-sm",
  lg: "text-[0.9375rem]",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cn(BASE, VARIANT[variant], variant === "link" ? LINK_SIZE[size] : SIZE[size], fullWidth && "w-full", className);
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Icon rendered before the label (hidden while loading). */
  icon?: ReactNode;
  /** Icon rendered after the label. */
  iconRight?: ReactNode;
}

export interface ButtonProps extends ComponentProps<"button">, CommonProps {
  loading?: boolean;
  /** Text announced/shown while loading; defaults to the children. */
  loadingText?: ReactNode;
}

export function Button({
  variant,
  size,
  fullWidth,
  icon,
  iconRight,
  loading = false,
  loadingText,
  className,
  type = "button",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading ? <Spinner size={size === "lg" ? "md" : "sm"} /> : icon}
      {loading && loadingText ? loadingText : children}
      {!loading ? iconRight : null}
    </button>
  );
}

export interface ButtonLinkProps extends ComponentProps<typeof Link>, CommonProps {
  href: ComponentProps<typeof Link>["href"];
}

export function ButtonLink({ variant, size, fullWidth, icon, iconRight, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonStyles({ variant, size, fullWidth, className })} {...rest}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}
