"use client";
/**
 * The interactive canvas for the vault graph (@xyflow/react). Loaded with
 * next/dynamic { ssr: false } by GraphExplorer. Positions come from the
 * deterministic layout in ./model; nodes can't be dragged or connected.
 * Clicking a node — or focusing it and pressing Enter — opens its details.
 */
import "@xyflow/react/dist/style.css";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  BaseEdge,
  Controls,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  ReactFlow,
  getBezierPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeChangeset,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import { AlertTriangle, FileText, GraduationCap } from "lucide-react";
import { MasteryGlyph } from "@/components/ui";
import { cn } from "@/lib/cn";
import { LEVEL_LABEL } from "@/modules/mastery/types";
import {
  EDGE_STYLE,
  NODE_SIZE,
  layoutGraph,
  edgeKey,
  type GraphEdgeType,
  type VGEdge,
  type VGNode,
} from "./model";

type VaultNodeData = { node: VGNode };
type VaultFlowNode = Node<VaultNodeData, "vault">;
type VaultEdgeData = { kind: GraphEdgeType };
type VaultFlowEdge = Edge<VaultEdgeData, "vault">;

const hiddenHandle: CSSProperties = {
  opacity: 0,
  pointerEvents: "none",
  width: 1,
  height: 1,
  minWidth: 0,
  minHeight: 0,
  border: 0,
};

function Handles() {
  return (
    <>
      <Handle
        id="tl"
        type="target"
        position={Position.Left}
        isConnectable={false}
        style={hiddenHandle}
      />
      <Handle
        id="tr"
        type="target"
        position={Position.Right}
        isConnectable={false}
        style={hiddenHandle}
      />
      <Handle
        id="sl"
        type="source"
        position={Position.Left}
        isConnectable={false}
        style={hiddenHandle}
      />
      <Handle
        id="sr"
        type="source"
        position={Position.Right}
        isConnectable={false}
        style={hiddenHandle}
      />
    </>
  );
}

const VaultNode = memo(function VaultNode({ data, selected }: NodeProps<VaultFlowNode>) {
  const n = data.node;
  const size = NODE_SIZE[n.type];
  const ring = selected ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas" : "";
  if (n.type === "course") {
    return (
      <div
        style={{ width: size.w, minHeight: size.h }}
        className={cn(
          "flex items-center gap-2.5 rounded-xl border-2 border-line-strong bg-surface-2 px-3 py-2 shadow-card",
          ring,
        )}
      >
        <GraduationCap aria-hidden="true" className="size-5 shrink-0 text-ink-2" />
        <div className="min-w-0">
          <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-muted">
            Course
          </p>
          <p className="truncate font-display text-sm font-semibold text-ink">{n.label}</p>
        </div>
        <Handles />
      </div>
    );
  }
  if (n.type === "skill") {
    const level = n.level ?? "not_started";
    return (
      <div
        style={{ width: size.w, minHeight: size.h }}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 shadow-card",
          ring,
        )}
      >
        <MasteryGlyph level={level} className="size-4" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[0.8125rem] font-medium leading-snug text-ink">
            {n.label}
          </p>
          <p className="text-[0.6875rem] text-muted">
            {LEVEL_LABEL[level]}
            {n.needsReview ? " · needs review" : ""}
          </p>
        </div>
        <Handles />
      </div>
    );
  }
  if (n.type === "note") {
    return (
      <div
        style={{ width: size.w, minHeight: size.h }}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-accent/40 bg-accent-soft px-2.5 py-1.5 shadow-card",
          ring,
        )}
      >
        <FileText aria-hidden="true" className="size-4 shrink-0 text-accent-ink" />
        <div className="min-w-0">
          <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-accent-ink/80">
            Note
          </p>
          <p className="truncate text-[0.8125rem] font-medium text-ink">{n.label}</p>
        </div>
        <Handles />
      </div>
    );
  }
  return (
    <div
      style={{ width: size.w, minHeight: size.h }}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-dashed border-m-review bg-m-review-soft px-2.5 py-1",
        ring,
      )}
    >
      <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0 text-m-review" />
      <p className="truncate text-xs font-medium text-ink-2">
        <span className="sr-only">Possible misconception: </span>
        {n.label}
      </p>
      <Handles />
    </div>
  );
});

function VaultEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<VaultFlowEdge>) {
  const kind = data?.kind ?? "REFERENCES";
  const s = EDGE_STYLE[kind];
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={s.arrow ? `url(#vault-arrow-${kind})` : undefined}
      style={{
        stroke: s.color,
        strokeWidth: selected ? s.width + 1 : s.width,
        strokeDasharray: s.dash,
        opacity: 0.85,
      }}
    />
  );
}

const nodeTypes = { vault: VaultNode };
const edgeTypes = { vault: VaultEdge };

/** SVG arrowheads per edge type (colour from tokens, so they follow the theme). */
function ArrowDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <defs>
        {(Object.keys(EDGE_STYLE) as GraphEdgeType[]).map((k) => (
          <marker
            key={k}
            id={`vault-arrow-${k}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" style={{ fill: EDGE_STYLE[k].color }} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}

export interface GraphCanvasProps {
  nodes: VGNode[];
  edges: VGEdge[];
  onOpenNode: (id: string) => void;
  /** Bump to re-fit the view (e.g. after filters change). */
  fitKey: string;
}

export default function GraphCanvas({ nodes, edges, onOpenNode, fitKey }: GraphCanvasProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const instance = useRef<ReactFlowInstance<VaultFlowNode, VaultFlowEdge> | null>(null);

  const positions = useMemo(() => layoutGraph(nodes, edges), [nodes, edges]);

  const flowNodes = useMemo<VaultFlowNode[]>(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: "vault",
        position: positions.get(n.id) ?? { x: 0, y: 0 },
        data: { node: n },
        draggable: false,
        connectable: false,
        selected: n.id === selectedId,
        ariaRole: "button",
        domAttributes: { "aria-roledescription": n.type === "skill" ? "concept" : n.type },
      })),
    [nodes, positions, selectedId],
  );

  const flowEdges = useMemo<VaultFlowEdge[]>(() => {
    return edges.map((e) => {
      const s = positions.get(e.source) ?? { x: 0, y: 0 };
      const t = positions.get(e.target) ?? { x: 0, y: 0 };
      const forward = s.x <= t.x;
      return {
        id: edgeKey(e),
        source: e.source,
        target: e.target,
        sourceHandle: forward ? "sr" : "sl",
        targetHandle: forward ? "tl" : "tr",
        type: "vault",
        data: { kind: e.type },
        focusable: false,
        selectable: false,
      };
    });
  }, [edges, positions]);

  const onNodesChange = useCallback(
    (changes: NodeChangeset<VaultFlowNode>) => {
      const selects = changes.getByType("select");
      if (selects.length === 0) return;
      const chosen = selects.find((c) => "selected" in c && c.selected);
      if (chosen) {
        setSelectedId(chosen.id);
        onOpenNode(chosen.id);
      } else {
        setSelectedId(null);
      }
    },
    [onOpenNode],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void instance.current?.fitView({ padding: 0.12, duration: 250 });
    }, 60);
    return () => window.clearTimeout(handle);
  }, [fitKey]);

  const style = {
    "--xy-background-color": "var(--canvas)",
    "--xy-background-pattern-color": "var(--line-strong)",
    "--xy-controls-button-background-color": "var(--surface)",
    "--xy-controls-button-background-color-hover": "var(--surface-2)",
    "--xy-controls-button-color": "var(--ink-2)",
    "--xy-controls-button-color-hover": "var(--ink)",
    "--xy-controls-button-border-color": "var(--line)",
    "--xy-controls-box-shadow": "var(--shadow-sm)",
    "--xy-attribution-background-color": "transparent",
  } as CSSProperties;

  return (
    <div className="relative size-full">
      <ArrowDefs />
      <ReactFlow<VaultFlowNode, VaultFlowEdge>
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_e, node) => {
          setSelectedId(node.id);
          onOpenNode(node.id);
        }}
        onInit={(rf) => {
          instance.current = rf;
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.1}
        maxZoom={1.75}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: false }}
        style={style}
        aria-label="Knowledge graph canvas. Use Tab to move between items and Enter to open one, or switch to List view."
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} />
        <Controls
          showInteractive={false}
          position="bottom-right"
          aria-label="Zoom and fit controls"
        />
      </ReactFlow>
    </div>
  );
}
