// La toile : on crée une carte n'importe où (double-clic à la souris, appui long
// au doigt, ou bouton « + »), on tire un fil d'un point de connexion vers une autre
// carte, on double-clique (ou touche, sur écran tactile) un fil pour l'étiqueter.

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  SelectionMode,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import { useCosmos } from "../store";
import { CardNode } from "./CardNode";
import { FrameNode } from "./FrameNode";
import { FloatingEdge } from "./FloatingEdge";
import type { CardData } from "../types";
import { fmt, useT } from "../i18n";
import { useSettings } from "../settings";
import { isTouch } from "../platform";
import { documentExtension, imageExtension } from "../media";
import { clipFromText } from "../clip";

const LONG_PRESS_MS = 500;
const LONG_PRESS_TOLERANCE = 10; // px de mouvement avant d'abandonner

const nodeTypes = { card: CardNode, frame: FrameNode };
const edgeTypes = { floating: FloatingEdge };

interface LabelEditor {
  edgeId: string;
  x: number;
  y: number;
  value: string;
}

export function Toile() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addCard, renameLink, focusId, setView, undo, redo } =
    useCosmos();
  const frames = useCosmos((s) => s.frames);
  const addFrame = useCosmos((s) => s.addFrame);
  // Les cadres d'abord : ils se dessinent derrière les cartes.
  const allNodes = useMemo(() => [...frames, ...nodes], [frames, nodes]);
  const canUndo = useCosmos((s) => s.past.length > 0);
  const canRedo = useCosmos((s) => s.future.length > 0);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);
  const [labelEditor, setLabelEditor] = useState<LabelEditor | null>(null);
  const edgeCountBeforeConnect = useRef(0);
  const touch = isTouch();
  const t = useT();
  const theme = useSettings((s) => s.theme);
  // Mode « Sélection » : glisser sur le canevas entoure des cartes au lieu de déplacer la vue (chemin du doigt).
  const [selecting, setSelecting] = useState(false);
  const selectedCards = nodes.filter((n) => n.selected).length;
  const selectedFrames = frames.filter((f) => f.selected).length;

  // Zone Recherche demandée (bouton ou nouvelle source) : on la cadre.
  const focusFrame = useCosmos((s) => s.focusFrame);
  useEffect(() => {
    if (!focusFrame) return;
    const timer = setTimeout(() => {
      fitView({ nodes: [{ id: focusFrame }], duration: 400, maxZoom: 1, padding: 0.15 });
      useCosmos.getState().clearFocusFrame();
    }, 60);
    return () => clearTimeout(timer);
  }, [focusFrame, fitView]);

  // Après « Organiser le canevas » : on cadre tout le projet.
  const fitRequest = useCosmos((s) => s.fitRequest);
  useEffect(() => {
    if (!fitRequest) return;
    const timer = setTimeout(() => fitView({ padding: 0.12, duration: 500 }), 60);
    return () => clearTimeout(timer);
  }, [fitRequest, fitView]);

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

  // Image déposée : sur une carte, elle devient son image ; sur le canevas, une carte Image à cet endroit.
  // Lien ou texte déposé depuis un navigateur : une carte Lien ou Extrait, là où on l'a lâché (une seule).
  const onDrop = async (e: React.DragEvent) => {
    const at = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    // Un PDF : une carte Document là où on l'a lâché (ou la carte vide sur laquelle on l'a lâché).
    const pdf = [...e.dataTransfer.files].find((f) => documentExtension(f.name));
    if (pdf) {
      e.preventDefault();
      const target = (e.target as HTMLElement).closest(".react-flow__node-card")?.getAttribute("data-id");
      const doc = { name: pdf.name, data: new Uint8Array(await pdf.arrayBuffer()) };
      const store = useCosmos.getState();
      const card = target ? store.nodes.find((n) => n.id === target)?.data : undefined;
      const blank = card && !card.fichier && !card.title.trim() && !card.image && !(card.html ?? "").replace(/<[^>]*>/g, "").trim();
      if (card && (blank || (card.type === "document" && !card.fichier))) await store.setCardDocument(card.id, doc);
      else await store.addDocument(doc, at);
      return;
    }
    const file = [...e.dataTransfer.files].find((f) => imageExtension(f.name));
    if (!file) {
      const link = e.dataTransfer.getData("text/uri-list").split("\n").find((l) => l && !l.startsWith("#"));
      const text = link?.trim() || e.dataTransfer.getData("text/plain");
      if (text && clipFromText(text)) {
        e.preventDefault();
        useCosmos.getState().addResearchClip(text, at);
      }
      return;
    }
    e.preventDefault();
    const cardId = (e.target as HTMLElement).closest(".react-flow__node-card")?.getAttribute("data-id");
    const image = { name: file.name, data: new Uint8Array(await file.arrayBuffer()) };
    const { setCardImage, addResearchImage } = useCosmos.getState();
    if (cardId) await setCardImage(cardId, image);
    else await addResearchImage(image, at);
  };

  const isPane = (target: EventTarget | null) =>
    target instanceof HTMLElement && target.classList.contains("react-flow__pane");

  const onDoubleClick = (e: ReactMouseEvent) => {
    if (isPane(e.target)) createAt(e.clientX, e.clientY);
  };

  // Bouton « + » et touche N : nouvelle carte au centre de l'écran (le store la décale si la place est prise).
  const createInCenter = () => {
    const rect = wrapper.current?.getBoundingClientRect();
    if (!rect) return;
    createAt(rect.left + rect.width / 2 - 100, rect.top + rect.height / 2 - 60);
  };

  // Nouveau cadre : autour des cartes sélectionnées, sinon au centre de l'écran.
  const createFrame = () => {
    const rect = wrapper.current?.getBoundingClientRect();
    if (!rect) return;
    addFrame(screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }));
  };

  // Raccourcis clavier : N (carte) et C (cadre), hors d'un champ ou d'une carte en cours d'écriture.
  const createInCenterRef = useRef(createInCenter);
  createInCenterRef.current = createInCenter;
  const createFrameRef = useRef(createFrame);
  createFrameRef.current = createFrame;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      // Alt + flèche droite ou gauche : élargir ou rétrécir les cartes sélectionnées.
      if (e.altKey && !e.metaKey && !e.ctrlKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        const { nodes: all, resizeCard } = useCosmos.getState();
        const chosen = all.filter((n) => n.selected);
        if (chosen.length === 0) return;
        e.preventDefault();
        for (const n of chosen) resizeCard(n.id, e.key === "ArrowRight" ? 40 : -40);
        return;
      }
      // Ctrl ou Cmd + A : toutes les cartes et tous les cadres. Échap : plus rien de sélectionné.
      if (key === "a" && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        useCosmos.getState().selectAll();
        return;
      }
      if (e.key === "Escape" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const { nodes: all, frames: boxesNow, clearSelection } = useCosmos.getState();
        if (all.some((n) => n.selected) || boxesNow.some((b) => b.selected)) clearSelection();
        setSelecting(false);
        return;
      }
      if ((key !== "n" && key !== "c") || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      e.preventDefault();
      if (key === "n") createInCenterRef.current();
      else createFrameRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Dernière position du pointeur sur le canevas : un collage y pose sa carte (sinon, au centre de la vue).
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const pasteAt = () => {
    const rect = wrapper.current?.getBoundingClientRect();
    const p = pointer.current;
    const inside = p && rect && p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom;
    if (inside) return screenToFlowPosition(p);
    return rect ? screenToFlowPosition({ x: rect.left + rect.width / 2 - 120, y: rect.top + rect.height / 2 - 75 }) : undefined;
  };
  const pasteAtRef = useRef(pasteAt);
  pasteAtRef.current = pasteAt;

  // Coller hors d'un champ : un lien, un texte ou une image devient une carte Lien, Extrait ou Image, là où l'on est.
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], dialog")) return;
      const data = e.clipboardData;
      if (!data) return;
      const store = useCosmos.getState();
      const image = [...data.files].find((f) => imageExtension(f.name) || f.type.startsWith("image/"));
      const at = pasteAtRef.current();
      const pdf = [...data.files].find((f) => documentExtension(f.name) || f.type === "application/pdf");
      if (pdf) {
        e.preventDefault();
        await store.addDocument({ name: documentExtension(pdf.name) ? pdf.name : "document.pdf", data: new Uint8Array(await pdf.arrayBuffer()) }, at);
        return;
      }
      if (image) {
        e.preventDefault();
        const name = imageExtension(image.name) ? image.name : `image.${image.type.split("/")[1] || "png"}`;
        await store.addResearchImage({ name, data: new Uint8Array(await image.arrayBuffer()) }, at);
        return;
      }
      const text = data.getData("text/plain");
      if (!clipFromText(text)) return;
      e.preventDefault();
      store.addResearchClip(text, at);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // Appui long sur la toile (écran tactile ou stylet) : nouvelle carte à cet endroit.
  // Au relâchement, le navigateur émule mousedown/click sous le doigt, c'est-à-dire
  // sur la carte qu'on vient de créer : on avale ces événements pendant un court instant,
  // sinon ils déplaceraient le focus (ou ouvriraient le menu du type).
  const createAtRef = useRef(createAt);
  createAtRef.current = createAt;
  // En mode Sélection, l'appui long trace le rectangle au lieu de créer une carte.
  const selectingRef = useRef(selecting);
  selectingRef.current = selecting;
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
      if (e.pointerType === "mouse" || !e.isPrimary || !isPane(e.target) || selectingRef.current) return;
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
    <div
      className="toile"
      ref={wrapper}
      onDoubleClick={onDoubleClick}
      onPointerMove={(e) => {
        pointer.current = { x: e.clientX, y: e.clientY };
      }}
      onDragOver={(e) => {
        const types = e.dataTransfer.types;
        if (!types.includes("Files") && !types.includes("text/uri-list") && !types.includes("text/plain")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={allNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnectStart={() => (edgeCountBeforeConnect.current = useCosmos.getState().edges.length)}
        onConnect={onConnect}
        // Clic droit sur le canevas : nouvelle carte à cet endroit (le menu du navigateur reste sur les cartes).
        onPaneContextMenu={(event) => {
          event.preventDefault();
          createAt(event.clientX, event.clientY);
        }}
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
        // Un clic (ou un appui) sur un fil ouvre son étiquette et le bouton « Délier ».
        onEdgeClick={(e, edge) => openLabelEditor(edge, e.clientX, e.clientY)}
        colorMode={theme}
        connectionMode={ConnectionMode.Loose}
        zoomOnDoubleClick={false}
        // Sélection multiple : Maj + glisser entoure (ou glisser seul en mode Sélection), Ctrl ou Cmd + clic ajoute.
        selectionOnDrag={selecting}
        panOnDrag={!selecting}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode={["Meta", "Control"]}
        deleteKeyCode={["Delete", "Backspace"]}
        minZoom={0.15}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        defaultEdgeOptions={{
          type: "floating",
          // Variables CSS : les fils suivent le mode clair/sombre.
          style: { stroke: "var(--edge)", strokeWidth: 1.6 },
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 999,
          labelStyle: { fill: "var(--accent-ink)", fontWeight: 500, fontSize: 12 },
          labelBgStyle: { fill: "var(--surface)", stroke: "var(--line-2)" },
        }}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} />
        <Controls showInteractive={false} position="bottom-right" />
        <MiniMap
          position="top-right"
          pannable
          zoomable
          // Classe plutôt que couleur : la teinte vient du CSS (clair/sombre).
          nodeClassName={(n) => (n.type === "frame" ? "minimap-frame" : `minimap-node type-${(n.data as CardData).type}`)}
        />
      </ReactFlow>

      {labelEditor && (
        <div className="label-editor" style={{ left: labelEditor.x, top: labelEditor.y }}>
          <input
            autoFocus
            placeholder={t.toile.labelPlaceholder}
            aria-label={t.toile.labelAria}
            value={labelEditor.value}
            onChange={(e) => setLabelEditor({ ...labelEditor, value: e.target.value })}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitLabel();
              if (e.key === "Escape") setLabelEditor(null);
            }}
          />
          {/* Délier : le fil part (annulable). Le focus reste dans le champ jusqu'au clic. */}
          <button
            type="button"
            className="label-unlink"
            aria-label={t.toile.unlink}
            title={t.toile.unlink}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              useCosmos.getState().removeLink(labelEditor.edgeId);
              setLabelEditor(null);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M9 7H7a5 5 0 0 0 0 10h2M15 7h2a5 5 0 0 1 3.5 8.5M8 12h3M4 4l16 16" />
            </svg>
            <span>{t.toile.unlinkShort}</span>
          </button>
        </div>
      )}

      <button type="button" className="add-card" title={t.toile.addCardHint} aria-keyshortcuts="N" onClick={createInCenter}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t.toile.addCard}
      </button>

      <div className="history-buttons">
        <button type="button" className="icon-button has-label" aria-label={t.toile.addFrame} title={t.toile.addFrameHint} aria-keyshortcuts="C" onClick={createFrame}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 3.2" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
          </svg>
          <span className="tool-label" aria-hidden="true">{t.toile.frameShort}</span>
        </button>
        <button type="button" className="icon-button has-label" aria-label={t.organize.button} title={t.organize.hint} onClick={() => useCosmos.getState().organizeCanvas()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
          </svg>
          <span className="tool-label" aria-hidden="true">{t.organize.short}</span>
        </button>
        <button
          type="button"
          className="icon-button has-label"
          aria-label={t.documents.import}
          title={t.documents.importHint}
          onClick={() => {
            const rect = wrapper.current?.getBoundingClientRect();
            const at = rect ? screenToFlowPosition({ x: rect.left + rect.width / 2 - 120, y: rect.top + rect.height / 2 - 120 }) : undefined;
            void useCosmos.getState().pickDocument(undefined, at);
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
            <path d="M14 3.5V8h4.5M12 11.5v6M9.5 15l2.5 2.5 2.5-2.5" />
          </svg>
          <span className="tool-label" aria-hidden="true">{t.documents.importShort}</span>
        </button>
        <button
          type="button"
          className={`icon-button has-label${selecting ? " is-on" : ""}`}
          aria-label={t.toile.select}
          aria-pressed={selecting}
          title={t.toile.selectHint}
          onClick={() => setSelecting(!selecting)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M4 16v2.5A1.5 1.5 0 0 0 5.5 20H8" />
            <path d="M12 12l8.5 3-3.6 1.4L15.5 20z" />
          </svg>
          <span className="tool-label" aria-hidden="true">{t.toile.selectShort}</span>
        </button>
        <button type="button" className="icon-button" disabled={!canUndo} aria-label={t.toile.undo} title={t.toile.undoHint} onClick={undo}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </button>
        <button type="button" className="icon-button" disabled={!canRedo} aria-label={t.toile.redo} title={t.toile.redoHint} onClick={redo}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 14l5-5-5-5" />
            <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
          </svg>
        </button>
      </div>

      {/* Plusieurs cartes choisies : ce qu'on peut en faire d'un coup, aussi au doigt (pas de clavier). */}
      {selectedCards + selectedFrames > 1 && (
        <div className="selection-bar" role="toolbar" aria-label={t.toile.select}>
          <span className="selection-count" aria-live="polite">
            {selectedFrames > 0 ? fmt(t.toile.selectedCountFrames, { n: selectedCards, f: selectedFrames }) : fmt(t.toile.selectedCount, { n: selectedCards })}
          </span>
          {selectedCards > 0 && (
            <button type="button" className="ghost-button" title={t.toile.selectionFrameHint} onClick={createFrame}>
              {t.toile.selectionFrame}
            </button>
          )}
          {selectedCards > 0 && (
            <button
              type="button"
              className="ghost-button"
              title={t.toile.selectionTrashHint}
              onClick={() => {
                const s = useCosmos.getState();
                s.deleteCards(s.nodes.filter((n) => n.selected).map((n) => n.id));
              }}
            >
              {t.toile.selectionTrash}
            </button>
          )}
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              useCosmos.getState().clearSelection();
              setSelecting(false);
            }}
          >
            {t.toile.selectionClear}
          </button>
        </div>
      )}

      <div className="toile-hint" hidden={selectedCards + selectedFrames > 1}>
        {touch ? t.toile.hintTouch : t.toile.hintMouse} · {t.toile.hintLink} · <strong>/</strong> {t.toile.hintTransform}
      </div>
    </div>
  );
}
