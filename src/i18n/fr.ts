// Textes d'interface en français : la langue de référence.
// Toute nouvelle chaîne s'ajoute ICI d'abord ; TypeScript oblige ensuite
// chaque autre langue (en.ts…) à la traduire.
// Typographie française : apostrophe ’, guillemets « », espace insécable avant : ; ? !

export const fr = {
  meta: { name: "Français" },

  app: { loading: "Ouverture du projet…" },

  views: {
    aria: "Vues du projet",
    chaos: "Chaos",
    order: "Ordre",
    toile: "Toile",
    plan: "Plan",
    bible: "Bible",
    manuscrit: "Manuscrit",
    soon: "Bientôt",
  },

  status: {
    enregistre: "Enregistré",
    modifie: "Modifications non enregistrées",
    enregistrement: "Enregistrement…",
    erreur: "Erreur d’enregistrement",
  },

  actions: {
    openFolder: "Ouvrir un dossier",
    save: "Enregistrer",
  },

  location: {
    browser: "Navigateur (démo)",
    device: "Sur cet appareil",
  },

  settings: {
    title: "Réglages",
    language: "Langue",
    theme: "Apparence",
    themeSystem: "Comme le système",
    themeLight: "Claire",
    themeDark: "Sombre",
  },

  types: {
    idee: { label: "Idée", section: "Idées en vrac", titlePlaceholder: "Titre (facultatif)" },
    personnage: { label: "Personnage", section: "Personnages", titlePlaceholder: "Nom du personnage" },
    lieu: { label: "Lieu", section: "Lieux", titlePlaceholder: "Nom du lieu" },
    scene: { label: "Scène", section: "Scènes", titlePlaceholder: "Titre de la scène" },
    theme: { label: "Thème", section: "Thèmes", titlePlaceholder: "Thème" },
    question: { label: "Question ouverte", section: "Questions ouvertes", titlePlaceholder: "La question" },
  },

  card: {
    bodyPlaceholder: "Écris… ( / pour transformer la carte )",
    titleAria: "Titre de la carte",
    bodyAria: "Contenu de la carte",
    delete: "Supprimer la carte",
    changeType: "Type : {type}. Changer le type",
    menuTitle: "Transformer en…",
  },

  toile: {
    addCard: "Nouvelle carte",
    hintMouse: "Double-clic pour écrire",
    hintTouch: "Appui long pour écrire",
    hintLink: "Tire un fil depuis un bord",
    hintTransform: "ou l’étiquette pour transformer",
    labelPlaceholder: "Nature du lien (ex. soupçonne)",
    labelAria: "Étiquette du fil",
  },

  bible: {
    tocTitle: "Sommaire, généré automatiquement",
    tocAria: "Sommaire de la bible",
    seeOnCanvas: "Voir sur la toile",
    toDig: "À creuser",
    linkedTo: "Relié à",
    untitled: "Sans titre",
    emptyTitle: "La bible est vide",
    emptyBody: "Crée des cartes sur la toile et transforme-les avec « / » : elles apparaîtront ici, rangées.",
  },

  soon: {
    planTitle: "Plan, bientôt",
    planBody:
      "Les scènes de la toile se glisseront dans un gabarit (Save the Cat, trois actes, voyage du héros) et une chronologie par intrigue.",
    manuscritTitle: "Manuscrit, bientôt",
    manuscritBody:
      "Un éditeur focus par scène, avec en marge les fiches des personnages et lieux détectés dans le texte.",
  },

  dialog: { pickFolder: "Choisir le dossier du projet" },

  kinds: {
    section: "Ce projet",
    label: "Type de projet",
    roman: "Roman",
    scenario: "Scénario",
    hint: "Adapte le vocabulaire et, bientôt, l’éditeur d’écriture. Modifiable à tout moment.",
  },

  // Vocabulaire propre aux scénarios : remplace celui du roman quand le projet est un scénario.
  scenario: {
    views: { plan: "Séquencier", manuscrit: "Scénario" },
    types: {
      lieu: { label: "Décor", section: "Décors", titlePlaceholder: "Nom du décor" },
      scene: { label: "Scène", section: "Scènes", titlePlaceholder: "INT. PHARE - NUIT" },
    },
    soon: {
      planTitle: "Séquencier, bientôt",
      planBody:
        "Les scènes de la toile se rangeront dans un gabarit (trois actes, Save the Cat, huit séquences, épisode de série), avec la durée estimée de chaque acte.",
      manuscritTitle: "Scénario, bientôt",
      manuscritBody:
        "Un éditeur au format standard : en-têtes de scène, action, personnage, dialogue, didascalie et transition, avec Tab et Entrée pour passer de l’un à l’autre. Environ une page par minute.",
    },
  },

  // Projet d'exemple du premier lancement (devient le contenu de l'auteur ensuite).
  demo: {
    title: "Mon premier projet",
    idea: "Un phare qui s’allume tout seul chaque 13 du mois ?",
    characterTitle: "Inès Morvan",
    characterBody: "Gardienne remplaçante. Ne supporte pas le silence.",
    placeTitle: "Phare de Kerlaouen",
    placeBody: "Îlot accessible à marée basse.",
    sceneTitle: "Inès trouve le journal de bord",
    sceneBody: "Dernière entrée datée d’après la disparition.",
    linkWorksAt: "y travaille",
    linkSetIn: "se passe à",
  },
};

export type Messages = typeof fr;
