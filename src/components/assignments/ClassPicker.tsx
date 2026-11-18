"use client";
/**
 * Class picker that drives a `?class=` query param. Works without JavaScript
 * (GET form + submit button inside <noscript>); with JavaScript it navigates
 * as soon as the selection changes.
 */
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, Select, Spinner } from "@/components/ui";

export interface ClassOption {
  id: string;
  name: string;
  detail?: string;
}

export function ClassPicker({
  basePath,
  classes,
  value,
  allowAll = false,
  label = "Class",
  extraParams,
}: {
  basePath: string;
  classes: ClassOption[];
  value: string | null;
  allowAll?: boolean;
  label?: string;
  /** Other query params to keep when switching class. */
  extraParams?: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form key={value ?? "all"} method="get" action={basePath} className="flex items-end gap-2">
      {extraParams
        ? Object.entries(extraParams).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))
        : null}
      <div className="min-w-0">
        <label htmlFor="class-picker" className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
        <Select
          id="class-picker"
          name="class"
          defaultValue={value ?? ""}
          className="min-w-56"
          onChange={(e) => {
            const params = new URLSearchParams(extraParams);
            if (e.target.value) params.set("class", e.target.value);
            const qs = params.toString();
            start(() => router.push(qs ? `${basePath}?${qs}` : basePath));
          }}
        >
          {allowAll ? <option value="">All classes</option> : null}
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.detail ? `${c.name} — ${c.detail}` : c.name}
            </option>
          ))}
        </Select>
      </div>
      {pending ? <Spinner size="sm" label="Loading class" /> : null}
      <noscript>
        <Button type="submit" variant="secondary">
          Show
        </Button>
      </noscript>
    </form>
  );
}
