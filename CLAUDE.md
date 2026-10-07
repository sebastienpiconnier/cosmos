# Cosmos

Application d'écriture pour romanciers et scénaristes « architectes » : un canevas libre où l'on pose ses idées en vrac, qui s'organise progressivement en bible (personnages, lieux, scènes…) puis en plan et en manuscrit. Fil rouge : **du chaos au monde ordonné**.

## Principes produit (à respecter dans toute évolution)

- **Un seul contenu, plusieurs vues.** Canevas, Plan, Bible et Manuscrit sont des lectures du même projet. Rien n'est jamais recopié d'une vue à l'autre.
- **La structure émerge, on ne la configure pas.** Aucun champ obligatoire, aucun formulaire. Une carte naît « Idée » et devient Personnage, Lieu, Scène… via `/`.
- **Trois gestes** : taper (double-clic, appui long ou bouton « + »), tirer un fil, déposer. Toute nouvelle fonction doit tenir dans ces gestes ou rester discrète.
- **L'IA questionne, elle n'écrit pas à la place de l'auteur.** Assistant et bouton « Ranger » proposent, l'auteur décide. L'IA reste optionnelle.
- **L'auteur possède ses textes** : fichiers Markdown lisibles hors de l'app.
- **Multiplateforme dès le départ** : voir la section dédiée, c'est une règle, pas une option.
- **Multilingue et mode sombre dès le départ** : aucun texte ni aucune couleur en dur dans les composants (voir les sections dédiées).

## Multiplateforme (règle du projet)

Cibles : **macOS, Windows, Linux** (Tauri, construits par la CI), **iOS et Android** (Tauri mobile, à initialiser), et le navigateur pour le développement.

Toute fonction doit respecter ces règles :

1. **Rien ne dépend du survol.** Une action visible au survol de la souris doit l'être aussi sur écran tactile (`@media (pointer: coarse)` dans `styles.css`).
2. **Chaque action a trois chemins** : souris, doigt, clavier. Exemple : créer une carte = double-clic, appui long, bouton « Nouvelle carte » ; changer de type = `/` au clavier ou toucher l'étiquette du type.
3. **Cibles tactiles ≥ 44 px** pour les actions principales.
4. **Pas de chemin de fichier écrit à la main** : toujours `join()` de `@tauri-apps/api/path`, et toujours passer par `src/storage/`.
5. **Raccourcis** : `metaKey || ctrlKey` (Cmd sur Mac, Ctrl ailleurs), jamais l'un sans l'autre.
6. **On détecte des capacités, pas des systèmes** : `isTouch()`, `storage.canPickFolder` (voir `src/platform.ts`). `isMobileOS()` seulement quand c'est inévitable (stockage).
7. **Mobile** : pas de sélecteur de dossier, le projet vit dans l'espace privé de l'app (`$APPDATA/projets/`). Pas de dialogue natif de dossier à appeler.
8. Toute nouvelle permission Tauri va dans `src-tauri/capabilities/default.json` et doit fonctionner sur toutes les cibles.

Tester les deux modes : dans Chrome, outils de développement, mode appareil (tactile) en plus de la souris.

## Romans et scénarios (règle du projet)

Un projet est un **roman** ou un **scénario** (`kind` dans `cosmos.json`, absent = roman). Même canevas, même modèle de cartes, mêmes fichiers : seuls le vocabulaire, certains styles et, plus tard, les éditeurs changent. L'auteur peut basculer à tout moment (Réglages, « Ce projet »).

| | Roman | Scénario |
|---|---|---|
| Vue Plan | Plan | Séquencier (step outline) |
| Vue Manuscrit | Manuscrit (prose) | Scénario (format standard) |
| Carte `lieu` | Lieu | Décor (location) |
| Carte `scene` | titre libre | en-tête de scène `INT. PHARE - NUIT`, police Courier Prime |
| Gabarits du Plan | Save the Cat, trois actes, voyage du héros | trois actes, Save the Cat, huit séquences, épisode de série |
| Mesure | mots | pages et durée (1 page ≈ 1 minute) |

1. **Ne jamais dupliquer un composant par type de projet** : on lit le vocabulaire avec `useVocab()` (`src/vocab.ts`), qui fusionne `t.scenario` par-dessus le vocabulaire roman.
2. Les **clés internes ne changent pas** (`lieu` reste `lieu` même affiché « Décor ») : basculer de type ne touche à aucun fichier de carte.
3. **Éditeur de scénario (à venir, plan détaillé dans `docs/plan-editeur-scenario.md`)** : texte stocké dans **un seul fichier `scenario.fountain`** (Fountain, format texte ouvert lisible par Highland, Fade In, WriterSolo, Slugline, Trelby…). Chaque en-tête de scène est relié à sa carte par une note Fountain `[[cosmos:<id>]]`, ignorée par les autres logiciels. Éléments : en-tête de scène, action, personnage, didascalie (parenthétique), dialogue, transition. **Tab** change le type d'élément, **Entrée** passe à l'élément suivant logique (personnage → dialogue → action). Complétion des noms de personnages et de décors depuis la Bible.
4. **Export scénario** : PDF au format standard (Courier 12, marges normalisées, une page ≈ une minute), Fountain, FDX (Final Draft).
5. La **Bible d'un scénario** ajoute le nombre de scènes par décor et par personnage (utile au dépouillement) ; plus tard : accessoires, costumes, jour/nuit.

## Multilingue (règle du projet)

Langues : **français** (référence) et **anglais**. Système maison, sans dépendance (`src/i18n/`).

1. **Aucun texte d'interface en dur** dans les composants, y compris `aria-label`, `placeholder`, `title` et messages d'erreur affichés.
2. Une nouvelle chaîne s'ajoute d'abord dans `src/i18n/fr.ts`. TypeScript refuse alors de compiler tant que `en.ts` ne la traduit pas.
3. Lire les textes avec `useT()` dans un composant, `getT()` ailleurs ; variables avec `fmt(t.card.changeType, { type })`.
4. **Ajouter une langue** : copier `en.ts` en `de.ts` (par exemple), traduire, l'ajouter à `DICTIONARIES` dans `langs.ts`. Le menu Réglages la propose automatiquement.
5. Typographie propre à chaque langue : en français apostrophe ’, guillemets « », espace avant `: ; ? !` ; en anglais apostrophe ’ et guillemets “ ”.
6. La langue est un **réglage de l'appareil** (`src/settings.ts`), jamais une donnée du projet. Le contenu de l'auteur n'est pas traduit, et le **format de fichier ne se traduit jamais** (`cartes/`, `cosmos.json`, valeurs de `type:` restent identiques dans toutes les langues).
7. Tri et dates : passer la langue courante (`localeCompare(b, lang)`, `Intl`).
8. Les textes doivent supporter l'allongement (l'allemand fait +30 %) : pas de largeur fixe sur un libellé.

Première ouverture : langue du système si elle est disponible, sinon anglais.

## Mode sombre (règle du projet)

Apparence : **Comme le système** (par défaut), **Claire** ou **Sombre**, dans le menu Réglages.

1. **Aucune couleur en dur** hors des deux blocs de jetons en tête de `src/styles.css` (`:root` et `:root[data-theme="dark"]`). Tout nouveau jeton se définit dans les deux.
2. Les couleurs de type de carte sont des variables `--type-<type>` (`typeColor(type)` en TS).
3. Contraste AA (4,5:1) vérifié dans les deux thèmes pour tout texte, y compris les textes indicatifs.
4. React Flow reçoit `colorMode` et ses variables `--xy-*` sont branchées sur nos jetons. Pour les fils et étiquettes, passer `var(--…)` dans `style`, jamais une couleur.
5. Dans l'app Tauri, la barre de titre native suit le choix (`setTheme`).

## Stack

| Rôle | Choix |
|---|---|
| Coquille | Tauri 2 (`src-tauri/`) : macOS, Windows, Linux, iOS, Android ; plugins `fs` et `dialog` |
| Front | React 19 + TypeScript (strict) + Vite |
| Canevas | React Flow (`@xyflow/react` v12) |
| Éditeur | TipTap v3 (ProseMirror) |
| État | Zustand (`src/store.ts`) |
| Markdown | `marked` (md → html) et `turndown` (html → md) |
| Polices | Fontsource, embarquées (l'app marche hors ligne) |
| Langues | `src/i18n/` maison (fr, en), typé |
| Thème | Variables CSS clair/sombre, `data-theme` sur `<html>` |

## Commandes

```bash
npm install
npm run dev          # navigateur seul, stockage localStorage (démo)
npm run tauri dev    # app desktop, vrais fichiers sur disque
npm run build        # tsc --noEmit + vite build (à lancer avant chaque commit)
npm test             # tests Vitest
npm run coverage     # tests + couverture (seuil 90 % sur src/screenplay/)
npm run tauri build  # installeur pour le système courant
npm run tauri ios init && npm run tauri ios dev          # iOS (sur Mac, avec Xcode)
npm run tauri android init && npm run tauri android dev  # Android (Android Studio + NDK)
```

Versions publiées : `git tag v0.x.y && git push --tags` déclenche `.github/workflows/release.yml`, qui fabrique les installeurs Mac (Apple Silicon et Intel), Windows et Linux dans un brouillon de Release GitHub. `ci.yml` vérifie le build à chaque push.

## Architecture

```
src/
  types.ts              Modèle : CardType, CardData, Link, ProjectMeta, CARD_TYPES (libellés, couleurs)
  store.ts              État Zustand : nœuds React Flow (data = CardData), fils, vue, sauvegarde
  platform.ts           isTauri, isTouch, isMobileOS
  settings.ts           Réglages de l'appareil : langue, apparence (appliqués avant le premier rendu)
  vocab.ts              useVocab() : vocabulaire selon le type de projet (roman ou scénario)
  i18n/
    fr.ts               Textes de référence (type Messages)
    en.ts               Traduction anglaise
    langs.ts            Liste des langues, détection
    index.ts            useT(), getT(), fmt()
  App.tsx               Chargement, sauvegarde auto (800 ms après la dernière modif), Cmd/Ctrl+S
  components/
    TopBar.tsx          Logo, curseur de vues Chaos → Ordre, statut d'enregistrement
    Settings.tsx        Menu Réglages : type de projet (roman/scénario), langue, apparence
    Toile.tsx           ReactFlow : double-clic / appui long / bouton « + » = nouvelle carte, étiquette de fil
    CardNode.tsx        Carte : type (bouton), titre, éditeur TipTap, menu « Transformer en… »
    SuggestionMenu.tsx  Menu de suggestions partagé (cartes et complétion du scénario)
    FloatingEdge.tsx    Fil qui part du bord le plus proche (pas de point d'accroche fixe)
    Bible.tsx           Sommaire auto par type + fiches + liens
    ScreenplayView.tsx  Vue Scénario : liste des scènes, feuille, panneau « Dans cette scène »
    Bientot.tsx         Vues Plan et Manuscrit (roman), pas encore construites
  screenplay/           Scénario Fountain, sans dépendance à React (testé par Vitest)
    model.ts            Screenplay, ScreenplayElement : liste plate d'éléments
    rules.ts            Règles de détection Fountain, partagées par le parseur et le sérialiseur
    parse.ts            Fountain → modèle
    serialize.ts        Modèle → Fountain (lignes vides et marqueurs de forçage)
    link.ts             Lien en-tête de scène ↔ carte Scène ([[cosmos:id]]), fonctions pures
    scenes.ts           Lecture par scènes : liste, personnages qui parlent, décor
    editor/             Éditeur TipTap : un nœud bloc par élément
      nodes.ts          Schéma (six éléments éditables + « preserved » pour le reste)
      convert.ts        Screenplay ↔ document ProseMirror (un élément = un nœud de premier niveau)
      keymap.ts         Tab, Maj+Tab, Entrée, Maj+Entrée, Retour arrière, Échap
      autodetect.ts     Détection à la frappe (int., ext., parenthèse) et majuscules
      autocomplete.ts   Suggestions : personnages, extensions, préfixes, décors, moments (fonctions pures)
      index.ts          screenplayExtensions() : l'assemblage
  storage/
    paths.ts            Format du dossier projet
    index.ts            Choix du stockage, serialize / deserialize
    markdown.ts         Carte ↔ fichier .md (frontmatter), nettoyage HTML
    browser.ts          Dossier simulé dans localStorage
    tauri.ts            Vrai dossier sur disque (choisi sur ordinateur, privé sur mobile)
src-tauri/              Coquille Rust (peu de code : plugins + permissions)
.github/workflows/      ci.yml (vérification), release.yml (installeurs 3 systèmes)
```

### Format d'un projet sur disque

```
MonRoman/
  cosmos.json          titre, type (roman | scenario), positions des cartes, fils (avec étiquettes)
  cartes/<id>.md       une carte par fichier
  scenario.fountain    texte du scénario (créé au premier passage en scénario, jamais pour un roman)
```

```markdown
---
id: k3x9a7bq2m
type: personnage
title: "Inès Morvan"
---
Gardienne remplaçante. Ne supporte pas le **silence**.
```

Types possibles : `idee`, `personnage`, `lieu`, `scene`, `theme`, `question`. Pour ajouter un type, l'ajouter dans `CARD_TYPES` (types.ts) et dans `ORDER` (Bible.tsx) et `TITLE_PLACEHOLDER` (CardNode.tsx).

Le format est un contrat : toute évolution doit rester lisible par les versions précédentes ou passer par `version` dans `cosmos.json` avec une migration.

## Pièges connus (déjà résolus, ne pas réintroduire)

- **Fils flottants** : `onConnect` enregistre les fils avec `sourceHandle: null, targetHandle: null`. Sinon React Flow cherche le point d'accroche temporaire (`drop`) qui n'existe plus et n'affiche pas le fil.
- **Toute la carte est une cible** pendant qu'on tire un fil (`useConnection` + Handle `drop` plein cadre). Ne pas l'afficher en dehors d'un tirage, il bloquerait les clics.
- **Focus d'une nouvelle carte** : React Flow masque un nœud tant qu'il n'est pas mesuré, d'où les quelques essais de `focus()` dans `CardNode`.
- **Appui long** : écouteurs natifs dans `Toile`. Le navigateur émule ensuite mousedown/click sous le doigt, donc sur la carte créée : ces événements sont avalés pendant 400 ms. Les écouteurs sont en phase de capture, car d3-zoom (sous React Flow) stoppe la propagation des événements tactiles.
- **Titres de carte** : `textarea` d'une ligne qui grandit (les en-têtes de scène sont longs), Entrée passe au corps de la carte au lieu d'insérer un retour.
- **Textes figés par TipTap** : le texte indicatif est une fonction (relue à chaque rendu) et l'`aria-label` de l'éditeur est mis à jour par `setOptions` quand la langue change.
- **React Flow en sombre** : il ajoute la classe `.dark` ; nos surcharges citent `.react-flow.dark` pour garder la priorité. La mini-carte colore les cartes par classe (`type-<type>`), pas par couleur.
- **Menu des types** : options en `onPointerDown={preventDefault}` + `onClick`, pour garder le focus dans l'éditeur à la souris comme au doigt.
- **Sécurité** : les `.md` viennent du disque, `markdownToHtml` passe par `sanitizeHtml` (liste blanche de balises). La Bible affiche ce HTML avec `dangerouslySetInnerHTML` : ne jamais court-circuiter le nettoyage.
- **Raccourcis** : React Flow ignore Suppr/Retour arrière dans les champs et l'éditeur. Les nouveaux raccourcis globaux doivent faire de même.
- **Sauvegarde** : seuls les fichiers modifiés sont réécrits (diff avec `lastFiles`), les cartes supprimées sont effacées du disque.
- **Scénario non modifié** : tant que `screenplay === savedScreenplay` dans le store, `scenario.fountain` est réécrit tel quel, à l'octet près. Les fonctions de `link.ts` rendent donc le même objet quand rien ne change : ne pas recréer le scénario sans raison.
- **Lien scène ↔ carte** : l'en-tête fait foi au chargement. Supprimer une carte Scène ou changer son type retire la note de lien, jamais le texte de la scène. Un titre de carte vidé ne touche pas à l'en-tête (un en-tête vide disparaîtrait du fichier).
- **Éditeur de scénario, source de vérité** : le document TipTap n'est qu'une lecture. `ScreenplayView` le reconvertit en `Screenplay` 250 ms après la dernière frappe (et tout de suite en quittant la vue ou sur Cmd/Ctrl+S) ; il ne recharge l'éditeur que si le scénario du store change sans lui (`synced`).
- **Règles de saisie TipTap 3** : quand le gestionnaire d'une `InputRule` s'exécute, le caractère tapé est déjà dans la transaction. Lire le document avec `tr.doc.resolve(range.from)`, pas avec la sélection d'avant.
- **Tab dans l'éditeur de scénario** : il change le type d'élément et ne quitte donc plus le texte. Échap rend la main au clavier (focus sur la barre d'éléments) : ne pas retirer ce chemin, sinon piège au clavier.
- **Majuscules du scénario** : seul l'élément en cours d'écriture est mis en majuscules (`autodetect.ts`), jamais au chargement, ni en annulant, ni pendant une saisie composée (accents morts, IME). Le CSS met le reste en majuscules à l'affichage.
- **Éléments conservés** (note, section, texte mis de côté…) : leurs libellés viennent de variables CSS `--sp-label-*` posées par React, pour suivre la langue sans redessiner les nœuds.
- **Complétion du scénario** : le menu ne présélectionne une suggestion que si elle complète le texte tapé (`active` vaut -1 sinon), pour qu'Entrée continue de passer à l'élément suivant sur un nom déjà complet. Ses touches sont prises dans `editorProps.handleKeyDown`, avant le clavier de l'éditeur.
- **Page de titre Fountain** : une clé ne commence pas par un marqueur et ne contient pas de note, sinon un en-tête forcé en première ligne (`.PHARE [[cosmos:id]]`) est pris pour une page de titre.

## Conventions

- **Vocabulaire** : la première vue s'appelle **Canevas** en français (Canvas en anglais), plus « Toile ». Les noms techniques n'ont pas changé : composant `Toile.tsx`, vue `toile`, clés i18n `views.toile` et `t.toile`, classes CSS `.toile`.
- Interface **multilingue** (voir plus haut), français de référence au tutoiement, anglais direct et chaleureux.
- **Pas de tiret cadratin (—)** dans les textes d'interface ni la documentation : virgules, deux-points ou parenthèses.
- Code et noms techniques en anglais, commentaires en français.
- Accessibilité : vrais `<button>`, `aria-label` sur les boutons icône, cibles tactiles ≥ 44 px pour les actions principales, contraste AA. Viser la conformité RGAA.
- Couleurs et polices : uniquement via les variables de `src/styles.css` (repris de la maquette Cosmos), valables en clair et en sombre.
- Pas de dépendance lourde sans raison : vérifier d'abord si React Flow ou TipTap le font déjà.

## Feuille de route

1. (fait) Canevas, cartes TipTap, menu `/`, fils étiquetés, sauvegarde Markdown, Bible simple, gestes tactiles, CI multiplateforme, français/anglais, mode sombre, type de projet roman/scénario (vocabulaire, en-têtes de scène), éditeur de scénario (phases 0 à 4 du plan)
2. Canevas : images (glisser-déposer, copiées dans `medias/`), cadres de regroupement (nœud parent React Flow), redimensionnement des cartes, recherche, annuler/rétablir
3. Mentions `@` dans les cartes (extension Mention de TipTap) qui créent un fil automatiquement
4. **Plan** : gabarits (Save the Cat, trois actes, voyage du héros, libre), cases où glisser les scènes, chronologie par intrigue
5. **Manuscrit** : éditeur focus par scène, ordre issu du Plan, panneau « Dans cette scène » (personnages détectés)
5 bis. **Scénario** : éditeur au format standard en Fountain, compteur de pages et de minutes, exports PDF standard, Fountain et FDX. **Plan détaillé en 8 phases : `docs/plan-editeur-scenario.md`** (« Attaque la phase N du plan »)
6. **Assistant personnage** : banques de questions par niveau (Essentiel, Approfondi, Intime), réponses ajoutées à la fiche, « Je ne sais pas encore » crée une carte Question
7. IA optionnelle : bouton « Ranger », mode interview, alertes de cohérence (API Claude, ou modèle local via Ollama)
8. Export : bible et manuscrit en PDF, docx, epub (Pandoc)
9. Mobile : `tauri ios init` / `android init`, icônes, test sur appareil, mise en page téléphone de la Bible et du Manuscrit, menus et cartes lisibles quand le canevas est très dézoomé (menu hors du zoom de React Flow)
10. Synchronisation entre appareils puis collaboration (Yjs). En attendant : dossier projet dans iCloud Drive / Dropbox / OneDrive sur ordinateur

## Changer de machine (PC Windows ↔ Mac)

Le projet se développe sur plusieurs machines. **Git est le seul lien** entre elles : ne jamais synchroniser le dossier du code par OneDrive ou iCloud (`node_modules` et `src-tauri/target` sont propres à chaque système).

**Début de session** (à rappeler à l'auteur s'il ne l'a pas fait) :

1. `git pull`
2. `npm install` si `package-lock.json` a changé depuis la dernière session sur cette machine
3. Relire ce fichier et le plan en cours (`docs/plan-*.md`), puis résumer en trois lignes : phase en cours, ce qui est fait, prochaine étape

**Fin de session** :

1. `npm run build` et `npm test` au vert
2. Mettre à jour le plan en cours : cocher ce qui est fait (`- [x]`), noter en une ligne ce qui reste ou ce qui bloque
3. Commit, puis `git push`. Le dire explicitement à l'auteur : du travail non poussé reste bloqué sur la machine

**Pièges multiplateformes** :

- Fins de ligne : `.gitattributes` impose LF partout. Ne pas le retirer ; tout code qui lit un fichier normalise quand même `\r\n` en `\n` (fichiers venus d'autres logiciels).
- Chemins : toujours `join()` côté Tauri, jamais de `/` ou `\` écrits à la main.
- Scripts npm : uniquement des commandes qui marchent dans PowerShell et dans zsh (pas de `rm -rf`, `export VAR=`, `&&` enchaîné à des commandes Unix). Pour un besoin plus complexe, un petit script Node dans `scripts/`.
- L'historique de conversation de Claude Code reste sur la machine où il a eu lieu : la mémoire du projet, c'est ce fichier, le plan et l'historique Git.

## Méthode de travail attendue

- Avant de coder une étape de la feuille de route, proposer un court plan (fichiers touchés, impact sur le format de projet).
- Après chaque changement : `npm run build` doit passer sans erreur ni avertissement TypeScript.
- Tester à la main dans `npm run dev` : créer une carte, la transformer, relier deux cartes, recharger la page, vérifier la Bible. Refaire le parcours en mode tactile, en anglais et en mode sombre.
