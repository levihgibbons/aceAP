"use client";
/**
 * Vault graph explorer: filters, legend, the @xyflow canvas (client-only) and
 * an equivalent accessible List view, plus a details drawer for any node.
 * Course and curriculum filters refetch /api/vault/graph (the service decides
 * scope); "notes only" and edge-type filters apply locally.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, FileText, GraduationCap, List, Network } from "lucide-react";
import {
  Badge,
  ButtonLink,
  Checkbox,
  Drawer,
  EmptyState,
  MasteryBadge,
  MasteryLegend,
  Select,
  Spinner,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  DEFAULT_HIDDEN_EDGES,
  EDGE_STYLE,
  EDGE_TYPES_SHOWN,
  INCOMING_LABEL,
  NODE_TYPE_LABEL,
  edgeKey,
  filterGraph,
  type GraphEdgeType,
  type VGEdge,
  type VGNode,
  type VaultGraphData,
} from "./model";

const GraphCanvas = dynamic(() => import("./GraphCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center gap-2 text-sm text-muted">
      <Spinner size="sm" /> Loading graph…
    </div>
  ),
});

export interface GraphExplorerProps {
  initial: VaultGraphData;
  /** The student's courses, for the course filter. */
  courses: { id: string; name: string }[];
}

type View = "graph" | "list";

export function GraphExplorer({ initial, courses }: GraphExplorerProps) {
  const [data, setData] = useState<VaultGraphData>(initial);
  const [courseId, setCourseId] = useState("");
  const [curriculum, setCurriculum] = useState(true);
  const [notesOnly, setNotesOnly] = useState(false);
  const [hidden, setHidden] = useState<Set<GraphEdgeType>>(() => new Set(DEFAULT_HIDDEN_EDGES));
  const [view, setView] = useState<View>("graph");
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (nextCourse: string, nextCurriculum: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams();
      if (nextCourse) p.set("courseId", nextCourse);
      if (!nextCurriculum) p.set("curriculum", "0");
      setData(await apiFetch<VaultGraphData>(`/api/vault/graph?${p.toString()}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the graph.");
    } finally {
      setLoading(false);
    }
  }, []);

  const visible = useMemo(
    () => filterGraph(data, { notesOnly, hiddenEdges: hidden }),
    [data, notesOnly, hidden],
  );
  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const courseName = useMemo(() => {
    const m = new Map(courses.map((c) => [c.id, c.name]));
    for (const n of data.nodes) if (n.type === "course" && n.courseId) m.set(n.courseId, n.label);
    return m;
  }, [courses, data.nodes]);
  const counts = useMemo(() => {
    const c = { course: 0, skill: 0, note: 0, misconception: 0 };
    for (const n of visible.nodes) c[n.type]++;
    return c;
  }, [visible.nodes]);

  const fitKey = `${courseId}|${curriculum}|${notesOnly}|${[...hidden].sort().join(",")}|${data.nodes.length}`;
  const openNode = openId ? (byId.get(openId) ?? null) : null;
  const onOpenNode = useCallback((id: string) => setOpenId(id), []);

  const toggleEdge = (t: GraphEdgeType, on: boolean) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (on) next.delete(t);
      else next.add(t);
      return next;
    });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            <div className="w-full space-y-1.5 sm:w-56">
              <label htmlFor="graph-course" className="block text-sm font-medium text-ink">
                Course
              </label>
              <Select
                id="graph-course"
                value={courseId}
                disabled={loading}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  void refetch(e.target.value, curriculum);
                }}
              >
                <option value="">All my courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <Checkbox
              className="max-w-64 sm:pt-6"
              label="Show curriculum"
              description="Concepts from your courses, not just the ones your notes mention"
              checked={curriculum}
              disabled={loading}
              onChange={(e) => {
                setCurriculum(e.target.checked);
                void refetch(courseId, e.target.checked);
              }}
            />
            <Checkbox
              className="max-w-64 sm:pt-6"
              label="Notes only"
              description="Hide concepts, courses and misconceptions"
              checked={notesOnly}
              onChange={(e) => setNotesOnly(e.target.checked)}
            />
          </div>
          <div
            role="group"
            aria-label="View"
            className="inline-flex self-start rounded-lg border border-line-strong bg-surface-2 p-0.5 xl:self-auto"
          >
            {(
              [
                { id: "graph", label: "Graph", icon: Network },
                { id: "list", label: "List view", icon: List },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={view === v.id}
                onClick={() => setView(v.id)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[0.8125rem] font-medium transition-colors",
                  view === v.id ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
                )}
              >
                <v.icon aria-hidden="true" className="size-4" />
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <fieldset className="mt-4 border-t border-line pt-4">
          <legend className="sr-only">Connection types</legend>
          <p aria-hidden="true" className="mb-2 text-xs font-medium text-muted">
            Connections
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {EDGE_TYPES_SHOWN.map((t) => {
              const s = EDGE_STYLE[t];
              const id = `edge-filter-${t}`;
              return (
                <li key={t} className="flex items-center gap-2">
                  <input
                    id={id}
                    type="checkbox"
                    checked={!hidden.has(t)}
                    onChange={(e) => toggleEdge(t, e.target.checked)}
                    className="size-4 cursor-pointer accent-accent"
                  />
                  <label
                    htmlFor={id}
                    className="inline-flex cursor-pointer items-center gap-2 text-[0.8125rem] text-ink-2"
                    title={s.description}
                  >
                    <svg
                      aria-hidden="true"
                      width="34"
                      height="10"
                      viewBox="0 0 34 10"
                      className="shrink-0"
                    >
                      <line
                        x1="1"
                        y1="5"
                        x2={s.arrow ? 26 : 33}
                        y2="5"
                        style={{
                          stroke: s.color,
                          strokeWidth: s.width + 0.4,
                          strokeDasharray: s.dash,
                        }}
                      />
                      {s.arrow ? <path d="M25,1 L33,5 L25,9 z" style={{ fill: s.color }} /> : null}
                    </svg>
                    {s.label}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap aria-hidden="true" className="size-3.5" /> Course
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText aria-hidden="true" className="size-3.5" /> Your note
          </span>
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle aria-hidden="true" className="size-3.5" /> Possible misconception
          </span>
          <MasteryLegend />
        </div>
      </div>

      {/* Status line */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted"
        aria-live="polite"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Spinner size="sm" /> Updating…
          </span>
        ) : (
          <span>
            {counts.note} {counts.note === 1 ? "note" : "notes"} · {counts.skill}{" "}
            {counts.skill === 1 ? "concept" : "concepts"} · {counts.misconception} open{" "}
            {counts.misconception === 1 ? "misconception" : "misconceptions"} ·{" "}
            {visible.edges.length} {visible.edges.length === 1 ? "connection" : "connections"}
          </span>
        )}
        {data.truncated ? (
          <Badge tone="warn" icon={<AlertTriangle className="size-3" />}>
            Showing the first {data.nodes.length} items — pick one course to see everything in it
          </Badge>
        ) : null}
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad"
        >
          {error}
        </p>
      ) : null}

      {visible.nodes.length === 0 ? (
        <EmptyState
          icon={<Network />}
          title={notesOnly ? "No notes to show" : "Nothing to show yet"}
          description={
            notesOnly
              ? "Write a note and link it to a concept with [[double brackets]] — it will appear here."
              : "Join a course or write a note that links to a concept, and your graph will grow from there."
          }
          action={<ButtonLink href="/app/vault/new">New note</ButtonLink>}
        />
      ) : view === "graph" ? (
        <div className="h-[68vh] min-h-[420px] overflow-hidden rounded-card border border-line bg-canvas shadow-card">
          <GraphCanvas
            nodes={visible.nodes}
            edges={visible.edges}
            onOpenNode={onOpenNode}
            fitKey={fitKey}
          />
        </div>
      ) : (
        <GraphList
          nodes={visible.nodes}
          edges={visible.edges}
          byId={byId}
          courseName={courseName}
          onOpen={onOpenNode}
        />
      )}

      <NodeDrawer
        node={openNode}
        edges={data.edges}
        byId={byId}
        courseName={courseName}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}

// ─────────────────────────────── list view ─────────────────────────────────

function describeEdge(
  e: VGEdge,
  fromId: string,
  byId: Map<string, VGNode>,
): { text: string; other: VGNode | undefined; rationale?: string } {
  const outgoing = e.source === fromId;
  const other = byId.get(outgoing ? e.target : e.source);
  const text = outgoing ? EDGE_STYLE[e.type].label : INCOMING_LABEL[e.type];
  return { text, other, rationale: e.rationale };
}

function GraphList({
  nodes,
  edges,
  byId,
  courseName,
  onOpen,
}: {
  nodes: VGNode[];
  edges: VGEdge[];
  byId: Map<string, VGNode>;
  courseName: Map<string, string>;
  onOpen: (id: string) => void;
}) {
  const edgesOf = useMemo(() => {
    const m = new Map<string, VGEdge[]>();
    for (const e of edges) {
      for (const id of [e.source, e.target]) {
        const list = m.get(id) ?? [];
        list.push(e);
        m.set(id, list);
      }
    }
    return m;
  }, [edges]);

  const groups: { title: string; items: VGNode[] }[] = [
    { title: "Your notes", items: nodes.filter((n) => n.type === "note") },
    ...[...new Set(nodes.filter((n) => n.type === "skill").map((n) => n.courseId ?? ""))]
      .sort()
      .map((cid) => ({
        title: `Concepts · ${courseName.get(cid) ?? cid}`,
        items: nodes.filter((n) => n.type === "skill" && (n.courseId ?? "") === cid),
      })),
    { title: "Possible misconceptions", items: nodes.filter((n) => n.type === "misconception") },
    { title: "Courses", items: nodes.filter((n) => n.type === "course") },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6 rounded-card border border-line bg-surface p-4 shadow-card sm:p-6">
      {groups.map((g, gi) => (
        // Index-based id: titles contain spaces, and aria-labelledby is a space-separated id list.
        <section key={g.title} aria-labelledby={`graph-group-${gi}`}>
          <h2
            id={`graph-group-${gi}`}
            className="mb-2 font-display text-base font-semibold text-ink"
          >
            {g.title} <span className="font-normal text-muted">({g.items.length})</span>
          </h2>
          <ul className="divide-y divide-line">
            {g.items.map((n) => {
              const conns = edgesOf.get(n.id) ?? [];
              return (
                <li key={n.id} className="py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={n.href}
                      className="font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {n.label}
                    </Link>
                    {n.type === "skill" ? (
                      <MasteryBadge
                        level={n.level ?? "not_started"}
                        needsReview={n.needsReview}
                        size="sm"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onOpen(n.id)}
                      className="text-xs font-medium text-accent underline-offset-4 hover:underline"
                    >
                      Details<span className="sr-only"> for {n.label}</span>
                    </button>
                  </div>
                  {conns.length ? (
                    <ul
                      className="mt-1.5 space-y-1 pl-4 text-[0.8125rem] text-muted"
                      aria-label={`Connections of ${n.label}`}
                    >
                      {conns.map((e) => {
                        const d = describeEdge(e, n.id, byId);
                        return (
                          <li key={edgeKey(e)} className="flex flex-wrap items-baseline gap-1.5">
                            <ArrowRight
                              aria-hidden="true"
                              className="size-3 shrink-0 translate-y-0.5"
                            />
                            <span>{d.text}</span>
                            {d.other ? (
                              <Link
                                href={d.other.href}
                                className="text-ink-2 underline-offset-4 hover:underline"
                              >
                                {d.other.label}
                              </Link>
                            ) : null}
                            {d.rationale ? (
                              <span className="basis-full pl-4 text-xs text-faint">
                                {d.rationale}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ──────────────────────────────── drawer ────────────────────────────────────

function NodeDrawer({
  node,
  edges,
  byId,
  courseName,
  onClose,
}: {
  node: VGNode | null;
  edges: VGEdge[];
  byId: Map<string, VGNode>;
  courseName: Map<string, string>;
  onClose: () => void;
}) {
  const conns = node ? edges.filter((e) => e.source === node.id || e.target === node.id) : [];
  const skillId = node?.type === "skill" ? node.id.replace(/^skill:/, "") : null;
  return (
    <Drawer
      open={Boolean(node)}
      onClose={onClose}
      title={node?.label ?? ""}
      description={
        node
          ? `${NODE_TYPE_LABEL[node.type]}${node.courseId && node.type !== "course" ? ` · ${courseName.get(node.courseId) ?? node.courseId}` : ""}`
          : undefined
      }
    >
      {node ? (
        <div className="space-y-5">
          {node.type === "skill" ? (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted">Your level</p>
              <MasteryBadge level={node.level ?? "not_started"} needsReview={node.needsReview} />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {node.type === "note" ? (
              <ButtonLink href={node.href} size="sm">
                Open note
              </ButtonLink>
            ) : null}
            {node.type === "skill" && skillId ? (
              <>
                <ButtonLink href={node.href} size="sm">
                  Concept page
                </ButtonLink>
                <ButtonLink
                  href={`/app/practice/${encodeURIComponent(skillId)}`}
                  size="sm"
                  variant="secondary"
                >
                  Practice
                </ButtonLink>
              </>
            ) : null}
            {node.type === "misconception" ? (
              <ButtonLink href={node.href} size="sm">
                See remediation
              </ButtonLink>
            ) : null}
            {node.type === "course" ? (
              <ButtonLink href={node.href} size="sm">
                Open course
              </ButtonLink>
            ) : null}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink">Connections ({conns.length})</h3>
            {conns.length === 0 ? (
              <p className="text-sm text-muted">No connections in the current view.</p>
            ) : (
              <ul className="space-y-2.5">
                {conns.map((e) => {
                  const d = describeEdge(e, node.id, byId);
                  return (
                    <li
                      key={edgeKey(e)}
                      className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm"
                    >
                      <p className="text-xs font-medium text-muted">{d.text}</p>
                      {d.other ? (
                        <Link
                          href={d.other.href}
                          className="font-medium text-ink underline-offset-4 hover:underline"
                        >
                          {d.other.label}
                        </Link>
                      ) : (
                        <span className="text-muted">Outside this view</span>
                      )}
                      {d.rationale ? (
                        <p className="mt-1 text-xs leading-relaxed text-muted">{d.rationale}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
