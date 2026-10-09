// @vitest-environment happy-dom
// Corrections d'octobre 2026, quatrième série : Markdown (frappe, collage, fichiers), cases à cocher et
// « À faire », mode focus (phrase), collage sur le canevas.

import { describe, expect, it } from "vitest";
import { looksLikeMarkdown, markHighlights } from "../markdownText";
import { htmlToMarkdown, markdownToHtml } from "../storage/markdown";
import { collectTodos, revisitsIn, tasksIn, toggleTask } from "../todos";
import { sentenceAt } from "../focusText";
import { clipFromText } from "../clip";
import { htmlToBlocks } from "../export/doc";
import { SHORTCUT_GROUPS } from "../shortcuts";
import { fr } from "../i18n/fr";

const TASKS =
  '<ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Vérifier l’âge</p></div></li>' +
  '<li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Fait</p></div></li></ul>';

describe("Markdown", () => {
  it("reconnaît un texte collé en Markdown, pas une phrase ordinaire", () => {
    for (const md of ["# Titre", "- un\n- deux", "1. un", "un **mot** gras", "un *mot* penché", "- [ ] tâche", "> cité", "[lien](https://x.fr)", "==à revoir=="]) expect(looksLikeMarkdown(md)).toBe(true);
    for (const text of ["Une phrase simple.", "3 * 4 = 12", "prix : 5 € - 10 %", "adresse@site.fr"]) expect(looksLikeMarkdown(text)).toBe(false);
    expect(markHighlights("un ==passage== ici")).toBe("un <mark>passage</mark> ici");
  });

  it("cases à cocher et « à reprendre » font l'aller-retour par le fichier", () => {
    const md = htmlToMarkdown(`${TASKS}<p>Un <mark>passage</mark> et <strong>gras</strong></p>`);
    expect(md).toBe("- [ ] Vérifier l’âge\n- [x] Fait\n\nUn <mark>passage</mark> et **gras**");
    const html = markdownToHtml(md);
    expect(html).toContain('<ul data-type="taskList">');
    expect(html).toMatch(/<li data-type="taskItem" data-checked="false">\s*Vérifier/);
    expect(html).toMatch(/data-checked="true"/);
    expect(html).toContain("<mark>passage</mark>");
    // Rien d'autre ne passe : pas d'attribut inconnu, pas de case laissée en <input>.
    expect(markdownToHtml('<ul data-type="evil"><li data-checked="peut-être" onclick="x()">a</li></ul>')).toBe("<ul><li>a</li></ul>");
    expect(html).not.toContain("<input");
  });

  it("export : ☐ et ☑ devant les cases", () => {
    const blocks = htmlToBlocks(TASKS);
    expect(blocks.map((b) => b.runs.map((r) => r.text).join(""))).toEqual(["☐ Vérifier l’âge", "☑ Fait"]);
  });
});

describe("À faire", () => {
  it("rassemble cases ouvertes, passages à reprendre, questions en attente et cartes Question", () => {
    expect(tasksIn(TASKS)).toEqual([{ text: "Vérifier l’âge", done: false }, { text: "Fait", done: true }]);
    expect(toggleTask(TASKS, 0)).toContain('<li data-checked="true" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Vérifier');
    expect(toggleTask(TASKS, 9)).toBe(TASKS);
    expect(revisitsIn("<p>Un <mark>beau &amp; long</mark> passage</p>")).toEqual(["beau & long"]);
    const todos = collectTodos(
      [
        { id: "p", type: "personnage", title: "Inès", html: TASKS, questions: ["Que cache-t-elle ?"] },
        { id: "q", type: "question", title: "Pourquoi le 13 ?", html: "" },
        { id: "s", type: "scene", title: "Arrivée", html: "" },
      ],
      { s: "<p>Elle <mark>court</mark>.</p>", disparue: "<p><mark>x</mark></p>" },
    );
    expect(todos.map((t) => [t.kind, t.cardId, t.where, t.text])).toEqual([
      ["task", "p", "card", "Vérifier l’âge"],
      ["question", "p", "card", "Que cache-t-elle ?"],
      ["open", "q", "card", "Pourquoi le 13 ?"],
      ["revisit", "s", "manuscript", "court"],
    ]);
  });
});

describe("mode focus et collage", () => {
  it("la phrase du curseur", () => {
    const text = "Elle monte. « Qui est là ? » demande-t-elle… Personne ne répond.";
    expect(text.slice(sentenceAt(text, 3).from, sentenceAt(text, 3).to)).toBe("Elle monte.");
    expect(text.slice(sentenceAt(text, 15).from, sentenceAt(text, 15).to)).toBe("« Qui est là ? »");
    const last = sentenceAt(text, text.length);
    expect(text.slice(last.from, last.to)).toBe("Personne ne répond.");
    expect(sentenceAt("Sans point", 4)).toEqual({ from: 0, to: 10 });
  });

  it("un lien ou un texte collé sur le canevas", () => {
    expect(clipFromText(" https://www.gallica.bnf.fr/ark:/123 ")).toEqual({ title: "gallica.bnf.fr", url: "https://www.gallica.bnf.fr/ark:/123", markdown: "" });
    expect(clipFromText("Ligne 1\n\nLigne 2")).toEqual({ title: "", markdown: "> Ligne 1\n>\n> Ligne 2" });
    expect(clipFromText("   ")).toBeNull();
  });

  it("chaque raccourci décrit a son libellé", () => {
    for (const group of Object.values(SHORTCUT_GROUPS)) for (const [item] of group) expect(fr.shortcuts.items[item]).toBeTruthy();
  });
});
