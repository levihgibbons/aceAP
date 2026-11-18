"use client";
/**
 * Dialog and Drawer — modal surfaces on the native <dialog> element (focus is
 * trapped by the browser, Esc closes, focus returns to the trigger). Both are
 * controlled: keep `open` in state and clear it in `onClose`.
 *   const [open, setOpen] = useState(false);
 *   <Button onClick={() => setOpen(true)}>Edit</Button>
 *   <Dialog open={open} onClose={() => setOpen(false)} title="Rename class"
 *     description="Students see this name." footer={<><Button variant="ghost" onClick={…}>Cancel</Button><Button …>Save</Button></>}>
 *     …form fields… (add autoFocus to the field that should receive focus)
 *   </Dialog>
 * Drawer slides in from the right on desktop and up from the bottom on small
 * screens; same props.
 */
import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Close when the backdrop is clicked (default true). */
  dismissOnBackdrop?: boolean;
  className?: string;
}

const DIALOG_SIZE = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

function ModalSurface({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissOnBackdrop = true,
  variant,
  className,
}: DialogProps & { variant: "dialog" | "drawer" }) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const handleClose = () => {
    const target = returnFocus.current;
    returnFocus.current = null;
    if (target && target.isConnected) target.focus();
    onClose();
  };

  const onBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    if (dismissOnBackdrop && e.target === e.currentTarget) e.currentTarget.close();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={handleClose}
      onClick={onBackdrop}
      className={cn(
        "overflow-hidden border border-line bg-surface p-0 text-ink shadow-overlay backdrop:bg-scrim",
        variant === "dialog" && "m-auto w-[calc(100%-2rem)] rounded-card animate-rise",
        variant === "drawer" &&
          "mx-0 mb-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-2xl animate-drawer sm:my-0 sm:ml-auto sm:mr-0 sm:h-dvh sm:max-h-dvh sm:w-[26rem] sm:rounded-none sm:rounded-l-2xl",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col",
          variant === "dialog" ? "max-h-[calc(100dvh-4rem)]" : "max-h-[88dvh] sm:h-dvh sm:max-h-dvh",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          {variant === "drawer" ? (
            <span aria-hidden="true" className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-line-strong sm:hidden" />
          ) : null}
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-lg font-semibold leading-snug tracking-[-0.01em] text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="-mr-2 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
          >
            <X aria-hidden="true" className="size-4.5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}

export function Dialog({ size = "md", className, ...props }: DialogProps) {
  return <ModalSurface {...props} variant="dialog" className={cn(DIALOG_SIZE[size], className)} />;
}

export function Drawer(props: Omit<DialogProps, "size">) {
  return <ModalSurface {...props} variant="drawer" />;
}
