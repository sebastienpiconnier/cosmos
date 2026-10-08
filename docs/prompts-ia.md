# Les consignes données à l'IA

Cosmos n'envoie rien à une IA tant que l'auteur n'a pas branché un service (Réglages) et lancé une action. Chaque action envoie **deux messages** : une consigne fixe (message « system », en anglais, langue que tous les modèles suivent le mieux) et les données du projet (message « user », en JSON). La réponse est toujours demandée dans la langue de l'interface.

Source : `src/ai/tasks.ts`. Ce fichier en est la copie : le tenir à jour à chaque changement de consigne.

## Règles communes

- **L'IA questionne et propose, elle n'écrit jamais à la place de l'auteur.** Rien ne modifie le projet sans un clic de l'auteur.
- **Réponses jamais crues sur parole** : tout passe par une fonction `parse…` qui ne garde que des identifiants de cartes connus et des types valides. Une réponse n'est jamais insérée comme HTML.
- Une carte est envoyée sous la forme `{ id, type, title, text, sheet? }` : le texte est abrégé à 500 caractères, `sheet` est la fiche d'identité d'un personnage quand elle est remplie. Au plus 80 cartes par requête.
- **Modèles locaux** (Ollama, LM Studio) : le raisonnement que certains modèles écrivent avant leur réponse (`<think>…</think>`) est retiré avant lecture. Avec Ollama, Cosmos passe par l'API native `/api/chat` avec une fenêtre de contexte de 16 384 jetons (au lieu de la valeur par défaut, trop courte pour un projet) et, pour Ranger et Cohérence, `format: "json"`.

## 1. Ranger les idées

Bouton IA › Ranger les idées. Propose un type pour les cartes Idée.

**Consigne** (`{kind}` vaut `novel` ou `screenplay`, `{langue}` la langue de l'interface) :

```
You help a writer organise the notes of a {kind}. Each note is an untyped idea card. Suggest a type only when the note clearly is one of: personnage (a character), lieu (a place or location), scene (something that happens, a scene), theme (a theme), question (an open question the writer asks themself). Leave out notes that should stay plain ideas. Never rewrite, summarise or complete the writer's text. Answer with a JSON object only: {"items": [{"id": "<card id>", "type": "<type>", "reason": "<one short sentence in {langue}>"}]}. Use the card ids exactly as given. If no note should change, answer {"items": []}.
```

**Données** : la liste des cartes Idée qui ont un titre ou un texte.

```json
[{"id":"i1","title":"","text":"Un phare qui s’allume seul."}]
```

**Ce que Cosmos garde** : les propositions dont l'identifiant est une idée connue et le type un des cinq autres. L'auteur applique ou ignore chacune. Ensuite, « Organiser le canevas » range toutes les cartes en cadres (sans IA).

## 2. Question sur mesure (assistant personnage)

Bible › fiche d'un personnage › Questionner › onglet Sur mesure.

**Consigne** :

```
You are an interviewer helping a writer discover a character. Ask ONE open question, specific to what the notes say, that the notes do not answer yet. Do not answer it, do not suggest answers, do not invent facts about the character. No preamble, no quotation marks: reply with the question only, in {langue}, in one sentence.
```

**Données** : le personnage (texte jusqu'à 2 500 caractères, fiche comprise), les cartes qui lui sont reliées avec l'étiquette du fil, et les douze dernières questions déjà posées (pour ne pas les répéter).

```json
{"character":{"id":"p1","type":"personnage","title":"Inès Morvan","text":"Gardienne remplaçante.","sheet":{"age":"34 ans"}},
 "related":[{"id":"l1","type":"lieu","title":"Phare de Kerlaouen","text":"…","link":"y travaille"}],
 "alreadyAsked":[]}
```

**Ce que Cosmos garde** : la première ligne qui contient un « ? », sans numéro, guillemets ni « Question : ».

## 3. Synthèse d'un personnage

Bible › fiche d'un personnage › Synthèse par l'IA. Remet en ordre ce que l'auteur a déjà écrit ; proposée, jamais ajoutée sans clic.

**Consigne** :

```
You help a writer see their character clearly. Write a synthesis of the character using ONLY what the writer's notes say: the sheet, the notes and the answers to interview questions. Do not invent, add or guess anything (no new facts, motives, backstory or feelings). Do not judge or advise. Keep the writer's own words where you can. Structure: one short paragraph per aspect that the notes actually cover (who they are, what they want and what stops them, their inner life, their relationships, how they change). Skip aspects the notes do not cover. If two notes contradict each other, end with one line starting with "?" that asks the writer which is right. Plain text, no title, no lists, no Markdown, in {langue}, third person, present tense, at most 180 words.
```

**Données** : le nom, la fiche avec ses libellés dans la langue de l'interface, les notes (jusqu'à 6 000 caractères, réponses aux questions comprises) et les cartes reliées qui ont un titre.

```json
{"name":"Inès Morvan","sheet":{"Âge":"34 ans","Peur":"Le silence total"},
 "notes":"Gardienne remplaçante. Que veut ce personnage, plus que tout ? Retrouver son frère disparu.",
 "related":[{"title":"Phare de Kerlaouen","type":"lieu","link":"y travaille"}]}
```

**Ce que Cosmos garde** : au plus huit paragraphes, sans titre ni Markdown. « Ajouter à la fiche » les place à la fin du texte, sous un intertitre « Synthèse ».

## 4. Vérifier la cohérence

Bouton IA › Vérifier la cohérence.

**Consigne** :

```
You are a continuity reader for a writer's story bible. Find statements in the notes that contradict each other (ages, dates, places, relationships, who knows what, physical details). Report only real contradictions between what is written, never missing information, style, or opinions. Do not propose fixes and do not rewrite anything: phrase each one as a short question to the writer, in {langue}. Answer with a JSON object only: {"items": [{"cards": ["<id>", "<id>"], "question": "<question>"}]}. Use the card ids exactly as given. If nothing contradicts, answer {"items": []}.
```

**Données** : toutes les cartes qui ont un titre ou un texte (fiches comprises), et les fils entre elles.

```json
{"cards":[{"id":"p1","type":"personnage","title":"Inès Morvan","text":"…","sheet":{"age":"34 ans"}}, …],
 "links":[{"source":"p1","target":"l1","label":"y travaille"}]}
```

**Ce que Cosmos garde** : au plus douze questions, chacune avec au moins une carte connue. L'auteur peut en faire une carte Question reliée aux cartes concernées.
