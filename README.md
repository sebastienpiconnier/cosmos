# Cosmos

Du chaos au monde ordonné : une toile pour les écrivains qui construisent leur histoire avant de l'écrire.

## Démarrer

Prérequis sur Mac : Node 20+, Rust (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`) et les outils Xcode en ligne de commande (`xcode-select --install`).

```bash
npm install
npm run tauri dev      # app desktop
# ou
npm run dev            # dans le navigateur (http://localhost:1420), sans accès disque
```

Au premier lancement, un petit projet d'exemple s'affiche. Dans l'app desktop, « Enregistrer » ou « Ouvrir un dossier » permet de choisir le dossier du roman.

## Utilisation

- **Double-clic** sur la toile : nouvelle carte, on écrit directement.
- **/** en début de ligne dans une carte : la transformer en Personnage, Lieu, Scène, Thème ou Question.
- **Tirer un fil** depuis un bord d'une carte vers une autre, puis nommer le lien (« soupçonne », « se passe à »). Double-clic sur un fil pour le renommer.
- **Bible** : sommaire et fiches générés à partir des cartes.
- Sauvegarde automatique, ou **Cmd+S**.

## Fichiers

Chaque projet est un dossier : `cosmos.json` (positions et liens) et `cartes/*.md` (une carte par fichier Markdown). Ils restent lisibles dans n'importe quel éditeur.

Par défaut, l'app peut lire et écrire dans le dossier personnel et Documents. Pour un projet sur un disque externe, ajouter le chemin dans `src-tauri/capabilities/default.json` (permission `fs:scope`).

## Pour développer

Voir `CLAUDE.md` : architecture, conventions et feuille de route, prévu pour travailler avec Claude Code.
