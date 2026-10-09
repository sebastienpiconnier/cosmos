// Export FDX : le format XML de Final Draft, lu aussi par Fade In, WriterDuet, Highland…
// Un paragraphe par élément. Les notes et le texte mis de côté ne sont pas exportés.

import type { Screenplay, ScreenplayElement } from "../model";
import { printable } from "./typeset";

const TYPES: Partial<Record<ScreenplayElement["type"], string>> = {
  sceneHeading: "Scene Heading",
  action: "Action",
  character: "Character",
  parenthetical: "Parenthetical",
  dialogue: "Dialogue",
  transition: "Transition",
  centered: "Action",
};

const UPPERCASE = new Set(["sceneHeading", "character", "transition"]);

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildFdx(screenplay: Screenplay, locale: string, numberScenes = false, underlineHeadings = false): string {
  const paragraphs: string[] = [];
  let scene = 0;
  for (const el of screenplay.elements) {
    if (el.type === "sceneHeading") scene++;
    const type = TYPES[el.type];
    let text = type ? printable(el.text) : "";
    if (!type || text === "") continue;
    if (UPPERCASE.has(el.type)) text = text.toLocaleUpperCase(locale);
    const attributes = [
      el.type === "centered" ? ' Alignment="Center"' : "",
      el.type === "sceneHeading" && (el.sceneNumber || numberScenes) ? ` Number="${escape(el.sceneNumber ?? String(scene))}"` : "",
      ` Type="${type}"`,
    ].join("");
    const style = el.type === "sceneHeading" && underlineHeadings ? ' Style="Underline"' : "";
    paragraphs.push(`    <Paragraph${attributes}>\n      <Text${style}>${escape(text)}</Text>\n    </Paragraph>`);
  }

  const field = (...names: string[]) => {
    const key = Object.keys(screenplay.titlePage).find((k) => names.includes(k.trim().toLowerCase()));
    return key ? printable(screenplay.titlePage[key]) : "";
  };
  const title = [field("title"), field("credit"), field("author", "authors"), field("draft date"), field("contact")]
    .filter(Boolean)
    .flatMap((text) => text.split("\n"))
    .map((line) => `      <Paragraph Alignment="Center" Type="General">\n        <Text>${escape(line)}</Text>\n      </Paragraph>`);

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>',
    '<FinalDraft DocumentType="Script" Template="No" Version="1">',
    "  <Content>",
    ...paragraphs,
    "  </Content>",
    ...(title.length > 0 ? ["  <TitlePage>", "    <Content>", ...title, "    </Content>", "  </TitlePage>"] : []),
    "</FinalDraft>",
    "",
  ].join("\n");
}
