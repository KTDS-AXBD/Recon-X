import { useCallback, useRef, useState, useEffect } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type NodeObject,
  type LinkObject,
} from "react-force-graph-2d";
import { Loader2 } from "lucide-react";
import type { GraphNode, GraphLink } from "@/api/ontology";

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  loading: boolean;
  error: string | null;
  onNodeClick?: (label: string) => void;
  selectedNode?: string | null;
  width: number;
  height: number;
}

type FGNode = NodeObject & GraphNode;
type FGLink = LinkObject & GraphLink;

/** Type-based colors: entity=blue, relation=purple, attribute=green */
const TYPE_COLORS: Record<string, string> = {
  entity: "#3B82F6",
  relation: "#9333EA",
  attribute: "#10B981",
};

export default function OntologyGraph({
  nodes,
  links,
  loading,
  error,
  onNodeClick,
  selectedNode,
  width,
  height,
}: Props) {
  const fgRef = useRef<ForceGraphMethods<FGNode, FGLink> | undefined>(
    undefined,
  );
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Zoom to fit on data change
  useEffect(() => {
    if (nodes.length > 0 && fgRef.current) {
      const timer = setTimeout(() => {
        fgRef.current?.zoomToFit(400, 60);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [nodes.length]);

  const nodeCanvasObject = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.label;
      const freq = node.frequency ?? 1;
      const nodeType = node.type ?? "entity";
      const isSelected = selectedNode === label;
      const isHovered = hoveredNode === label;
      const radius = Math.max(4, Math.min(20, Math.sqrt(freq) * 3));
      const fontSize = Math.max(10, 12 / globalScale);

      const x = node.x ?? 0;
      const y = node.y ?? 0;

      const color = TYPE_COLORS[nodeType] ?? "#999";
      ctx.fillStyle = isSelected
        ? "#1A365D"
        : isHovered
          ? color + "CC"
          : color + "99";

      // Draw shape by type: entity=circle, relation=diamond, attribute=rounded rect
      ctx.beginPath();
      if (nodeType === "relation") {
        // Diamond shape
        ctx.moveTo(x, y - radius);
        ctx.lineTo(x + radius, y);
        ctx.lineTo(x, y + radius);
        ctx.lineTo(x - radius, y);
        ctx.closePath();
      } else if (nodeType === "attribute") {
        // Rounded rectangle
        const w = radius * 1.6;
        const h = radius * 1.2;
        const r = radius * 0.3;
        ctx.moveTo(x - w + r, y - h);
        ctx.arcTo(x + w, y - h, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x - w, y + h, r);
        ctx.arcTo(x - w, y + h, x - w, y - h, r);
        ctx.arcTo(x - w, y - h, x + w, y - h, r);
        ctx.closePath();
      } else {
        // Circle (entity / default)
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
      }
      ctx.fill();

      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected ? "#1A365D" : color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw label
      if (globalScale > 0.5 || isSelected || isHovered) {
        ctx.font = `${isSelected ? "bold " : ""}${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = isSelected
          ? "#1A365D"
          : "var(--text-primary, #1a1a2e)";
        ctx.fillText(label, x, y + radius + 2);
      }

      // Frequency badge
      if (freq > 5 && globalScale > 0.8) {
        const badgeText = String(freq);
        ctx.font = `bold ${Math.max(8, 9 / globalScale)}px sans-serif`;
        const tw = ctx.measureText(badgeText).width;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x + radius * 0.7, y - radius * 0.7, tw / 2 + 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, x + radius * 0.7, y - radius * 0.7);
      }
    },
    [selectedNode, hoveredNode],
  );

  const linkCanvasObject = useCallback(
    (link: FGLink, ctx: CanvasRenderingContext2D) => {
      const src = link.source as unknown as FGNode;
      const tgt = link.target as unknown as FGNode;
      if (!src.x || !src.y || !tgt.x || !tgt.y) return;

      const w = Math.max(0.5, Math.min(4, (link.weight ?? 1) * 0.5));
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = "rgba(150, 150, 150, 0.3)";
      ctx.lineWidth = w;
      ctx.stroke();
    },
    [],
  );

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width, height }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--text-secondary)" }} />
        <span className="ml-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          그래프 데이터 로딩 중...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width, height, color: "var(--danger)" }}
      >
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width, height, color: "var(--text-secondary)" }}
      >
        <span className="text-sm">그래프 데이터가 없습니다</span>
      </div>
    );
  }

  return (
    <ForceGraph2D
      ref={fgRef as React.MutableRefObject<ForceGraphMethods<FGNode, FGLink>>}
      width={width}
      height={height}
      graphData={{ nodes: nodes as FGNode[], links: links as unknown as FGLink[] }}
      nodeId="id"
      nodeCanvasObject={nodeCanvasObject}
      nodePointerAreaPaint={(node: FGNode, color, ctx) => {
        const freq = node.frequency ?? 1;
        const radius = Math.max(4, Math.min(20, Math.sqrt(freq) * 3));
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, radius + 4, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      }}
      linkCanvasObject={linkCanvasObject}
      onNodeClick={(node: FGNode) => {
        onNodeClick?.(node.label);
      }}
      onNodeHover={(node: FGNode | null) => {
        setHoveredNode(node?.label ?? null);
      }}
      cooldownTicks={100}
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.3}
      backgroundColor="transparent"
    />
  );
}
