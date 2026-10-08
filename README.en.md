# Cosmos

[Français](README.md) · **English**

**From chaos to an ordered world: a canvas for novelists and screenwriters who build their story before writing it.**

![The Cosmos canvas: four cards (idea, character, place, scene) connected by labeled threads](docs/images/canvas-en.png)

[Download](#download) · [Features](#features) · [AI](#ai-if-you-want-it) · [Platforms](#platforms) · [Development](#development)

---

## The idea

A story rarely starts with chapter one. It starts with fragments: an image, a character, a place, a question with no answer yet. Cosmos gives those fragments somewhere to land, then helps them grow into a coherent world, an outline and finally a text.

In Greek, *kosmos* means the order of the world, born out of chaos. That is exactly the path the app takes you along.

Cosmos is made for “architect” writers, the ones who plan before they write. It rests on a few choices:

- **One content, several views.** Canvas, Bible, Outline and Manuscript are four readings of the same project. Nothing is ever copied from one view to another.
- **Structure emerges, you don’t configure it.** No forms, no required fields. A card is born an “Idea” and becomes a Character, a Place or a Scene when you decide so.
- **Three gestures are enough:** type, drag a thread, drop.
- **Your texts are yours.** A project is a folder of Markdown files, readable in any editor, with or without Cosmos. No account, no server.
- **AI asks questions, it doesn’t write for you.** It is optional, and you choose which one to plug in, including a model running on your own machine.
- **Free and open source.** Cosmos is free software, released under the GPL-3.0: you can use it, study it, change it and share it.

## Download

Installers for macOS (Apple Silicon and Intel), Windows and Linux are available in the [Releases](https://github.com/sebastienpiconnier/cosmos/releases).

> **First launch.** The app is not signed yet. On macOS, right-click the app, then “Open”. On Windows, if SmartScreen appears, click “More info”, then “Run anyway”.

Cosmos is under active development (version 0.1).

## Features

### The canvas

- **Free-form cards:** double-click or right-click the canvas, long-press with a finger, use the “New card” button or press `N`, and start writing its title (`Enter` moves on to the text). Rich text (bold, italic, lists). A new card never lands on top of another.
- **Six card types:** Idea, Character, Place, Scene, Theme, Question. Change the type by typing `/` at the start of a line or by tapping the type label.
- **Labeled threads:** drag a thread from one card to another and name the link (“works at”, “suspects”, “takes place at”). The thread always leaves from the nearest edge. Double-click the thread (or tap it with a finger) to rename it.
- **Mentions:** type `@` in a card to mention another one. The thread is drawn for you, the mention follows when you rename the card, and you can create the mentioned card without leaving your sentence.
- **Images:** drop an image on a card or on the canvas, or use the card’s image button. It keeps its proportions (a blurred backdrop drawn from it fills the sides), is copied into the project’s `medias/` folder and also shows in the Bible.
- **Card width:** drag the bottom-right handle of a selected card, or `Alt`+`→` and `Alt`+`←`.
- **Frames:** a named rectangle (“Act 1?”, “The lighthouse”) to group cards. Button or `C` key; with cards selected, the frame wraps them. Moving it takes its cards and inner frames along.
- **Organise the canvas:** one button puts every card in a frame (characters, places, themes, questions, loose ideas) and the scenes by template beat and chapter, linked in story order. `Ctrl`/`Cmd`+`Z` puts everything back.
- **Undo and redo:** `Ctrl`/`Cmd`+`Z` and `Ctrl`/`Cmd`+`Shift`+`Z`, or the two buttons on the canvas. Cards, threads, moves and text.
- **Search:** the magnifier in the top bar, or `Ctrl`/`Cmd`+`F`, finds a card by its title or text and shows it on the canvas.
- **Minimap and zoom** to find your way as the canvas grows.

### The Bible

A table of contents and reference sheets generated automatically from your cards, grouped by type, with each sheet’s links. There is nothing to fill in: the Bible updates as the canvas changes. You can also create and name an entry there: its card shows up on the canvas. Everything can be edited in place, title and text, and a character has a round portrait and a **character sheet**: role, gender, age, occupation, nicknames, background, appearance, personality, what they want, what they need, flaw, fear, secret, relationships, arc. All optional: only filled fields stay on screen. Under the name, the poster sums up gender, age, occupation and role, and says how often the text names them and from which scene.

### The outline

- **Four templates:** free, three acts, Save the Cat, hero’s journey. Each slot reminds you in one line what belongs there.
- **Placing scenes:** drag a scene into a slot, move it with the arrows or pick its slot from a menu. Canvas scenes without a place yet wait under “To place”.
- **Writing from the outline:** a scene created in a slot gets its card on the canvas right away, and its title can be edited from both sides.
- **Chapters:** within each slot, scenes are grouped by chapter. “New chapter from here” cuts the story at a scene; the number follows on its own, the title is optional.
- **Changing your mind:** switching templates loses nothing, each template keeps its own arrangement.
- **List or index cards:** the outline shows as a list or as index cards.
- **Timeline by storyline:** a table of scenes where each storyline (a Theme card), character and place has its row. You see at a glance where a storyline goes missing for too long, and you link a card to a scene by tapping a cell.

### The character assistant

- **Questions, not answers:** in a character’s entry, “Ask about” puts one question at a time, across three levels (Essential, In depth, Intimate).
- Your answer joins the entry, under the question. You can also skip to another question.
- **“I don’t know yet”** keeps the question for later, under the entry’s “To dig into” tab. On the canvas, the character’s card only shows “3 questions to answer”, which opens the entry.
- **AI summary** (if an AI is plugged in): it puts what you wrote about the character (sheet, notes, answers) in order, without inventing anything. You add it to the entry or ignore it.

### The manuscript

- **Chapters as you write, as in NEO:** Enter twice on an empty line breaks the scene, the rest goes into a new scene; Enter a third time starts a new chapter. Backspace undoes it. The chapter title is written at the top of the page.
- **The pages of a book:** a scene can become a title page, copyright, dedication, epigraph, prologue, epilogue, acknowledgments or “about the author”. They place themselves before or after the story.
- **One scene at a time, on pages:** you write the text of each scene in outline order, on book-format pages sized to your screen (indents, justified text, a drop cap at each chapter opening), numbered from one scene to the next. Scenes are grouped by chapter.
- **Statistics and goals:** words, pages, reading time, scenes written, average per scene; words written today, days in a row, daily goal and book goal (an idea taken from NEO).
- **In this scene:** characters and places mentioned in the text show up beside it, along with the card’s notes.
- **Your files:** every written scene is a Markdown file in `manuscrit/`. Deleting a card never erases its text.

### Novels and screenplays

A project is a novel or a screenplay, and you can switch at any time. The canvas and the files stay the same, only the vocabulary adapts: Place becomes Location, the Outline becomes the Step outline, the Manuscript becomes the Screenplay, and Scene cards take the shape of a scene heading (`INT. LIGHTHOUSE - NIGHT`) in Courier Prime.

### The screenplay editor

For a screenplay project, the Screenplay view is an editor in standard film format, linked to the canvas: each scene heading is tied to its Scene card, and what you write in one shows up in the other.

![The screenplay editor (French interface): scene list, standard-format page and “In this scene” panel](docs/images/scenario-fr.png)

<details>
<summary><strong>Everything the screenplay editor does</strong></summary>

- **Real pages:** the sheet has the proportions and margins of the chosen paper size (A4 or US Letter), page after page, as in print.
- **Title page:** a cover page where you write the title, your name, the “Written by” credit, your contact address and the date. Your name is remembered for your next screenplays.
- **Six elements:** scene heading, action, character, parenthetical, dialogue, transition, with the standard indents.
- **All from the keyboard:** `Tab` changes the element type, `Enter` moves to the next logical element (character, then dialogue, then action). An element bar does the same with a mouse or a finger.
- **Detection as you type:** a line starting with `int.` or `ext.` becomes a scene heading, an opening parenthesis starts a parenthetical.
- **Completion:** characters and locations from the Bible are suggested as you write, along with extensions (V.O., O.S.) and times of day (DAY, NIGHT). An unknown character or location can become a card in one gesture.
- **Linked to the canvas:** renaming a scene heading renames its card, and the other way round. A scene, its location or a character you write in the screenplay gets its card on the canvas; a Scene card created on the canvas enters the screenplay.
- **Pages and minutes:** the page count and the estimated running time (about one minute per page) are always visible.
- **Step outline:** the scenes in order, as a list or as index cards, with their synopsis, characters and length. Reorder them by dragging or with the arrows, and the scene’s text follows in the file.
- **Step outline templates:** three acts, Save the Cat, eight sequences or TV episode. Slots are sections of the Fountain file, readable in other software, each with its running time.
- **Synopsis:** one sentence per scene, written from the scene panel or the step outline, saved as a Fountain synopsis.
- **Import:** an existing `.fountain` file becomes a project, with its Scene, Character and Location cards already created and linked.
- **Scene numbers and focus mode:** optional numbering in the margin, and a mode that keeps only the page on screen.
- **An open format:** the text is saved to `scenario.fountain`, in [Fountain](https://fountain.io) format, readable by other screenwriting software.

</details>

### AI, if you want it

Cosmos works entirely without AI. You can plug one in from Settings:

- **Locally**, with Ollama or LM Studio: your texts never leave your machine. No server setting needed.
- **With your own key**, for Claude, OpenAI or OpenRouter: the passages being analysed are then sent to that provider, under its terms. Your key stays on your device, never in the project.

It asks, it doesn’t write: no action changes your project without your say.

- **Tidy up ideas:** suggests a type (Character, Place, Scene…) for your loose ideas. You apply or ignore them one by one, then “Organise the canvas” puts everything in frames.
- **Tailored questions:** in the character assistant, a question based on what the entry already says. You do the answering.
- **Character summary:** puts what you wrote in order, adding nothing.
- **Check consistency:** points out possible contradictions between your cards (an age, a date, a place), as questions you can keep for later.

The exact instructions sent to the AI are published in [docs/prompts-ia.md](docs/prompts-ia.md) (in French, with the prompts themselves in English).

### Exports

- **Manuscript:** scenes of the same chapter form one chapter, separated by “* * *”. PDF in manuscript format (Courier 12, double spaced), Word (.docx), EPUB for e-readers, or a single Markdown file.
- **Screenplay:** PDF in standard format (Courier 12, standard margins, dialogue split cleanly across pages), Fountain and Final Draft (FDX).
- **Bible:** PDF, Word or Markdown, with entries grouped by type and their links.
- **Nothing to install:** everything is produced by the app itself.

### Comfort

- **Several projects:** a home screen to choose the one to work on, or to create one.
- **Autosave** to Markdown files, or `Cmd+S` / `Ctrl+S`.
- **English and French**, each with its own typography.
- **Light, dark or system appearance.**
- **Mouse, touch and keyboard:** every action has all three paths.
- **Offline:** bundled fonts, no account, no server.

![The same canvas in dark mode](docs/images/canvas-dark-en.png)

## Getting started

- **Choose a project:** on every launch, the home screen lists your projects. From a project, the “Projects” button saves and goes back there.
- **New project:** a working title, novel or screenplay, and on a computer the folder to save it in. “Try with an example” creates a small project to explore.
- **New card:** double-click or right-click the canvas, press `N`, long-press with a finger, or use the “New card” button. Then just write.
- **Change the type:** type `/` at the start of a line, or tap the type label (“IDEA”).
- **Connect:** drag a thread from a point on a card’s edge to another card, then name the link.
- **Settings** (icon at the top right): project type, interface language, appearance, and AI service.

### Your files

Each project is a folder:

- `cosmos.json`: title, positions, links and frames
- `cartes/*.md`: one card per Markdown file
- `manuscrit/`: the text of the scenes (novel)
- `scenario.fountain`: the screenplay text
- `medias/`: images

File and folder names are the same in every language.

```markdown
---
id: k3x9a7bq2m
type: personnage
title: "Inès Morvan"
---
Stand-in keeper. Can’t stand **silence**.
```

**Working on several computers:** put the project folder in iCloud Drive, Dropbox or OneDrive, and avoid opening it on two machines at once. The folder you choose stays allowed from one launch to the next, wherever it is (another drive, OneDrive, a USB stick). If the app can no longer open it, it tells you and you choose it again with “Open folder”.

## Coming next

| Step | Content |
|---|---|
| Screenplay | Target lengths per act in the step outline, emphasis (italic, bold) on screen and in the PDF, side-by-side dual dialogue |
| Mobile | iOS and Android apps |
| Sync | Across devices, then collaboration |

## Platforms

| System | Status |
|---|---|
| macOS (Apple Silicon and Intel), Windows, Linux | Ready: installers built by GitHub Actions |
| iOS, iPadOS, Android | Code is ready (touch, storage), native project still to initialize |
| Browser | For development only (storage in the browser) |

---

## Development

**Stack:** Tauri 2, React 19, strict TypeScript, Vite, React Flow for the canvas, TipTap for the editor, Zustand for state.

### Requirements

- Node 20+ and Rust (https://rustup.rs)
- **Mac:** the Xcode command line tools (`xcode-select --install`)
- **Windows:** the Visual Studio Build Tools (C++) and WebView2 (already on Windows 10 and 11)
- **Linux:** `libwebkit2gtk-4.1-dev` and its dependencies (see `ci.yml`)

### Run

```bash
npm install
npm run tauri dev      # desktop app
# or
npm run dev            # in the browser (http://localhost:1420), no disk access
```

**Mobile (on a Mac):** `npm run tauri ios init` then `npm run tauri ios dev` (Xcode required), or `android init` / `android dev` (Android Studio and NDK required). On mobile, projects live in the app’s private storage.

### Check

```bash
npm run build   # TypeScript check + build
npm test        # tests (Vitest)
```

### Release a version

```bash
git tag v0.1.0 && git push --tags
```

GitHub builds the installers for all three systems and puts them in a draft Release, which you then publish. The secrets needed to sign the apps (Apple developer account, Windows certificate) are listed in `release.yml`.

### Working on several computers

The code goes through GitHub: `git push` at the end of a session, `git pull` then `npm install` if needed at the start of a session on the other machine. Don’t put the code folder in OneDrive or iCloud.

### Documentation

Architecture, conventions and detailed roadmap: see [CLAUDE.md](CLAUDE.md) (in French), written for working with Claude Code.

## License

Cosmos is free software, released under the [GNU GPL v3.0 or later](LICENSE). You can use, study, change and redistribute it; any modified version you distribute must stay under the same license.

The PDF embeds the Courier Prime font (SIL OFL license, see [OFL.txt](src/assets/fonts/OFL.txt)).
