// Fenêtres par-dessus l'app : la liste des raccourcis clavier (Cmd/Ctrl + /) et « À propos de Cosmos ».
// Ouvertes depuis les Réglages ou au clavier ; <dialog> natif : Échap ferme, le focus est retenu dedans.

import { useEffect, useRef } from "react";
import { useCosmos } from "../store";
import { useT } from "../i18n";
import { SHORTCUT_GROUPS, type ShortcutGroup } from "../shortcuts";
import { isAppleKeyboard, openExternal } from "../platform";
import { version } from "../../package.json";
import { TrashList } from "./TrashList";

const REPO = "https://github.com/sebastienpiconnier/cosmos";

export function Dialogs() {
  const dialog = useCosmos((s) => s.dialog);
  const setDialog = useCosmos((s) => s.setDialog);
  const ref = useRef<HTMLDialogElement>(null);
  const t = useT();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (dialog && !el.open) el.showModal?.();
    if (!dialog && el.open) el.close();
  }, [dialog]);

  const apple = isAppleKeyboard();
  const keyName = (k: string) =>
    ({ Mod: apple ? "⌘" : "Ctrl", Shift: apple ? "⇧" : t.shortcuts.shift, Alt: apple ? "⌥" : "Alt", Entrée: t.shortcuts.enter, Échap: t.shortcuts.escape, Suppr: t.shortcuts.delete })[k] ?? k;

  return (
    <dialog ref={ref} className="app-dialog" aria-labelledby="app-dialog-title" onClose={() => setDialog(null)}>
      {dialog === "shortcuts" && (
        <>
          <h2 id="app-dialog-title">{t.shortcuts.title}</h2>
          <div className="shortcut-groups">
            {(Object.keys(SHORTCUT_GROUPS) as ShortcutGroup[]).map((group) => (
              <section key={group}>
                <h3>{t.shortcuts.groups[group]}</h3>
                <dl>
                  {SHORTCUT_GROUPS[group].map(([item, keys]) => (
                    <div key={item}>
                      <dt>{t.shortcuts.items[item]}</dt>
                      <dd>
                        {keys.map((k, i) => (
                          <kbd key={i}>{keyName(k)}</kbd>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </>
      )}
      {dialog === "trash" && <TrashList />}
      {dialog === "about" && (
        <div className="about">
          <h2 id="app-dialog-title">
            Cosmos <span className="about-version">{version}</span>
          </h2>
          <p className="about-tagline">{t.app.tagline}</p>
          <p>{t.about.intro}</p>
          <ul>
            {t.about.pillars.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <h3>{t.about.creditsTitle}</h3>
          <p>{t.about.author}</p>
          <p>{t.about.credits}</p>
          <p>{t.about.license}</p>
          <p>
            {t.about.source}{" "}
            <a className="about-link" href={REPO} onClick={(e) => (e.preventDefault(), void openExternal(REPO))}>
              {REPO}
            </a>
          </p>
        </div>
      )}
      <div className="assistant-actions app-dialog-actions">
        <button type="button" className="is-primary" onClick={() => setDialog(null)} autoFocus>
          {t.gallery.close}
        </button>
      </div>
    </dialog>
  );
}
