"use client";
/**
 * CountdownTimer — time left on a timed attempt, from the server's deadline
 * (corrected for clock skew against the server's "now"). Announces politely
 * at 5 and 1 minutes left, and calls onExpire once at zero.
 */
import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/cn";

function format(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

function spoken(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.max(0, Math.round((ms % 60_000) / 1000));
  if (minutes === 0) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  return `${minutes} minute${minutes === 1 ? "" : "s"}${seconds ? ` ${seconds} seconds` : ""}`;
}

export function CountdownTimer({ deadline, serverNow, onExpire }: { deadline: string; serverNow: string; onExpire: () => void }) {
  const end = Date.parse(deadline);
  const [left, setLeft] = useState(() => end - Date.parse(serverNow));
  const [announcement, setAnnouncement] = useState("");
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const skew = Date.parse(serverNow) - Date.now();
    const warned = { five: false, one: false, expired: false };
    const update = () => {
      const ms = end - (Date.now() + skew);
      setLeft(ms);
      if (ms <= 5 * 60_000 && ms > 60_000 && !warned.five) {
        warned.five = true;
        setAnnouncement("5 minutes left.");
      }
      if (ms <= 60_000 && ms > 0 && !warned.one) {
        warned.one = true;
        warned.five = true;
        setAnnouncement("1 minute left. Your answers will be submitted automatically when time is up.");
      }
      if (ms <= 0 && !warned.expired) {
        warned.expired = true;
        setAnnouncement("Time is up. Submitting your answers.");
        onExpireRef.current();
      }
    };
    const first = window.setTimeout(update, 0);
    const id = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [end, serverNow]);

  const tone = left <= 60_000 ? "bad" : left <= 5 * 60_000 ? "warn" : "neutral";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold tabular-nums",
        tone === "bad" && "border-bad/40 bg-bad-soft text-bad",
        tone === "warn" && "border-warn/40 bg-warn-soft text-warn",
        tone === "neutral" && "border-line-strong bg-surface text-ink",
      )}
    >
      <Timer aria-hidden="true" className="size-4" />
      <span role="timer" aria-label={`Time left: ${spoken(Math.max(0, left))}`} aria-live="off">
        {format(left)}
      </span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
      {tone !== "neutral" ? <span className="text-xs font-medium">{left <= 0 ? "Time's up" : "left"}</span> : null}
    </div>
  );
}
