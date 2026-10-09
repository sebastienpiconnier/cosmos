# Cosmos

**Français** · [English](README.en.md)

**Du chaos au monde ordonné : un canevas pour les romanciers et les scénaristes qui construisent leur histoire avant de l'écrire.**

![Le canevas de Cosmos : quatre cartes (idée, personnage, lieu, scène) reliées par des fils étiquetés](docs/images/canevas-fr.png)

[Télécharger](#télécharger) · [Fonctionnalités](#fonctionnalités) · [L'IA](#lia-si-tu-veux) · [Plateformes](#plateformes) · [Développer](#pour-développer)

---

## L'idée

Une histoire commence rarement par le chapitre un. Elle commence par des fragments : une image, un personnage, un lieu, une question sans réponse. Cosmos donne à ces fragments un endroit où se poser, puis les aide à devenir un monde cohérent, un plan et enfin un texte.

En grec, *kosmos* désigne l'ordre du monde, né du chaos. C'est exactement le chemin que l'app te fait parcourir.

Cosmos s'adresse aux auteurs « architectes », ceux qui préparent avant d'écrire. Elle repose sur quelques partis pris :

- **Un seul contenu, plusieurs vues.** Canevas, Bible, Plan et Manuscrit sont quatre lectures du même projet. Rien n'est jamais recopié d'une vue à l'autre.
- **La structure émerge, on ne la configure pas.** Aucun formulaire, aucun champ obligatoire. Une carte naît « Idée » et devient Personnage, Lieu ou Scène quand tu le décides.
- **Trois gestes suffisent :** taper, tirer un fil, déposer.
- **Tes textes t'appartiennent.** Un projet est un dossier de fichiers Markdown, lisibles dans n'importe quel éditeur, avec ou sans Cosmos. Aucun compte, aucun serveur.
- **L'IA questionne, elle n'écrit pas à ta place.** Elle est optionnelle, et c'est toi qui choisis laquelle brancher, y compris un modèle qui tourne sur ta machine.
- **Libre et gratuit.** Cosmos est un logiciel libre, distribué sous licence GPL-3.0 : tu peux l'utiliser, l'étudier, le modifier et le partager.

## Télécharger

Les installeurs pour macOS (Apple Silicon et Intel), Windows et Linux sont disponibles dans les [Releases](https://github.com/sebastienpiconnier/cosmos/releases).

> **Premier lancement.** L'app n'est pas encore signée. Sur macOS, fais un clic droit sur l'app puis « Ouvrir ». Sur Windows, si SmartScreen s'affiche, clique sur « Informations complémentaires » puis « Exécuter quand même ».

Cosmos est en cours de développement (version 0.1).

## Fonctionnalités

### Le canevas

- **Cartes libres :** double-clic ou clic droit sur le canevas, appui long au doigt, bouton « Nouvelle carte » ou touche N, et tu écris directement son titre (Entrée passe au texte). Texte riche (gras, italique, listes). Une nouvelle carte ne se pose jamais sur une autre.
- **Sept types de carte :** Idée, Personnage, Lieu, Scène, Intrigue, Thème, Question. On change de type en tapant `/` en début de ligne ou en touchant l'étiquette du type.
- **Zone Recherche :** colle ou dépose un lien, un texte ou une image sur le canevas, une carte Source naît dans le cadre « Recherche » (créé à droite au premier collage, retrouvé par le bouton signet). Une source garde son adresse, son auteur, sa date de publication et le jour où tu l'as consultée ; « Compléter depuis la page » remplit ce qui manque, « Ouvrir » affiche la page.
- **Cartes repliées :** une carte au texte long se replie, « Plus de détails » la déplie.
- **Mise en forme et Markdown :** sélectionne un mot, une barre propose gras, italique, barré, titre, listes, case à cocher, citation. Le Markdown marche à la frappe (`**gras**`, `*italique*`, `# titre`, `- liste`, `[ ] tâche`) et au collage, dans les cartes, la Bible et le manuscrit, et les fichiers restent en Markdown.
- **À faire :** les cases non cochées, les passages « à reprendre », les questions gardées pour plus tard et les questions ouvertes, rassemblés dans un seul panneau, chacun relié à sa carte ou à sa scène.
- **Raccourcis clavier** pour tout ce qui compte ; Ctrl/Cmd+/ en donne la liste.
- **Fils étiquetés :** tire un fil d'une carte à une autre et nomme le lien (« y travaille », « soupçonne », « se passe à »). Le fil part toujours du bord le plus proche. Double-clic sur le fil (ou simple appui au doigt) pour le renommer.
- **Mentions :** tape `@` dans une carte pour en citer une autre. Le fil se tire tout seul, la mention suit si tu renommes la carte, et tu peux créer la carte citée sans quitter ta phrase.
- **Images :** dépose une image sur une carte ou sur le canevas, ou utilise le bouton image de la carte. Elle garde ses proportions (un fond flou tiré d'elle comble les côtés), est copiée dans le dossier `medias/` du projet et apparaît aussi dans la Bible.
- **Largeur des cartes :** tire la poignée du coin bas droit d'une carte sélectionnée, ou Alt+→ et Alt+←.
- **Cadres :** un rectangle nommé (« Acte 1 ? », « Le phare ») pour regrouper des cartes. Bouton ou touche C ; avec des cartes sélectionnées, le cadre les entoure. Le déplacer emmène ses cartes et les cadres qu'il contient.
- **Organiser le canevas :** un bouton range toutes les cartes en cadres (personnages, lieux, thèmes, questions, idées en vrac) et les scènes par case du gabarit et par chapitre, reliées dans l'ordre du récit. Ctrl/Cmd+Z remet tout comme avant.
- **Annuler et rétablir :** Ctrl/Cmd+Z et Ctrl/Cmd+Maj+Z, ou les deux boutons du canevas. Cartes, fils, déplacements et textes.
- **Recherche :** la loupe de la barre du haut, ou Ctrl/Cmd+F, retrouve une carte par son titre ou son texte et la montre sur le canevas.
- **Mini-carte et zoom** pour s'y retrouver quand le canevas grandit.

### La Bible

La Bible s'ouvre sur **la couverture du projet**, comme une quatrième de couverture : titre, tagline, logline, résumé, comparables et note d'intention, avec des pastilles à toucher pour le genre, le public, le format, le point de vue, le temps du récit et le ton (une liste de choix courants, ou ta propre formulation). Le volume vient de ton objectif de mots, les thèmes de tes cartes Thème. Rien n'est obligatoire.

Juste après, **Ambiance** rassemble toutes les images du projet en mosaïque (portraits, lieux, sources), et la rubrique Personnages propose une **carte des relations** : les portraits reliés par les fils du canevas, avec leurs étiquettes (« sœur de », « trahit »).

Puis un sommaire et des fiches générés automatiquement à partir des cartes, classés par type, avec les liens de chaque fiche. Il n'y a rien à remplir : la Bible se met à jour quand le canevas change. On peut aussi y créer une fiche et la nommer : sa carte apparaît sur le canevas. Toutes les rubriques sont affichées, même vides ; tu choisis lesquelles garder et dans quel ordre. Tout s'y modifie sur place, titre et texte. Personnages et lieux ont une galerie de photos (ajout par bouton ou par dépôt, agrandissement, choix de l'image principale), lieux et intrigues ont aussi leur fiche (ambiance, époque ; question dramatique, enjeu, déclencheur, obstacles, résolution), et un personnage a son portrait dans un cercle, son **moteur** en trois cases lues d'un coup d'œil (Veut, A besoin de, Blessure ; pour un antagoniste : Motivation, Force, Faille), son type d'arc dessiné (positif, tragique, plat) et sa **fiche d'identité** : rôle, genre, âge, métier, surnoms, origine, apparence, personnalité, voix, faille, peur, secret, relations, évolution. Tout est facultatif : seuls les champs remplis restent affichés. Sous le nom, l'affiche résume genre, âge, métier et rôle, et dit combien de fois le texte le cite et depuis quelle scène.

### Le plan

- **Quatre gabarits :** libre, trois actes, Save the Cat, voyage du héros. Chaque case rappelle en une ligne ce qu'on y attend.
- **Ranger les scènes :** glisse une scène dans une case, déplace-la avec les flèches ou choisis sa case dans un menu. Les scènes du canevas qui n'ont pas encore leur place attendent dans « À placer ».
- **Écrire depuis le plan :** une scène créée dans une case a aussitôt sa carte sur le canevas, et son titre se modifie des deux côtés.
- **Chapitres :** dans chaque case, les scènes se regroupent par chapitre. « Nouveau chapitre à partir d'ici » coupe le récit à une scène ; le numéro suit tout seul, le titre est facultatif.
- **Changer d'avis :** passer d'un gabarit à l'autre ne perd rien, chaque gabarit garde son rangement.
- **Liste ou fiches :** le plan s'affiche en liste ou en fiches.
- **Chronologie par intrigue :** un tableau des scènes où chaque intrigue (une carte Thème), chaque personnage et chaque lieu a sa ligne. Tu vois d'un coup d'œil où une intrigue disparaît trop longtemps, et tu relies une carte à une scène en touchant une case.

### L'assistant personnage

- **Des questions, pas des réponses :** dans la fiche d'un personnage, « Questionner » pose une question à la fois, sur trois niveaux (Essentiel, Approfondi, Intime).
- Ta réponse rejoint la fiche, sous la question. Tu peux aussi passer à une autre question.
- **« Je ne sais pas encore »** garde la question pour plus tard, dans l'onglet « À creuser » de la fiche. Sur le canevas, la carte du personnage affiche seulement « 3 questions à compléter », qui ouvre sa fiche.
- **Synthèse par l'IA** (si une IA est branchée) : elle remet en ordre ce que tu as écrit du personnage (fiche, notes, réponses), sans rien inventer. Tu l'ajoutes à la fiche ou tu l'ignores.

### Le manuscrit

- **Chapitrer en écrivant, comme dans NEO :** Entrée deux fois sur une ligne vide coupe la scène, la suite part dans une nouvelle scène ; Entrée une troisième fois ouvre un nouveau chapitre. Retour arrière annule. Le titre du chapitre s'écrit en tête de page.
- **Les pages du livre :** une scène peut devenir page de titre, mentions légales, dédicace, épigraphe, prologue, épilogue, remerciements ou « à propos de l'auteur ». Elles se placent d'elles-mêmes avant ou après le récit.
- **Une scène à la fois, en pages :** tu écris le texte de chaque scène dans l'ordre du plan, sur des pages au format livre, à la taille de l'écran (alinéas, texte justifié, lettrine en ouverture de chapitre), numérotées d'une scène à l'autre. Les scènes sont regroupées par chapitre.
- **Mode focus :** la page seule à l'écran, en machine à écrire si tu veux (la ligne en cours reste à hauteur d'yeux), avec la phrase, la ligne ou le paragraphe en pleine encre et le reste estompé. Ctrl/Cmd+Maj+X marque un passage « à reprendre ».
- **Statistiques et objectifs :** mots, pages, temps de lecture, scènes écrites, moyenne par scène ; mots écrits aujourd'hui, jours d'affilée, objectif du jour et objectif du livre (idée reprise de NEO).
- **Dans cette scène :** les personnages et les lieux cités dans le texte s'affichent à côté, avec les notes de la carte.
- **Tes fichiers :** chaque scène écrite est un fichier Markdown dans `manuscrit/`. Supprimer une carte n'efface jamais son texte.

### Romans et scénarios

Un projet est un roman ou un scénario, et tu peux basculer à tout moment. Le canevas et les fichiers restent les mêmes, seul le vocabulaire s'adapte : le Lieu devient Décor, le Plan devient Séquencier, le Manuscrit devient Scénario, et les cartes Scène prennent la forme d'un en-tête de scène (INT. PHARE - NUIT) en Courier Prime.

### L'éditeur de scénario

Pour un projet scénario, la vue Scénario est un éditeur au format cinéma, relié au canevas : chaque en-tête de scène est lié à sa carte Scène, et ce que tu écris dans l'un apparaît dans l'autre.

![L'éditeur de scénario : liste des scènes, feuille au format standard et panneau « Dans cette scène »](docs/images/scenario-fr.png)

<details>
<summary><strong>Toutes les fonctions de l'éditeur de scénario</strong></summary>

- **De vraies pages :** la feuille a les proportions et les marges du format choisi (A4 ou US Letter), page après page, comme à l'impression.
- **Page de titre :** une page de garde où tu écris le titre, ton nom, la mention « Écrit par », ton adresse de contact et la date. Ton nom est retenu pour tes prochains scénarios.
- **Six éléments :** en-tête de scène, action, personnage, didascalie, dialogue, transition, avec les retraits standard.
- **Tout au clavier :** Tab change le type de l'élément, Entrée passe à l'élément suivant logique (personnage, puis dialogue, puis action). Une barre d'éléments fait la même chose à la souris et au doigt.
- **Détection à la frappe :** une ligne qui commence par `int.` ou `ext.` devient un en-tête de scène, une parenthèse ouvre une didascalie.
- **Complétion :** les personnages et les décors de la Bible se proposent pendant que tu écris, avec les extensions (V.O., H.C.) et les moments (JOUR, NUIT). Un personnage ou un décor inconnu peut devenir une carte en un geste.
- **Relié au canevas :** renommer un en-tête de scène renomme sa carte, et inversement. Une scène, son décor ou un personnage que tu écris dans le scénario reçoit sa carte sur le canevas ; une carte Scène créée sur le canevas entre dans le scénario.
- **Pages et minutes :** le nombre de pages et la durée estimée (une page pour une minute environ) s'affichent en permanence.
- **Séquencier :** les scènes dans l'ordre, en liste ou en fiches, avec leur synopsis, leurs personnages et leur longueur. On les réordonne en les glissant ou avec les flèches, et le texte de la scène suit dans le fichier.
- **Gabarits du séquencier :** trois actes, Save the Cat, huit séquences ou épisode de série. Les cases sont des sections du fichier Fountain, lisibles dans les autres logiciels, avec la durée de chacune.
- **Synopsis :** une phrase par scène, écrite depuis le volet des scènes ou le séquencier, enregistrée comme synopsis Fountain.
- **Import :** un fichier `.fountain` existant devient un projet, avec ses cartes Scène, Personnage et Décor déjà créées et reliées.
- **Numéros de scène et mode focus :** numérotation en option dans la marge, et un mode qui ne garde que la feuille à l'écran.
- **Un format ouvert :** le texte est enregistré dans `scenario.fountain`, au format Fountain, lisible par les autres logiciels de scénario.

</details>

### L'IA, si tu veux

Cosmos fonctionne entièrement sans IA. Tu peux en brancher une dans les Réglages :

- **En local**, avec Ollama ou LM Studio : tes textes ne quittent jamais ta machine. Aucun réglage du serveur n'est nécessaire.
- **Avec ta propre clé**, chez Claude, OpenAI ou OpenRouter : les passages analysés sont alors envoyés à ce fournisseur, selon ses conditions. Ta clé reste sur ton appareil, jamais dans le projet.

Elle questionne, elle n'écrit pas : aucune action ne modifie ton projet sans ton accord.

- **Ranger les idées :** propose un type (Personnage, Lieu, Scène…) pour tes idées en vrac. Tu appliques ou tu ignores, une par une, puis « Organiser le canevas » range tout en cadres.
- **Questions sur mesure :** dans l'assistant personnage, une question posée d'après ce que dit déjà la fiche. C'est toi qui réponds.
- **Synthèse d'un personnage :** remet en ordre ce que tu as écrit, sans rien ajouter.
- **Décrire un lieu d'après une photo :** si tu le demandes, l'IA relève en notes ce que montre la photo (lumière, matières, ambiance), sans rien inventer. Il faut un modèle qui lit les images.
- **Vérifier la cohérence :** relève les contradictions possibles entre tes cartes (un âge, une date, un lieu), sous forme de questions que tu peux garder pour plus tard.

Les consignes exactes envoyées à l'IA sont publiées dans [docs/prompts-ia.md](docs/prompts-ia.md).

### Les exports

- **Manuscrit :** les scènes d'un même chapitre forment un chapitre, séparées par « * * * ». PDF au format manuscrit (Courier 12, double interligne), Word (.docx), EPUB pour liseuse, ou un seul fichier Markdown.
- **Scénario :** PDF au format standard (Courier 12, marges normalisées, répliques coupées proprement entre deux pages), Fountain et Final Draft (FDX).
- **Bible :** PDF, Word ou Markdown, la couverture du projet en tête, puis les fiches rangées par type et leurs liens.
- **Sans rien installer :** tout est fabriqué par l'app elle-même.

### Confort

- **Plusieurs projets :** un écran d'accueil pour choisir celui sur lequel travailler, ou en créer un.
- **Sauvegarde automatique** dans des fichiers Markdown, ou Cmd+S / Ctrl+S.
- **Français et anglais**, avec la typographie propre à chaque langue.
- **Mode clair, sombre** ou comme le système.
- **Souris, doigt et clavier :** chaque action a les trois chemins.
- **Hors ligne :** polices embarquées, aucun compte, aucun serveur.

![Le même canevas en mode sombre, interface en anglais](docs/images/canvas-dark-en.png)

## Prise en main

- **Choisir un projet :** à chaque lancement, l'accueil liste tes projets. Depuis un projet, le bouton « Projets » enregistre et y revient.
- **Nouveau projet :** un titre de travail, roman ou scénario, et sur ordinateur le dossier où l'enregistrer. « Essayer avec un exemple » crée un petit projet pour découvrir.
- **Nouvelle carte :** double-clic ou clic droit sur le canevas, touche N, appui long au doigt, ou bouton « Nouvelle carte ». On écrit directement.
- **Changer le type :** taper `/` en début de ligne, ou toucher l'étiquette du type (« IDÉE »).
- **Relier :** tirer un fil depuis un point au bord d'une carte vers une autre, puis nommer le lien.
- **Réglages** (icône en haut à droite) : type de projet, langue de l'interface, apparence, et branchement d'une IA.

### Tes fichiers

Chaque projet est un dossier :

- `cosmos.json` : titre, positions, liens et cadres
- `cartes/*.md` : une carte par fichier Markdown
- `manuscrit/` : le texte des scènes (roman)
- `scenario.fountain` : le texte du scénario
- `medias/` : les images

```markdown
---
id: k3x9a7bq2m
type: personnage
title: "Inès Morvan"
---
Gardienne remplaçante. Ne supporte pas le **silence**.
```

**Travailler sur plusieurs ordinateurs :** place le dossier du projet dans iCloud Drive, Dropbox ou OneDrive, en évitant de l'ouvrir sur deux machines en même temps. Le dossier choisi reste autorisé d'un lancement à l'autre, où qu'il soit (autre disque, OneDrive, clé USB). Si l'app ne parvient plus à l'ouvrir, elle te le dit et tu le choisis à nouveau avec « Ouvrir un dossier ».

## À venir

| Étape | Contenu |
|---|---|
| Scénario | Durées cibles par acte dans le séquencier, emphase (italique, gras) à l'écran et dans le PDF, dialogue double côte à côte |
| Mobile | Apps iOS et Android |
| Synchronisation | Entre appareils, puis collaboration |

## Plateformes

| Système | État |
|---|---|
| macOS (Apple Silicon et Intel), Windows, Linux | Prêt : installeurs fabriqués par GitHub Actions |
| iOS, iPadOS, Android | Code prêt (tactile, stockage), projet natif à initialiser |
| Navigateur | Pour le développement uniquement (stockage dans le navigateur) |

---

## Pour développer

**Stack :** Tauri 2, React 19, TypeScript strict, Vite, React Flow pour le canevas, TipTap pour l'éditeur, Zustand pour l'état.

### Prérequis

- Node 20+ et Rust (https://rustup.rs)
- **Mac :** les outils Xcode en ligne de commande (`xcode-select --install`)
- **Windows :** les Build Tools de Visual Studio (C++) et WebView2 (déjà présent sur Windows 10 et 11)
- **Linux :** `libwebkit2gtk-4.1-dev` et ses dépendances (voir `ci.yml`)

### Lancer

```bash
npm install
npm run tauri dev      # app desktop
# ou
npm run dev            # dans le navigateur (http://localhost:1420), sans accès disque
```

**Mobile (sur Mac) :** `npm run tauri ios init` puis `npm run tauri ios dev` (Xcode requis), ou `android init` / `android dev` (Android Studio et NDK requis). Sur mobile, les projets sont rangés dans l'espace privé de l'app.

### Vérifier

```bash
npm run build   # vérification TypeScript + build
npm test        # tests (Vitest)
```

### Publier une version

```bash
git tag v0.1.0 && git push --tags
```

GitHub fabrique les installeurs des trois systèmes et les dépose dans un brouillon de Release, qu'il reste à publier. Les secrets nécessaires pour signer les apps (compte développeur Apple, certificat Windows) sont listés dans `release.yml`.

### Travailler sur plusieurs ordinateurs

Le code passe par GitHub : `git push` en fin de session, `git pull` puis `npm install` si besoin en début de session sur l'autre machine. Ne pas mettre le dossier du code dans OneDrive ou iCloud.

### Documentation

Architecture, conventions et feuille de route détaillée : voir [CLAUDE.md](CLAUDE.md), prévu pour travailler avec Claude Code.

## Licence

Cosmos est un logiciel libre, distribué sous licence [GNU GPL v3.0 ou ultérieure](LICENSE). Tu peux l'utiliser, l'étudier, le modifier et le redistribuer ; toute version modifiée que tu distribues doit rester sous la même licence.

Le PDF embarque la police Courier Prime (licence SIL OFL, voir [OFL.txt](src/assets/fonts/OFL.txt)).
