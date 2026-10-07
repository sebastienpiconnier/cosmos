# Cosmos

Du chaos au monde ordonné : une toile pour les écrivains qui construisent leur histoire avant de l'écrire.

*From chaos to an ordered world: a canvas for writers who build their story before writing it. Interface in English and French, light and dark modes.*

## Démarrer

Prérequis : Node 20+ et Rust (https://rustup.rs). En plus, sur Mac : les outils Xcode en ligne de commande (`xcode-select --install`) ; sous Windows : les Build Tools de Visual Studio (C++) et WebView2 (déjà présent sur Windows 10 et 11) ; sous Linux : `libwebkit2gtk-4.1-dev` et ses dépendances (voir `ci.yml`).

```bash
npm install
npm run tauri dev      # app desktop
# ou
npm run dev            # dans le navigateur (http://localhost:1420), sans accès disque
```

Au premier lancement, un petit projet d'exemple s'affiche. Dans l'app desktop, « Enregistrer » ou « Ouvrir un dossier » permet de choisir le dossier du roman.

## Plateformes

| Système | État |
|---|---|
| macOS (Apple Silicon et Intel), Windows, Linux | Prêt : installeurs fabriqués par GitHub Actions |
| iOS, iPadOS, Android | Code prêt (tactile, stockage), projet natif à initialiser |
| Navigateur | Pour le développement (stockage dans le navigateur) |

**Publier une version** : `git tag v0.1.0 && git push --tags`. GitHub fabrique les installeurs des trois systèmes et les dépose dans un brouillon de Release, qu'il reste à publier.

Sans signature Apple (compte développeur à 99 $/an), macOS affiche un avertissement au premier lancement : clic droit sur l'app, puis « Ouvrir ». Les secrets à ajouter pour signer sont listés dans `release.yml`. Même principe sous Windows (SmartScreen).

**Mobile** (sur Mac) : `npm run tauri ios init` puis `npm run tauri ios dev` (Xcode requis), ou `android init` / `android dev` (Android Studio et NDK requis). Sur mobile, les projets sont rangés dans l'espace privé de l'app.

## Utilisation

- **Nouvelle carte** : double-clic sur la toile, appui long au doigt, ou bouton « Nouvelle carte ». On écrit directement.
- **Changer le type** : taper **/** en début de ligne, ou toucher l'étiquette du type (« IDÉE ») : Personnage, Lieu, Scène, Thème ou Question.
- **Tirer un fil** depuis un point au bord d'une carte vers une autre, puis nommer le lien (« soupçonne », « se passe à »). Pour le renommer : double-clic sur le fil (ou simple appui au doigt).
- **Bible** : sommaire et fiches générés à partir des cartes.
- Sauvegarde automatique, ou **Cmd+S** (Ctrl+S sous Windows et Linux).
- **Réglages** (icône en haut à droite) : langue de l'interface (français, anglais) et apparence (comme le système, claire, sombre).

## Fichiers

Chaque projet est un dossier : `cosmos.json` (positions et liens) et `cartes/*.md` (une carte par fichier Markdown). Ils restent lisibles dans n'importe quel éditeur.

Pour retrouver un projet sur plusieurs ordinateurs, il suffit de placer son dossier dans iCloud Drive, Dropbox ou OneDrive (éviter d'ouvrir le même projet sur deux machines en même temps).

Par défaut, l'app peut lire et écrire dans le dossier personnel et Documents. Pour un projet sur un disque externe, ajouter le chemin dans `src-tauri/capabilities/default.json` (permission `fs:scope`).

## Pour développer

Voir `CLAUDE.md` : architecture, conventions et feuille de route, prévu pour travailler avec Claude Code.
