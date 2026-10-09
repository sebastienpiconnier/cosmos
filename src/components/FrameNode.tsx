// Un cadre de regroupement : un rectangle nommé posé derrière les cartes. On le déplace par son
// en-tête (les cartes qu'il contient suivent, voir le store), on le redimensionne par ses bords.
// Son intérieur laisse passer les clics : on peut toujours créer une carte dedans.

import { memo } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { useCosmos, type FrameNode as FrameNodeT } from "../store";
import { useT } from "../i18n";

function FrameNodeImpl({ id, data, selected }: NodeProps<FrameNodeT>) {
  const t = useT().toile;
  const updateFrame = useCosmos((s) => s.updateFrame);
  const deleteFrame = useCosmos((s) => s.deleteFrame);

  return (
    <div className={`frame${selected ? " is-selected" : ""}${data.kind === "research" ? " is-research" : ""}`}>
      <NodeResizer minWidth={220} minHeight={140} isVisible={selected} lineClassName="frame-resize-line" handleClassName="frame-resize-handle" />
      <div className="frame-handle">
        <input
          type="text"
          className="frame-title nodrag"
          value={data.title}
          size={Math.max(10, data.title.length)}
          placeholder={t.frameTitle}
          aria-label={t.frameTitleAria}
          autoComplete="off"
          onChange={(e) => updateFrame(id, { title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
          }}
        />
        <button type="button" className="card-delete nodrag" aria-label={t.deleteFrame} title={t.deleteFrame} onClick={() => deleteFrame(id)}>
          ×
        </button>
      </div>
    </div>
  );
}

export const FrameNode = memo(FrameNodeImpl);
