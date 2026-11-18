/**
 * Pure graph helpers for the vault graph: deterministic layout, edge styling
 * metadata and filtering. No React and no server imports.
 *
 * Layout
 *  - One cluster (a band of columns) per course, ordered by course id; a
 *    "Loose notes" lane comes first for notes that reference no concept.
 *  - Inside a cluster, skills sit in columns by prerequisite depth (longest
 *    chain of PREREQUISITE_OF edges leading to them), then alphabetically;
 *    tall columns wrap after MAX_ROWS.
 *  - A skill's open misconceptions are stacked directly beneath it.
 *  - Notes go in a lane at the right edge of the cluster of the course they
 *    reference most, vertically aligned with the skills they reference.
 * The same input always produces the same positions.
 */
import type { MasteryLevel } from "@/modules/mastery/types";

export type GraphNodeType = "note" | "skill" | "course" | "misconception";
export type GraphEdgeType =
  | "REFERENCES"
  | "PREREQUISITE_OF"
  | "PART_OF"
  | "RELATED_TO"
  | "APPLIED_IN"
  | "EXPLAINS"
  | "DEMONSTRATES"
  | "MISCONCEPTION_OF";

/** Mirrors the vault service's GraphNode / GraphEdge / VaultGraph (JSON form). */
export interface VGNode {
  id: string;
  type: GraphNodeType;
  label: string;
  courseId?: string;
  level?: MasteryLevel;
  needsReview?: boolean;
  href: string;
}
export interface VGEdge {
  source: string;
  target: string;
  type: GraphEdgeType;
  label?: string;
  rationale?: string;
}
export interface VaultGraphData {
  nodes: VGNode[];
  edges: VGEdge[];
  truncated: boolean;
  scope: { courseIds: string[]; includeCurriculum: boolean };
}

export const NODE_SIZE: Record<GraphNodeType, { w: number; h: number }> = {
  course: { w: 230, h: 56 },
  skill: { w: 210, h: 58 },
  note: { w: 200, h: 48 },
  misconception: { w: 190, h: 34 },
};

const COL_W = 260;
const SKILL_Y0 = 110;
const ROW_GAP = 26;
const MISC_GAP = 8;
const NOTE_GAP = 18;
const CLUSTER_GAP = 140;
const MAX_ROWS = 10;

export interface Positioned {
  x: number;
  y: number;
}

export function layoutGraph(
  nodes: readonly VGNode[],
  edges: readonly VGEdge[],
): Map<string, Positioned> {
  const pos = new Map<string, Positioned>();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const skills = nodes.filter((n) => n.type === "skill");
  const skillIds = new Set(skills.map((s) => s.id));

  // Prerequisite depth (longest chain), cycle-safe.
  const prereqsOf = new Map<string, string[]>();
  for (const e of edges) {
    if (e.type !== "PREREQUISITE_OF" || !skillIds.has(e.source) || !skillIds.has(e.target))
      continue;
    const list = prereqsOf.get(e.target) ?? [];
    list.push(e.source);
    prereqsOf.set(e.target, list);
  }
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const depthOf = (id: string): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const sameCourse = (prereqsOf.get(id) ?? []).filter(
      (p) => byId.get(p)?.courseId === byId.get(id)?.courseId,
    );
    const d = sameCourse.length ? 1 + Math.max(...sameCourse.map(depthOf)) : 0;
    visiting.delete(id);
    depth.set(id, d);
    return d;
  };

  // Misconceptions per skill.
  const miscOf = new Map<string, VGNode[]>();
  for (const e of edges) {
    if (e.type !== "MISCONCEPTION_OF") continue;
    const m = byId.get(e.source);
    if (!m || m.type !== "misconception" || !skillIds.has(e.target)) continue;
    const list = miscOf.get(e.target) ?? [];
    if (!list.includes(m)) list.push(m);
    miscOf.set(e.target, list);
  }
  for (const list of miscOf.values())
    list.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));

  // Clusters: course ids from course nodes and skills, sorted.
  const courseIds = [
    ...new Set([
      ...nodes
        .filter((n) => n.type === "course")
        .map((n) => n.courseId ?? n.id.replace(/^course:/, "")),
      ...skills.map((s) => s.courseId ?? ""),
    ]),
  ]
    .filter(Boolean)
    .sort();

  interface Cluster {
    courseId: string;
    cols: number;
    /** relative positions */
    rel: Map<string, Positioned>;
    notes: { id: string; desiredY: number; label: string }[];
  }
  const clusters = new Map<string, Cluster>();
  for (const courseId of courseIds) {
    const rel = new Map<string, Positioned>();
    const own = skills.filter((s) => s.courseId === courseId);
    const depths = [...new Set(own.map((s) => depthOf(s.id)))].sort((a, b) => a - b);
    let col = 0;
    for (const d of depths) {
      const column = own
        .filter((s) => depthOf(s.id) === d)
        .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
      for (let i = 0; i < column.length; i += MAX_ROWS) {
        let y = SKILL_Y0;
        for (const s of column.slice(i, i + MAX_ROWS)) {
          rel.set(s.id, { x: col * COL_W, y });
          y += NODE_SIZE.skill.h + MISC_GAP;
          for (const m of miscOf.get(s.id) ?? []) {
            if (!rel.has(m.id)) {
              rel.set(m.id, { x: col * COL_W + 14, y });
              y += NODE_SIZE.misconception.h + MISC_GAP;
            }
          }
          y += ROW_GAP - MISC_GAP;
        }
        col++;
      }
    }
    const courseNode = nodes.find(
      (n) => n.type === "course" && (n.courseId ?? n.id.replace(/^course:/, "")) === courseId,
    );
    if (courseNode) rel.set(courseNode.id, { x: 0, y: 0 });
    clusters.set(courseId, { courseId, cols: Math.max(col, 1), rel, notes: [] });
  }

  // Notes: cluster of the course they reference most, aligned with those skills.
  const notes = nodes
    .filter((n) => n.type === "note")
    .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
  const refs = new Map<string, string[]>();
  for (const e of edges) {
    if (e.type !== "REFERENCES") continue;
    const list = refs.get(e.source) ?? [];
    list.push(e.target);
    refs.set(e.source, list);
  }
  const noteHome = new Map<string, { courseId: string; desiredY: number }>();
  const relOf = (id: string): { courseId: string; y: number } | null => {
    for (const c of clusters.values()) {
      const p = c.rel.get(id);
      if (p) return { courseId: c.courseId, y: p.y };
    }
    return null;
  };
  for (const n of notes) {
    const targets = (refs.get(n.id) ?? [])
      .filter((t) => skillIds.has(t))
      .map(relOf)
      .filter((x): x is { courseId: string; y: number } => x !== null);
    if (targets.length === 0) continue;
    const counts = new Map<string, number>();
    for (const t of targets) counts.set(t.courseId, (counts.get(t.courseId) ?? 0) + 1);
    const best = [...counts].sort(
      (a, b) => b[1] - a[1] || courseIds.indexOf(a[0]) - courseIds.indexOf(b[0]),
    )[0][0];
    const ys = targets.filter((t) => t.courseId === best).map((t) => t.y);
    noteHome.set(n.id, { courseId: best, desiredY: ys.reduce((a, b) => a + b, 0) / ys.length });
  }
  // Notes that only link to other notes follow those notes (a few passes).
  for (let pass = 0; pass < 3; pass++) {
    for (const n of notes) {
      if (noteHome.has(n.id)) continue;
      const linked = [
        ...(refs.get(n.id) ?? []),
        ...edges.filter((e) => e.type === "REFERENCES" && e.target === n.id).map((e) => e.source),
      ]
        .map((id) => noteHome.get(id))
        .filter((x): x is { courseId: string; desiredY: number } => Boolean(x));
      if (linked.length)
        noteHome.set(n.id, { courseId: linked[0].courseId, desiredY: linked[0].desiredY });
    }
  }
  const loose: { id: string; desiredY: number; label: string }[] = [];
  for (const n of notes) {
    const home = noteHome.get(n.id);
    if (home && clusters.has(home.courseId))
      clusters
        .get(home.courseId)!
        .notes.push({ id: n.id, desiredY: home.desiredY, label: n.label });
    else loose.push({ id: n.id, desiredY: SKILL_Y0, label: n.label });
  }

  const placeLane = (lane: { id: string; desiredY: number; label: string }[], x: number) => {
    lane.sort(
      (a, b) =>
        a.desiredY - b.desiredY || a.label.localeCompare(b.label) || a.id.localeCompare(b.id),
    );
    let prev = -Infinity;
    for (const item of lane) {
      const y = Math.max(item.desiredY, prev + NODE_SIZE.note.h + NOTE_GAP);
      pos.set(item.id, { x, y });
      prev = y;
    }
  };

  // Absolute positions, left to right.
  let x = 0;
  if (loose.length) {
    placeLane(loose, x);
    x += COL_W + CLUSTER_GAP;
  }
  for (const courseId of courseIds) {
    const c = clusters.get(courseId)!;
    for (const [id, p] of c.rel) pos.set(id, { x: x + p.x, y: p.y });
    let width = c.cols * COL_W;
    if (c.notes.length) {
      placeLane(c.notes, x + width);
      width += COL_W;
    }
    x += width + CLUSTER_GAP;
  }

  // Anything left (e.g. a misconception whose skill was dropped by the cap).
  let y = SKILL_Y0;
  for (const n of nodes) {
    if (pos.has(n.id)) continue;
    pos.set(n.id, { x, y });
    y += NODE_SIZE[n.type].h + ROW_GAP;
  }
  return pos;
}

// ─────────────────────────────── edge styles ───────────────────────────────

export interface EdgeStyle {
  label: string;
  description: string;
  color: string;
  dash?: string;
  width: number;
  arrow: boolean;
}

/** Colours are design tokens; dash patterns make types distinguishable without colour. */
export const EDGE_STYLE: Record<GraphEdgeType, EdgeStyle> = {
  PREREQUISITE_OF: {
    label: "Prerequisite of",
    description: "Learn the first concept before the second",
    color: "var(--ink-2)",
    width: 1.6,
    arrow: true,
  },
  REFERENCES: {
    label: "References",
    description: "Your note links to it",
    color: "var(--accent)",
    width: 2.2,
    arrow: true,
  },
  RELATED_TO: {
    label: "Related to",
    description: "Concepts that share an idea",
    color: "var(--chart-4)",
    dash: "7 5",
    width: 1.6,
    arrow: false,
  },
  APPLIED_IN: {
    label: "Applied in",
    description: "Used inside another course or topic",
    color: "var(--chart-3)",
    dash: "12 5",
    width: 1.6,
    arrow: true,
  },
  EXPLAINS: {
    label: "Explains",
    description: "One concept explains another",
    color: "var(--chart-5)",
    dash: "10 4 2 4",
    width: 1.6,
    arrow: true,
  },
  MISCONCEPTION_OF: {
    label: "Misconception about",
    description: "A possible misunderstanding found in your answers",
    color: "var(--m-review)",
    dash: "2 4",
    width: 1.6,
    arrow: false,
  },
  PART_OF: {
    label: "Part of",
    description: "Concept belongs to a course",
    color: "var(--faint)",
    dash: "1 5",
    width: 1.2,
    arrow: false,
  },
  DEMONSTRATES: {
    label: "Demonstrates",
    description: "Evidence for a concept",
    color: "var(--good)",
    width: 1.4,
    arrow: true,
  },
};

/** How a connection reads from the target's side. */
export const INCOMING_LABEL: Record<GraphEdgeType, string> = {
  PREREQUISITE_OF: "Builds on",
  REFERENCES: "Referenced by",
  RELATED_TO: "Related to",
  APPLIED_IN: "Applies",
  EXPLAINS: "Explained by",
  MISCONCEPTION_OF: "Possible misconception",
  PART_OF: "Includes",
  DEMONSTRATES: "Demonstrated by",
};

export const EDGE_TYPES_SHOWN: GraphEdgeType[] = [
  "PREREQUISITE_OF",
  "REFERENCES",
  "RELATED_TO",
  "APPLIED_IN",
  "EXPLAINS",
  "MISCONCEPTION_OF",
  "PART_OF",
];
/** Course membership is already shown by the column layout, so PART_OF starts hidden. */
export const DEFAULT_HIDDEN_EDGES: GraphEdgeType[] = ["PART_OF"];

export const NODE_TYPE_LABEL: Record<GraphNodeType, string> = {
  course: "Course",
  skill: "Concept",
  note: "Note",
  misconception: "Possible misconception",
};

// ──────────────────────────────── filtering ─────────────────────────────────

export interface GraphFilter {
  notesOnly: boolean;
  hiddenEdges: ReadonlySet<GraphEdgeType>;
}

export function filterGraph(
  data: VaultGraphData,
  f: GraphFilter,
): { nodes: VGNode[]; edges: VGEdge[] } {
  const nodes = f.notesOnly ? data.nodes.filter((n) => n.type === "note") : data.nodes;
  const ids = new Set(nodes.map((n) => n.id));
  const edges = data.edges.filter(
    (e) => !f.hiddenEdges.has(e.type) && ids.has(e.source) && ids.has(e.target),
  );
  return { nodes, edges };
}

export function edgeKey(e: VGEdge): string {
  return `${e.source}|${e.target}|${e.type}`;
}
