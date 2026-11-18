/**
 * DataTable — a server-friendly table with a sticky header and horizontal
 * scrolling on narrow screens.
 *   <DataTable
 *     caption="Students in Period 2"
 *     columns={[{ key: "name", header: "Student" }, { key: "score", header: "Score", align: "right" }]}
 *     rows={students.map((s) => ({ id: s.id, name: <Link …>{s.name}</Link>, score: `${s.score}%` }))}
 *     empty={<EmptyState … />} />
 * The header sticks while the table scrolls; pass `maxHeight` (e.g. "28rem")
 * to scroll long tables inside the card. Rows may include an `id` (string)
 * used as the React key.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface DataTableColumn {
  key: string;
  header: ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  /** Make this the row header cell (<th scope="row">). Defaults to the first column. */
  rowHeader?: boolean;
}

export interface DataTableProps {
  columns: DataTableColumn[];
  rows: Record<string, ReactNode>[];
  caption: string;
  /** Show the caption visually (it's sr-only by default). */
  showCaption?: boolean;
  empty?: ReactNode;
  maxHeight?: string;
  dense?: boolean;
  className?: string;
}

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const;

export function DataTable({ columns, rows, caption, showCaption = false, empty, maxHeight, dense = false, className }: DataTableProps) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  const headerIndex = Math.max(0, columns.findIndex((c) => c.rowHeader));
  const cellPad = dense ? "px-3 py-2" : "px-4 py-3";
  return (
    <div
      className={cn("overflow-auto rounded-card border border-line bg-surface shadow-card", className)}
      style={maxHeight ? { maxHeight } : undefined}
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
        <caption className={showCaption ? "px-4 py-3 text-left text-sm font-medium text-ink" : "sr-only"}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "sticky top-0 z-10 border-b border-line bg-surface-2 text-xs font-semibold tracking-wide text-muted",
                  cellPad,
                  ALIGN[col.align ?? "left"],
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-muted">
                Nothing to show yet.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={typeof row.id === "string" ? row.id : i} className="group">
                {columns.map((col, ci) => {
                  const Cell = ci === headerIndex ? "th" : "td";
                  return (
                    <Cell
                      key={col.key}
                      scope={ci === headerIndex ? "row" : undefined}
                      className={cn(
                        "border-b border-line align-middle text-ink-2 group-last:border-b-0 group-hover:bg-surface-2",
                        ci === headerIndex && "font-medium text-ink",
                        cellPad,
                        ALIGN[col.align ?? "left"],
                        col.align === "right" && "tabular-nums",
                        col.className,
                      )}
                    >
                      {row[col.key]}
                    </Cell>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
