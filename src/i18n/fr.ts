// Textes d'interface en français : la langue de référence.
// Toute nouvelle chaîne s'ajoute ICI d'abord ; TypeScript oblige ensuite
// chaque autre langue (en.ts…) à la traduire.
// Typographie française : apostrophe ’, guillemets « », espace insécable avant : ; ? !

export const fr = {
  meta: { name: "Français" },

  app: {
    loading: "Ouverture du projet…",
    openFailed: "Le dossier de ton projet n’a pas pu être ouvert. Choisis-le à nouveau avec « Ouvrir un dossier » : tes fichiers n’ont pas été modifiés.",
  },

  // Écran d'accueil : choisir le projet sur lequel travailler.
  home: {
    title: "Tes projets",
    empty: "Aucun projet pour l’instant. Crée le premier, ou essaie avec un exemple.",
    openedOn: "ouvert le {date}",
    openFolder: "Ouvrir un dossier…",
    unlist: "Retirer « {title} » de la liste",
    unlistHint: "Retire le projet de cette liste. Ses fichiers ne sont pas supprimés.",
    notAProject: "Ce dossier ne contient pas de projet Cosmos. Pour en démarrer un, utilise « Nouveau projet ».",
    openFailed: "Ce projet n’a pas pu être ouvert.",
    newTitle: "Nouveau projet",
    newHint: "Même canevas, même bible : seul l’atelier d’écriture change. Tu pourras basculer plus tard.",
    workingTitle: "Titre de travail",
    titlePlaceholder: "Le Phare des Absents",
    untitled: "Sans titre",
    youWrite: "Tu écris…",
    novel: "Un roman",
    novelHint: "Canevas et bible. Le plan et le manuscrit en prose arrivent bientôt.",
    screenplay: "Un scénario",
    screenplayHint: "Séquencier, format cinéma standard, pages et minutes.",
    folderHint: "Tu choisiras ensuite le dossier où enregistrer le projet.",
    create: "Créer le projet",
    example: "Essayer avec un exemple",
    projects: "Projets",
    backHint: "Enregistrer et revenir à la liste des projets",
  },

  views: {
    aria: "Vues du projet",
    chaos: "Chaos",
    order: "Ordre",
    toile: "Canevas",
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
    seeOnCanvas: "Voir sur le canevas",
    toDig: "À creuser",
    linkedTo: "Relié à",
    untitled: "Sans titre",
    emptyTitle: "La bible est vide",
    emptyBody: "Crée des cartes sur le canevas et transforme-les avec « / » : elles apparaîtront ici, rangées.",
  },

  soon: {
    planTitle: "Plan, bientôt",
    planBody:
      "Les scènes du canevas se glisseront dans un gabarit (Save the Cat, trois actes, voyage du héros) et une chronologie par intrigue.",
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
    hint: "Adapte le vocabulaire et l’éditeur d’écriture. Modifiable à tout moment.",
    paper: "Format de page",
    paperLetter: "US Letter",
    paperA4: "A4",
    paperHint: "Sert à estimer les pages et la durée du scénario.",
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
        "Les scènes du canevas se rangeront dans un gabarit (trois actes, Save the Cat, huit séquences, épisode de série), avec la durée estimée de chaque acte.",
      manuscritTitle: "Scénario, bientôt",
      manuscritBody:
        "Un éditeur au format standard : en-têtes de scène, action, personnage, dialogue, didascalie et transition, avec Tab et Entrée pour passer de l’un à l’autre. Environ une page par minute.",
    },
  },

  // Éditeur de scénario (vue Scénario d'un projet scénario).
  screenplay: {
    editorAria: "Texte du scénario",
    barAria: "Type de l’élément",
    elements: {
      sceneHeading: "En-tête de scène",
      action: "Action",
      character: "Personnage",
      parenthetical: "Didascalie",
      dialogue: "Dialogue",
      transition: "Transition",
    },
    placeholders: {
      sceneHeading: "INT. DÉCOR - MOMENT",
      action: "Action…",
      character: "PERSONNAGE",
      parenthetical: "(didascalie)",
      dialogue: "Réplique…",
      transition: "COUPE À :",
    },
    // Éléments Fountain conservés tels quels, non modifiables ici.
    preserved: {
      centered: "Texte centré",
      pageBreak: "Saut de page",
      section: "Section",
      synopsis: "Synopsis",
      note: "Note",
      boneyard: "Texte mis de côté",
    },
    keyTab: "Tab",
    keyEnter: "Entrée",
    keyEscape: "Échap",
    hintTab: "change",
    hintEnter: "suivant",
    hintEscape: "sortir",
    scenesTitle: "Scènes",
    scenesAria: "Scènes du scénario",
    scenesEmpty: "Pas encore de scène. Commence une ligne par « int. » ou « ext. ».",
    goToScene: "Aller à la scène",
    untitledScene: "Scène sans titre",
    toWriteTitle: "Scènes à écrire",
    toWrite: "à écrire",
    writeScene: "Écrire la scène « {title} »",
    inSceneTitle: "Dans cette scène",
    noScene: "Place le curseur dans une scène pour voir sa carte, son décor et ses personnages.",
    noCard: "Cette scène n’a pas encore de carte sur le canevas.",
    createCard: "Créer la carte",
    locationScenesOne: "{n} scène dans ce décor",
    locationScenesMany: "{n} scènes dans ce décor",
    characters: "Personnages",
    noCharacters: "Personne ne parle encore.",
    linesOne: "{n} réplique",
    linesMany: "{n} répliques",
    // Complétion : vocabulaire écrit dans le scénario (majuscules) et précisions du menu.
    moments: ["JOUR", "NUIT", "AUBE", "CRÉPUSCULE", "SOIR", "MATIN", "PLUS TARD", "CONTINU"],
    extensions: [
      { text: "(V.O.)", hint: "voix off" },
      { text: "(H.C.)", hint: "hors champ" },
      { text: "(SUITE)", hint: "suite de la réplique" },
    ],
    suggest: {
      title: "Suggestions",
      character: "personnage",
      location: "décor",
      moment: "moment",
      interior: "intérieur",
      exterior: "extérieur",
      both: "les deux",
      newCard: "nouvelle carte",
      createCharacter: "Créer la fiche de {name}",
      createLocation: "Créer le décor {name}",
    },
    linkSetIn: "se passe à",
    // Pages et durée : une estimation, d'où le « ≈ ».
    pageOf: "Page {page} sur {pages}",
    pageShort: "p. {n}",
    lengthShort: "{n} p.",
    pagesOne: "{n} page",
    pagesMany: "{n} pages",
    minutes: "≈ {n} min",
    lengthAria: "Durée estimée du scénario",
    // Réplique coupée entre deux pages du PDF.
    more: "(À SUIVRE)",
    contd: "(SUITE)",
    export: {
      button: "Exporter",
      menuAria: "Formats d’export",
      pdf: "PDF, format standard",
      fountain: "Fountain",
      fdx: "Final Draft (FDX)",
      working: "Export en cours…",
      done: "Export terminé.",
      failed: "L’export a échoué.",
    },
    sequencer: {
      title: "Séquencier",
      listAria: "Scènes dans l’ordre du scénario",
      empty: "Pas encore de scène. Écris un premier en-tête dans la vue Scénario.",
      hint: "Glisse une scène, ou utilise les flèches, pour changer l’ordre du scénario.",
      moveUp: "Monter la scène « {title} »",
      moveDown: "Descendre la scène « {title} »",
      moved: "Scène « {title} » déplacée en position {n}.",
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
