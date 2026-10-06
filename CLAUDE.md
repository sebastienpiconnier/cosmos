# Cosmos

Application d'écriture pour romanciers « architectes » : une toile libre où l'on pose ses idées en vrac, qui s'organise progressivement en bible (personnages, lieux, scènes…) puis en plan et en manuscrit. Fil rouge : **du chaos au monde ordonné**.

## Principes produit (à respecter dans toute évolution)

- **Un seul contenu, plusieurs vues.** Toile, Plan, Bible et Manuscrit sont des lectures du même projet. Rien n'est jamais recopié d'une vue à l'autre.
- **La structure émerge, on ne la configure pas.** Aucun champ obligatoire, aucun formulaire. Une carte naît « Idée » et devient Personnage, Lieu, Scène… via `/`.
- **Trois gestes** : taper (double-clic sur la toile), tirer un fil, déposer. Toute nouvelle fonction doit tenir dans ces gestes ou rester discrète.
- **L'IA questionne, elle n'écrit pas à la place de l'auteur.** Assistant et bouton « Ranger » proposent, l'auteur décide. L'IA reste optionnelle.
- **L'auteur possède ses textes** : fichiers Markdown lisibles hors de l'app.

## Stack

| Rôle | Choix |
|---|---|
| Coquille desktop | Tauri 2 (`src-tauri/`), plugins `fs` et `dialog` |
| Front | React 19 + TypeScript (strict) + Vite |
| Toile | React Flow (`@xyflow/react` v12) |
| Éditeur | TipTap v3 (ProseMirror) |
| État | Zustand (`src/store.ts`) |
| Markdown | `marked` (md → html) et `turndown` (html → md) |
| Polices | Fontsource, embarquées (l'app marche hors ligne) |

## Commandes

```bash
npm install
npm run dev          # navigateur seul, stockage localStorage (démo)
npm run tauri dev    # app desktop, vrais fichiers sur disque
npm run build        # tsc --noEmit + vite build (à lancer avant chaque commit)
npm run tauri build  # bundle .app / .dmg
```

## Architecture

```
src/
  types.ts              Modèle : CardType, CardData, Link, ProjectMeta, CARD_TYPES (libellés, couleurs)
  store.ts              État Zustand : nœuds React Flow (data = CardData), fils, vue, sauvegarde
  App.tsx               Chargement, sauvegarde auto (800 ms après la dernière modif), Cmd+S
  components/
    TopBar.tsx          Logo, curseur de vues Chaos → Ordre, statut d'enregistrement
    Toile.tsx           ReactFlow : double-clic = nouvelle carte, éditeur d'étiquette de fil
    CardNode.tsx        Carte : type, titre, éditeur TipTap, menu « / Transformer en… »
    FloatingEdge.tsx    Fil qui part du bord le plus proche (pas de point d'accroche fixe)
    Bible.tsx           Sommaire auto par type + fiches + liens
    Bientot.tsx         Vues Plan et Manuscrit, pas encore construites
  storage/
    paths.ts            Format du dossier projet
    index.ts            Choix du stockage, serialize / deserialize
    markdown.ts         Carte ↔ fichier .md (frontmatter), nettoyage HTML
    browser.ts          Dossier simulé dans localStorage
    tauri.ts            Vrai dossier sur disque
src-tauri/              Coquille Rust (peu de code : plugins + permissions)
```

### Format d'un projet sur disque

```
MonRoman/
  cosmos.json          titre, positions des cartes, fils (avec étiquettes)
  cartes/<id>.md       une carte par fichier
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
- **Sécurité** : les `.md` viennent du disque, `markdownToHtml` passe par `sanitizeHtml` (liste blanche de balises). La Bible affiche ce HTML avec `dangerouslySetInnerHTML` : ne jamais court-circuiter le nettoyage.
- **Raccourcis** : React Flow ignore Suppr/Retour arrière dans les champs et l'éditeur. Les nouveaux raccourcis globaux doivent faire de même.
- **Sauvegarde** : seuls les fichiers modifiés sont réécrits (diff avec `lastFiles`), les cartes supprimées sont effacées du disque.

## Conventions

- Interface **entièrement en français**, tutoiement, typographie française : guillemets « », apostrophe ’, espace avant `: ; ? !` dans les textes affichés.
- **Pas de tiret cadratin (—)** dans les textes d'interface ni la documentation : virgules, deux-points ou parenthèses.
- Code et noms techniques en anglais, commentaires en français.
- Accessibilité : vrais `<button>`, `aria-label` sur les boutons icône, cibles tactiles ≥ 44 px pour les actions principales, contraste AA. Viser la conformité RGAA.
- Couleurs et polices : uniquement via les variables de `src/styles.css` (repris de la maquette Cosmos).
- Pas de dépendance lourde sans raison : vérifier d'abord si React Flow ou TipTap le font déjà.

## Feuille de route

1. (fait) Toile, cartes TipTap, menu `/`, fils étiquetés, sauvegarde Markdown, Bible simple
2. Toile : images (glisser-déposer, copiées dans `medias/`), cadres de regroupement (nœud parent React Flow), redimensionnement des cartes, recherche, annuler/rétablir
3. Mentions `@` dans les cartes (extension Mention de TipTap) qui créent un fil automatiquement
4. **Plan** : gabarits (Save the Cat, trois actes, voyage du héros, libre), cases où glisser les scènes, chronologie par intrigue
5. **Manuscrit** : éditeur focus par scène, ordre issu du Plan, panneau « Dans cette scène » (personnages détectés)
6. **Assistant personnage** : banques de questions par niveau (Essentiel, Approfondi, Intime), réponses ajoutées à la fiche, « Je ne sais pas encore » crée une carte Question
7. IA optionnelle : bouton « Ranger », mode interview, alertes de cohérence (API Claude, ou modèle local via Ollama)
8. Export : bible et manuscrit en PDF, docx, epub (Pandoc)
9. Plus tard : synchronisation / collaboration (Yjs), version mobile

## Méthode de travail attendue

- Avant de coder une étape de la feuille de route, proposer un court plan (fichiers touchés, impact sur le format de projet).
- Après chaque changement : `npm run build` doit passer sans erreur ni avertissement TypeScript.
- Tester à la main dans `npm run dev` : créer une carte, la transformer, relier deux cartes, recharger la page, vérifier la Bible.
