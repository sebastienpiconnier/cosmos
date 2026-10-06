// La toile : on double-clique n'importe où pour créer une carte, on tire un fil
// d'un point de connexion à une autre carte, on double-clique un fil pour l'étiqueter.

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import { useCosmos } from "../store";
import { CardNode } from "./CardNode";
import { FloatingEdge } from "./FloatingEdge";
import { typeInfo } from "../types";

const nodeTypes = { card: CardNode };
const edgeTypes = { floating: FloatingEdge };

interface LabelEditor {
  edgeId: string;
  x: number;
  y: number;
  value: string;
}

export function Toile() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addCard, renameLink, focusId, setView } =
    useCosmos();
  const { screenToFlowPosition, fitView } = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);
  const [labelEditor, setLabelEditor] = useState<LabelEditor | null>(null);
  const edgeCountBeforeConnect = useRef(0);

  // Arrivée depuis la Bible : on centre la carte demandée.
  useEffect(() => {
    if (!focusId) return;
    const t = setTimeout(() => {
      fitView({ nodes: [{ id: focusId }], duration: 400, maxZoom: 1.2 });
      setView("toile", null);
    }, 50);
    return () => clearTimeout(t);
  }, [focusId, fitView, setView]);

  const createAt = (clientX: number, clientY: number) => {
    const pos = screenToFlowPosition({ x: clientX, y: clientY });
    addCard({ x: pos.x - 20, y: pos.y - 20 }); // la carte prend le focus elle-même
  };

  const onDoubleClick = (e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).classList.contains("react-flow__pane")) createAt(e.clientX, e.clientY);
  };

  const openLabelEditor = (edge: Edge, x: number, y: number) => {
    const rect = wrapper.current?.getBoundingClientRect();
    setLabelEditor({ edgeId: edge.id, x: x - (rect?.left ?? 0), y: y - (rect?.top ?? 0), value: String(edge.label ?? "") });
  };

  const commitLabel = () => {
    if (labelEditor) renameLink(labelEditor.edgeId, labelEditor.value.trim());
    setLabelEditor(null);
  };

  return (
    <div className="toile" ref={wrapper} onDoubleClick={onDoubleClick}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnectStart={() => (edgeCountBeforeConnect.current = useCosmos.getState().edges.length)}
        onConnect={onConnect}
        onConnectEnd={(event) => {
          // Un fil vient d'être créé : on propose tout de suite de l'étiqueter.
          const all = useCosmos.getState().edges;
          if (all.length > edgeCountBeforeConnect.current) {
            const p = "changedTouches" in event ? event.changedTouches[0] : event;
            openLabelEditor(all[all.length - 1], p.clientX, p.clientY);
          }
        }}
        onEdgeDoubleClick={(e, edge) => {
          e.stopPropagation();
          openLabelEditor(edge, e.clientX, e.clientY);
        }}
        connectionMode={ConnectionMode.Loose}
        zoomOnDoubleClick={false}
        deleteKeyCode={["Delete", "Backspace"]}
        minZoom={0.15}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        defaultEdgeOptions={{
          type: "floating",
          style: { stroke: "#3F43C4", strokeWidth: 1.6 },
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 999,
          labelStyle: { fill: "#2A2D93", fontWeight: 500, fontSize: 12 },
          labelBgStyle: { fill: "#FFFFFF", stroke: "#C9CCD8" },
        }}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#C9CCD8" />
        <Controls showInteractive={false} position="bottom-right" />
        <MiniMap
          position="top-right"
          pannable
          zoomable
          nodeColor={(n) => typeInfo((n.data as { type: Parameters<typeof typeInfo>[0] }).type).color}
          maskColor="rgba(238,240,244,0.7)"
        />
      </ReactFlow>

      {labelEditor && (
        <input
          className="label-editor"
          style={{ left: labelEditor.x, top: labelEditor.y }}
          autoFocus
          placeholder="Nature du lien (ex. soupçonne)"
          aria-label="Étiquette du fil"
          value={labelEditor.value}
          onChange={(e) => setLabelEditor({ ...labelEditor, value: e.target.value })}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitLabel();
            if (e.key === "Escape") setLabelEditor(null);
          }}
        />
      )}

      <div className="toile-hint">
        Double-clic pour écrire · Tire un fil depuis un bord · <strong>/</strong> pour transformer une carte
      </div>
    </div>
  );
}
