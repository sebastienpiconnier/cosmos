// La toile : on crée une carte n'importe où (double-clic à la souris, appui long
// au doigt, ou bouton « + »), on tire un fil d'un point de connexion vers une autre
// carte, on double-clique (ou touche, sur écran tactile) un fil pour l'étiqueter.

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
import { isTouch } from "../platform";

const LONG_PRESS_MS = 500;
const LONG_PRESS_TOLERANCE = 10; // px de mouvement avant d'abandonner

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
  const touch = isTouch();

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

  const isPane = (target: EventTarget | null) =>
    target instanceof HTMLElement && target.classList.contains("react-flow__pane");

  const onDoubleClick = (e: ReactMouseEvent) => {
    if (isPane(e.target)) createAt(e.clientX, e.clientY);
  };

  // Bouton « + » : nouvelle carte au centre de l'écran, légèrement décalée
  // à chaque appui pour ne pas empiler les cartes.
  const addCount = useRef(0);
  const createInCenter = () => {
    const rect = wrapper.current?.getBoundingClientRect();
    if (!rect) return;
    const shift = (addCount.current++ % 5) * 28;
    createAt(rect.left + rect.width / 2 - 100 + shift, rect.top + rect.height / 2 - 60 + shift);
  };

  // Appui long sur la toile (écran tactile ou stylet) : nouvelle carte à cet endroit.
  // Au relâchement, le navigateur émule mousedown/click sous le doigt, c'est-à-dire
  // sur la carte qu'on vient de créer : on avale ces événements pendant un court instant,
  // sinon ils déplaceraient le focus (ou ouvriraient le menu du type).
  const createAtRef = useRef(createAt);
  createAtRef.current = createAt;
  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let start: { x: number; y: number } | null = null;
    let fired = false;
    let swallowUntil = 0;
    const cancel = () => {
      clearTimeout(timer);
      start = null;
    };
    const down = (e: PointerEvent) => {
      fired = false;
      if (e.pointerType === "mouse" || !e.isPrimary || !isPane(e.target)) return;
      start = { x: e.clientX, y: e.clientY };
      timer = setTimeout(() => {
        if (!start) return;
        fired = true;
        navigator.vibrate?.(10);
        createAtRef.current(start.x, start.y);
        start = null;
      }, LONG_PRESS_MS);
    };
    const move = (e: PointerEvent) => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > LONG_PRESS_TOLERANCE) cancel();
    };
    const touchEnd = (e: TouchEvent) => {
      if (fired) {
        if (e.cancelable) e.preventDefault();
        swallowUntil = Date.now() + 400;
      }
      fired = false;
    };
    const swallow = (e: Event) => {
      if (Date.now() < swallowUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const ghostEvents = ["mousedown", "mouseup", "click"] as const;
    ghostEvents.forEach((t) => window.addEventListener(t, swallow, true));
    // Phase de capture : la toile (d3-zoom) stoppe la propagation des événements tactiles.
    el.addEventListener("pointerdown", down, true);
    el.addEventListener("pointermove", move, true);
    el.addEventListener("pointerup", cancel, true);
    el.addEventListener("pointercancel", cancel, true);
    el.addEventListener("touchend", touchEnd, { capture: true, passive: false });
    return () => {
      cancel();
      el.removeEventListener("pointerdown", down, true);
      el.removeEventListener("pointermove", move, true);
      el.removeEventListener("pointerup", cancel, true);
      el.removeEventListener("pointercancel", cancel, true);
      el.removeEventListener("touchend", touchEnd, true);
      ghostEvents.forEach((t) => window.removeEventListener(t, swallow, true));
    };
  }, []);

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
        // Au doigt, le double-tap sur un fil fin est laborieux : un simple appui suffit.
        onEdgeClick={(e, edge) => {
          if (touch) openLabelEditor(edge, e.clientX, e.clientY);
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

      <button type="button" className="add-card" onClick={createInCenter}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nouvelle carte
      </button>

      <div className="toile-hint">
        {touch ? "Appui long pour écrire" : "Double-clic pour écrire"} · Tire un fil depuis un bord ·{" "}
        <strong>/</strong> ou l'étiquette pour transformer
      </div>
    </div>
  );
}
