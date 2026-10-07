// English UI strings. Typed against fr.ts: a missing or extra key fails the build.

import type { Messages } from "./fr";

export const en: Messages = {
  meta: { name: "English" },

  app: { loading: "Opening project…" },

  views: {
    aria: "Project views",
    chaos: "Chaos",
    order: "Order",
    toile: "Canvas",
    plan: "Outline",
    bible: "Bible",
    manuscrit: "Manuscript",
    soon: "Coming soon",
  },

  status: {
    enregistre: "Saved",
    modifie: "Unsaved changes",
    enregistrement: "Saving…",
    erreur: "Save failed",
  },

  actions: {
    openFolder: "Open folder",
    save: "Save",
  },

  location: {
    browser: "Browser (demo)",
    device: "On this device",
  },

  settings: {
    title: "Settings",
    language: "Language",
    theme: "Appearance",
    themeSystem: "Match system",
    themeLight: "Light",
    themeDark: "Dark",
  },

  types: {
    idee: { label: "Idea", section: "Loose ideas", titlePlaceholder: "Title (optional)" },
    personnage: { label: "Character", section: "Characters", titlePlaceholder: "Character name" },
    lieu: { label: "Place", section: "Places", titlePlaceholder: "Place name" },
    scene: { label: "Scene", section: "Scenes", titlePlaceholder: "Scene title" },
    theme: { label: "Theme", section: "Themes", titlePlaceholder: "Theme" },
    question: { label: "Open question", section: "Open questions", titlePlaceholder: "The question" },
  },

  card: {
    bodyPlaceholder: "Write… ( / to transform the card )",
    titleAria: "Card title",
    bodyAria: "Card content",
    delete: "Delete card",
    changeType: "Type: {type}. Change type",
    menuTitle: "Turn into…",
  },

  toile: {
    addCard: "New card",
    hintMouse: "Double-click to write",
    hintTouch: "Long-press to write",
    hintLink: "Drag a thread from an edge",
    hintTransform: "or the label to transform",
    labelPlaceholder: "Kind of link (e.g. suspects)",
    labelAria: "Thread label",
  },

  bible: {
    tocTitle: "Contents, built automatically",
    tocAria: "Bible contents",
    seeOnCanvas: "Show on canvas",
    toDig: "To explore",
    linkedTo: "Linked to",
    untitled: "Untitled",
    emptyTitle: "Your bible is empty",
    emptyBody: "Create cards on the canvas and transform them with “/”: they will show up here, neatly sorted.",
  },

  soon: {
    planTitle: "Outline, coming soon",
    planBody:
      "Scenes from the canvas will slot into a template (Save the Cat, three acts, hero’s journey) and a timeline per plotline.",
    manuscritTitle: "Manuscript, coming soon",
    manuscritBody:
      "A focused editor for each scene, with the characters and places found in the text shown alongside.",
  },

  dialog: { pickFolder: "Choose the project folder" },

  demo: {
    title: "My first project",
    idea: "A lighthouse that lights itself every 13th of the month?",
    characterTitle: "Inès Morvan",
    characterBody: "Stand-in keeper. Can’t stand silence.",
    placeTitle: "Kerlaouen Lighthouse",
    placeBody: "Islet reachable at low tide.",
    sceneTitle: "Inès finds the logbook",
    sceneBody: "The last entry is dated after the disappearance.",
    linkWorksAt: "works at",
    linkSetIn: "takes place at",
  },
};
