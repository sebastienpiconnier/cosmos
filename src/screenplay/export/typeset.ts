// Composition du scénario en pages : chaque ligne reçoit sa page, sa ligne et sa colonne.
// Fonction pure, sans dépendance au PDF : c'est ici que se décide la pagination réelle.
// Mêmes largeurs et mêmes règles que l'estimation (paginate.ts), plus la coupe des répliques.

import type { Screenplay, ScreenplayElement } from "../model";
import type { Layout } from "../layout";
import { wrap } from "../paginate";

export interface TypesetLine {
  /** Ligne dans la page, à partir de 0. */
  row: number;
  /** Colonne en caractères depuis la marge gauche (négative : dans la marge). */
  column: number;
  text: string;
  bold?: boolean;
}

export interface TypesetPage {
  /** Numéro de page, à partir de 1 (la page de titre n'est pas numérotée). */
  number: number;
  lines: TypesetLine[];
}

export interface TypesetStrings {
  /** En bas de page, quand une réplique continue : « (À SUIVRE) », “(MORE)”. */
  more: string;
  /** Après le nom du personnage, en haut de la page suivante : « (SUITE) », “(CONT'D)”. */
  contd: string;
}

/** Ce qui ne s'imprime pas : notes [[…]] et texte mis de côté dans une ligne. */
export function printable(text: string): string {
  return text
    .replace(/\[\[[\s\S]*?\]\]/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, "").replace(/(\S) {2,}/g, "$1 "))
    .join("\n")
    .trim();
}

const SPEECH = new Set(["parenthetical", "dialogue"]);

export function typeset(elements: ScreenplayElement[], layout: Layout, locale: string, strings: TypesetStrings): TypesetPage[] {
  const perPage = layout.linesPerPage;
  const width = layout.columns.action;
  const pages: TypesetPage[] = [];
  let index = 0; // page courante
  let used = 0; // lignes prises sur la page courante
  const upper = (s: string) => s.toLocaleUpperCase(locale);

  const page = () => (pages[index] ??= { number: index + 1, lines: [] });
  const newPage = () => {
    index++;
    used = 0;
  };
  const put = (text: string, column: number, bold = false) => {
    const line: TypesetLine = { row: used, column, text };
    if (bold) line.bold = true;
    page().lines.push(line);
    used++;
  };
  /** Ligne vide de séparation, sauf en haut de page. Rend faux s'il a fallu changer de page. */
  const open = (keepWith: number) => {
    const gap = used === 0 ? 0 : 1;
    if (used + gap + keepWith > perPage) newPage();
    else used += gap;
  };
  /** Des lignes qui peuvent se poursuivre sur la page suivante. */
  const flow = (lines: string[], column: (line: string) => number, bold = false) => {
    open(1);
    for (const line of lines) {
      if (used === perPage) newPage();
      put(line, column(line), bold);
    }
  };

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.type === "pageBreak") {
      if (used > 0) newPage();
      continue;
    }
    const text = printable(el.text);
    if (text === "") continue;

    switch (el.type) {
      case "sceneHeading": {
        const lines = wrap(upper(text), width);
        // Jamais en bas de page : il lui faut une ligne vide et une ligne de texte.
        open(lines.length + 2);
        if (el.sceneNumber) {
          page().lines.push({ row: used, column: -(el.sceneNumber.length + 2), text: el.sceneNumber, bold: true });
          page().lines.push({ row: used, column: width + 2, text: el.sceneNumber, bold: true });
        }
        for (const line of lines) put(line, 0, true);
        break;
      }
      case "action":
        flow(wrap(text, width), () => 0);
        break;
      case "transition":
        flow(wrap(upper(text), width), (line) => width - line.length);
        break;
      case "centered":
        flow(wrap(text, width), (line) => Math.floor((width - line.length) / 2));
        break;
      case "character": {
        // La réplique entière : le nom, puis les didascalies et le dialogue qui suivent.
        const cue = wrap(upper(text), layout.columns.character);
        const body: { text: string; column: number }[] = [];
        while (i + 1 < elements.length && SPEECH.has(elements[i + 1].type)) {
          const next = elements[++i];
          const kind = next.type as "parenthetical" | "dialogue";
          for (const line of wrap(printable(next.text), layout.columns[kind])) {
            if (line !== "" || kind === "dialogue") body.push({ text: line, column: layout.indent[kind] });
          }
        }
        speech(cue, body);
        break;
      }
      case "parenthetical":
      case "dialogue":
        // Sans personnage au-dessus (fichier venu d'ailleurs) : on garde le retrait.
        flow(wrap(text, layout.columns[el.type]), () => layout.indent[el.type as "parenthetical" | "dialogue"]);
        break;
      default:
        break; // notes, sections, synopsis, texte mis de côté : hors impression
    }
  }

  /** Pose une réplique ; si elle dépasse la page, la coupe avec (À SUIVRE) et reprend le nom (SUITE). */
  function speech(cue: string[], body: { text: string; column: number }[]) {
    let name = cue;
    let rest = body;
    for (;;) {
      const gap = used === 0 ? 0 : 1;
      const room = perPage - used - gap;
      if (name.length + rest.length <= room) {
        used += gap;
        for (const line of name) put(line, layout.indent.character);
        for (const line of rest) put(line.text, line.column);
        return;
      }
      // Pas la place pour le nom, une ligne et (À SUIVRE) : toute la réplique passe à la page suivante.
      if (room < name.length + 2 && used > 0) {
        newPage();
        continue;
      }
      used += gap;
      for (const line of name) put(line, layout.indent.character);
      const fits = Math.max(1, perPage - used - 1);
      for (const line of rest.slice(0, fits)) put(line.text, line.column);
      put(strings.more, layout.indent.character);
      rest = rest.slice(fits);
      name = wrap(`${cue.join(" ")} ${strings.contd}`, layout.columns.character);
      newPage();
    }
  }

  return pages;
}

/** Page de titre : titre, mention et auteur centrés ; contact et date en bas à gauche. */
export function typesetTitlePage(titlePage: Screenplay["titlePage"], layout: Layout): TypesetLine[] {
  const field = (...names: string[]) => {
    const key = Object.keys(titlePage).find((k) => names.includes(k.trim().toLowerCase()));
    return key ? printable(titlePage[key]) : "";
  };
  const width = layout.columns.action;
  const lines: TypesetLine[] = [];
  const centered = (text: string, row: number, bold = false) => {
    for (const line of wrap(text, width)) {
      const entry: TypesetLine = { row: row++, column: Math.floor((width - line.length) / 2), text: line };
      if (bold) entry.bold = true;
      lines.push(entry);
    }
    return row;
  };

  let row = Math.floor(layout.linesPerPage / 3);
  const title = field("title");
  if (title) row = centered(title, row, true) + 1;
  for (const text of [field("credit"), field("author", "authors"), field("source")]) {
    if (text) row = centered(text, row) + 1;
  }

  const bottom = [field("contact"), field("draft date"), field("copyright")].filter(Boolean).flatMap((text) => wrap(text, width));
  bottom.forEach((text, i) => lines.push({ row: layout.linesPerPage - bottom.length + i, column: 0, text }));
  return lines;
}
