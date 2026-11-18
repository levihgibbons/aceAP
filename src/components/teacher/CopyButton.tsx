"use client";
/**
 * CopyButton — copies text (e.g. a join code) and confirms with a toast.
 *   <CopyButton value={joinCode} label="Copy join code" />
 * For long text (a message), pass `summary` — a short description used in the
 * toast and accessible name instead of the full value.
 */
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, useToast, type ButtonSize, type ButtonVariant } from "@/components/ui";

export function CopyButton({
  value,
  label = "Copy",
  summary,
  size = "sm",
  variant = "secondary",
}: {
  value: string;
  label?: string;
  summary?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  const shown = summary ?? value;
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: "Copied", description: `${shown} is on your clipboard.`, tone: "good" });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", description: summary ? `Select the text and copy it manually: ${value}` : `Select the code and copy it manually: ${value}`, tone: "warn" });
    }
  };
  return (
    <Button
      size={size}
      variant={variant}
      onClick={copy}
      icon={copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
      aria-label={`${label}: ${shown}`}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
