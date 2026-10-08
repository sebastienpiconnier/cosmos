# Cosmos

**Français** · [English](README.en.md)

Du chaos au monde ordonné : un canevas pour les romanciers et les scénaristes qui construisent leur histoire avant de l'écrire.

![Le canevas de Cosmos : quatre cartes (idée, personnage, lieu, scène) reliées par des fils étiquetés](docs/images/canevas-fr.png)

## L'idée

Une histoire commence rarement par le chapitre un. Elle commence par des fragments : une image, un personnage, un lieu, une question sans réponse. Cosmos donne à ces fragments un endroit où se poser, puis les aide à devenir un monde cohérent, un plan et enfin un texte.

L'app s'adresse aux auteurs « architectes », ceux qui préparent avant d'écrire. Elle repose sur quelques partis pris :

- **Un seul contenu, plusieurs vues.** Canevas, Plan, Bible et Manuscrit sont quatre lectures du même projet. Rien n'est jamais recopié d'une vue à l'autre.
- **La structure émerge, on ne la configure pas.** Aucun formulaire, aucun champ obligatoire. Une carte naît « Idée » et devient Personnage, Lieu ou Scène quand tu le décides.
- **Trois gestes suffisent** : taper, tirer un fil, déposer.
- **Tes textes t'appartiennent.** Un projet est un dossier de fichiers Markdown, lisibles dans n'importe quel éditeur, avec ou sans Cosmos.
- **L'IA questionne, elle n'écrit pas à ta place.** Elle est prévue pour plus tard et restera optionnelle.

## Fonctionnalités

Cosmos est en cours de développement (version 0.1). Voici ce qui fonctionne aujourd'hui.

### Le canevas

- **Cartes libres** : double-clic ou clic droit sur le canevas, appui long au doigt, bouton « Nouvelle carte » ou touche `N`, et tu écris directement. Texte riche (gras, italique, listes). Une nouvelle carte ne se pose jamais sur une autre.
- **Six types de carte** : Idée, Personnage, Lieu, Scène, Thème, Question. On change de type en tapant `/` en début de ligne ou en touchant l'étiquette du type.
- **Fils étiquetés** : tire un fil d'une carte à une autre et nomme le lien (« y travaille », « soupçonne », « se passe à »). Le fil part toujours du bord le plus proche.
- **Mentions** : tape `@` dans une carte pour en citer une autre. Le fil se tire tout seul, la mention suit si tu renommes la carte, et tu peux créer la carte citée sans quitter ta phrase.
- **Images** : dépose une image sur une carte ou sur le canevas, ou utilise le bouton image de la carte. Elle est copiée dans le dossier `medias/` du projet et apparaît aussi dans la Bible.
- **Largeur des cartes** : tire le bord droit d'une carte sélectionnée, ou `Alt`+`→` et `Alt`+`←`.
- **Cadres** : un rectangle nommé (« Acte 1 ? », « Le phare ») pour regrouper des cartes. Bouton ou touche `C` ; avec des cartes sélectionnées, le cadre les entoure. Le déplacer emmène ses cartes.
- **Annuler et rétablir** : `Ctrl`/`Cmd`+`Z` et `Ctrl`/`Cmd`+`Maj`+`Z`, ou les deux boutons du canevas. Cartes, fils, déplacements et textes.
- **Recherche** : la loupe de la barre du haut, ou `Ctrl`/`Cmd`+`F`, retrouve une carte par son titre ou son texte et la montre sur le canevas.
- **Mini-carte et zoom** pour s'y retrouver quand le canevas grandit.

### Le plan (roman)

- **Quatre gabarits** : libre, trois actes, Save the Cat, voyage du héros. Chaque case rappelle en une ligne ce qu'on y attend.
- **Ranger les scènes** : glisse une scène dans une case, déplace-la avec les flèches ou choisis sa case dans un menu. Les scènes du canevas qui n'ont pas encore leur place attendent dans « À placer ».
- **Écrire depuis le plan** : une scène créée dans une case a aussitôt sa carte sur le canevas, et son titre se modifie des deux côtés.
- **Changer d'avis** : passer d'un gabarit à l'autre ne perd rien, chaque gabarit garde son rangement.
- **Liste ou fiches** : le plan s'affiche en liste ou en fiches, comme le séquencier.

### L'assistant personnage

- **Des questions, pas des réponses** : dans la fiche d'un personnage, « Questionner » pose une question à la fois, sur trois niveaux (Essentiel, Approfondi, Intime).
- **Ta réponse rejoint la fiche**, sous la question. Tu peux aussi passer à une autre question.
- **« Je ne sais pas encore »** garde la question pour plus tard : elle devient une carte Question reliée au personnage sur le canevas.

### Le manuscrit (roman)

- **Une scène à la fois** : tu écris le texte de chaque scène dans l'ordre du plan, avec le nombre de mots par scène et au total.
- **Dans cette scène** : les personnages et les lieux cités dans le texte s'affichent à côté, avec les notes de la carte.
- **Tes fichiers** : chaque scène écrite est un fichier Markdown dans `manuscrit/`. Supprimer une carte n'efface jamais son texte.

### Les exports

- **Manuscrit** : PDF au format manuscrit (Courier 12, double interligne), Word (.docx), EPUB pour liseuse, ou un seul fichier Markdown.
- **Bible** : PDF, Word ou Markdown, avec les fiches rangées par type et leurs liens.
- **Sans rien installer** : tout est fabriqué par l'app, sur ordinateur comme dans le navigateur.

### La Bible

Un sommaire et des fiches générés automatiquement à partir des cartes, classés par type, avec les liens de chaque fiche. Il n'y a rien à remplir : la Bible se met à jour quand le canevas change. On peut aussi y créer une fiche et la nommer : sa carte apparaît sur le canevas.

### Romans et scénarios

Un projet est un roman ou un scénario, et tu peux basculer à tout moment. Le canevas et les fichiers restent les mêmes, seul le vocabulaire s'adapte : le Lieu devient Décor, le Plan devient Séquencier, le Manuscrit devient Scénario, et les cartes Scène prennent la forme d'un en-tête de scène (`INT. PHARE - NUIT`) en Courier Prime.

### L'éditeur de scénario

Pour un projet scénario, la vue Scénario est un éditeur au format cinéma :

![L'éditeur de scénario : liste des scènes, feuille au format standard et panneau « Dans cette scène »](docs/images/scenario-fr.png)

- **De vraies pages** : la feuille a les proportions et les marges du format choisi (A4 ou US Letter), page après page, comme à l'impression.
- **Page de titre** : une page de garde où tu écris le titre, ton nom, la mention « Écrit par », ton adresse de contact et la date. Ton nom est retenu pour tes prochains scénarios.
- **Six éléments** : en-tête de scène, action, personnage, didascalie, dialogue, transition, avec les retraits standard.
- **Tout au clavier** : `Tab` change le type de l'élément, `Entrée` passe à l'élément suivant logique (personnage, puis dialogue, puis action). Une barre d'éléments fait la même chose à la souris et au doigt.
- **Détection à la frappe** : une ligne qui commence par `int.` ou `ext.` devient un en-tête de scène, une parenthèse ouvre une didascalie.
- **Complétion** : les personnages et les décors de la Bible se proposent pendant que tu écris, avec les extensions (V.O., H.C.) et les moments (JOUR, NUIT). Un personnage ou un décor inconnu peut devenir une carte en un geste.
- **Relié au canevas** : chaque en-tête de scène est lié à sa carte Scène, et renommer l'un renomme l'autre. Une scène, son décor ou un personnage que tu écris dans le scénario reçoit sa carte sur le canevas ; une carte Scène créée sur le canevas entre dans le scénario.
- **Pages et minutes** : le nombre de pages et la durée estimée (une page pour une minute environ) s'affichent en permanence, en format US Letter ou A4.
- **Séquencier** : les scènes dans l'ordre, en liste ou en fiches, avec leur synopsis, leurs personnages et leur longueur. On les réordonne en les glissant ou avec les flèches, et le texte de la scène suit dans le fichier.
- **Gabarits du séquencier** : trois actes, Save the Cat, huit séquences ou épisode de série. Les cases sont des sections du fichier Fountain, lisibles dans les autres logiciels, avec la durée de chacune.
- **Synopsis** : une phrase par scène, écrite depuis le volet des scènes ou le séquencier, enregistrée comme synopsis Fountain.
- **Exports** : PDF au format standard (Courier 12, marges normalisées, répliques coupées proprement entre deux pages), Fountain et Final Draft (FDX).
- **Import** : un fichier `.fountain` existant devient un projet, avec ses cartes Scène, Personnage et Décor déjà créées et reliées.
- **Numéros de scène et mode focus** : numérotation en option dans la marge, et un mode qui ne garde que la feuille à l'écran.
- **Un fichier ouvert** : le texte est enregistré dans `scenario.fountain`, au format [Fountain](https://fountain.io), lisible par les autres logiciels de scénario.

### Confort

- **Plusieurs projets** : un écran d'accueil pour choisir celui sur lequel travailler, ou en créer un.
- **Sauvegarde automatique** dans des fichiers Markdown, ou `Cmd+S` / `Ctrl+S`.
- **Français et anglais**, avec la typographie propre à chaque langue.
- **Mode clair, sombre ou comme le système.**
- **Souris, doigt et clavier** : chaque action a les trois chemins.
- **Hors ligne** : polices embarquées, aucun compte, aucun serveur.

![Le même canevas en mode sombre, interface en anglais](docs/images/canvas-dark-en.png)

### À venir

| Étape | Contenu |
|---|---|
| Plan | Chronologie par intrigue |
| Scénario | Durées cibles par acte dans le séquencier, emphase (italique, gras) à l'écran et dans le PDF, dialogue double côte à côte |
| IA optionnelle | Bouton « Ranger », mode interview, alertes de cohérence |
| Mobile | Apps iOS et Android |
| Synchronisation | Entre appareils, puis collaboration |



## Plateformes

| Système | État |
|---|---|
| macOS (Apple Silicon et Intel), Windows, Linux | Prêt : installeurs fabriqués par GitHub Actions |
| iOS, iPadOS, Android | Code prêt (tactile, stockage), projet natif à initialiser |
| Navigateur | Pour le développement (stockage dans le navigateur) |

Sans signature Apple (compte développeur à 99 $/an), macOS affiche un avertissement au premier lancement : clic droit sur l'app, puis « Ouvrir ». Les secrets à ajouter pour signer sont listés dans `release.yml`. Même principe sous Windows (SmartScreen).

## Démarrer

Prérequis : Node 20+ et Rust (https://rustup.rs). En plus, sur Mac : les outils Xcode en ligne de commande (`xcode-select --install`) ; sous Windows : les Build Tools de Visual Studio (C++) et WebView2 (déjà présent sur Windows 10 et 11) ; sous Linux : `libwebkit2gtk-4.1-dev` et ses dépendances (voir `ci.yml`).

```bash
npm install
npm run tauri dev      # app desktop
# ou
npm run dev            # dans le navigateur (http://localhost:1420), sans accès disque
```

L'app s'ouvre sur l'accueil : la liste de tes projets et un formulaire « Nouveau projet ». Sur ordinateur, chaque projet est un dossier que tu choisis ; « Essayer avec un exemple » crée un petit projet pour découvrir.

**Mobile** (sur Mac) : `npm run tauri ios init` puis `npm run tauri ios dev` (Xcode requis), ou `android init` / `android dev` (Android Studio et NDK requis). Sur mobile, les projets sont rangés dans l'espace privé de l'app.

## Utilisation

- **Choisir un projet** : à chaque lancement, l'accueil liste tes projets. Depuis un projet, le bouton « Projets » enregistre et y revient.
- **Nouveau projet** : un titre de travail, roman ou scénario, et sur ordinateur le dossier où l'enregistrer.
- **Nouvelle carte** : double-clic sur le canevas, appui long au doigt, ou bouton « Nouvelle carte ». On écrit directement.
- **Changer le type** : taper **/** en début de ligne, ou toucher l'étiquette du type (« IDÉE ») : Personnage, Lieu, Scène, Thème ou Question.
- **Tirer un fil** depuis un point au bord d'une carte vers une autre, puis nommer le lien (« soupçonne », « se passe à »). Pour le renommer : double-clic sur le fil (ou simple appui au doigt).
- **Bible** : sommaire et fiches générés à partir des cartes.
- Sauvegarde automatique, ou **Cmd+S** (Ctrl+S sous Windows et Linux).
- **Réglages** (icône en haut à droite) : type de projet (roman ou scénario), langue de l'interface (français, anglais) et apparence (comme le système, claire, sombre).

## Fichiers

Chaque projet est un dossier : `cosmos.json` (titre, positions, liens et cadres), `cartes/*.md` (une carte par fichier Markdown), `medias/` (les images) et, pour un scénario, `scenario.fountain`. Ils restent lisibles dans n'importe quel éditeur.

```markdown
---
id: k3x9a7bq2m
type: personnage
title: "Inès Morvan"
---
Gardienne remplaçante. Ne supporte pas le **silence**.
```

Pour retrouver un **projet d'écriture** (le dossier ouvert dans Cosmos, pas le code de l'app) sur plusieurs ordinateurs, il suffit de placer ce dossier dans iCloud Drive, Dropbox ou OneDrive (éviter de l'ouvrir sur deux machines en même temps).

Le dossier que tu choisis dans l'app reste autorisé d'un lancement à l'autre, où qu'il soit (autre disque, OneDrive, clé USB). Si l'app ne parvient plus à l'ouvrir, elle te le dit et tu le choisis à nouveau avec « Ouvrir un dossier ».

## Pour développer

Tauri 2, React 19, TypeScript strict, Vite, React Flow pour le canevas, TipTap pour l'éditeur, Zustand pour l'état.

```bash
npm run build   # vérification TypeScript + build
npm test        # tests (Vitest)
```

**Publier une version** : `git tag v0.1.0 && git push --tags`. GitHub fabrique les installeurs des trois systèmes et les dépose dans un brouillon de Release, qu'il reste à publier.

**Travailler sur plusieurs ordinateurs** : le code passe par GitHub (`git push` en fin de session, `git pull` puis `npm install` si besoin en début de session sur l'autre machine). Ne pas mettre le dossier du code dans OneDrive ou iCloud.

Le PDF embarque la police Courier Prime (licence SIL OFL, voir [OFL.txt](src/assets/fonts/OFL.txt)).

Architecture, conventions et feuille de route détaillée : voir [CLAUDE.md](CLAUDE.md), prévu pour travailler avec Claude Code.
