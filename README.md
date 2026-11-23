# GymBuddy

Application personnelle (en français) pour suivre sa progression :

1. **Salle** : programmes, séances, suivi des charges.
2. **Course à pied** : volume, allure, estimation des zones, import des activités Strava.
3. **Alimentation** : repas, aliments, bilan des macros, suivi du poids.
4. **Assistant vocal** : « ajoute 80 g de flocons d'avoine à mon petit déj ».

## Choix techniques

- **PWA installable** sur téléphone (manifest + service worker), utilisable hors ligne.
- **Données locales d'abord** : tout est stocké dans IndexedDB sur l'appareil. Export/import JSON pour la sauvegarde.
- **Sans étape de build** : HTML, CSS et JavaScript (modules ES) servis tels quels. Hébergeable sur GitHub Pages.
- **Assistant vocal** : reconnaissance via la Web Speech API, puis interprétation par Claude (Haiku) avec une clé API Anthropic fournie par l'utilisateur (stockée uniquement sur l'appareil). Un analyseur local prend le relais hors ligne ou sans clé.
- **Strava** : OAuth Strava pour récupérer les activités de course (nécessite une petite fonction serveur pour échanger le jeton, à prévoir à l'étape 3).

## Feuille de route

- [x] **Étape 1 — Base + salle** : navigation, stockage IndexedDB, exercices, programmes, séances, historique des charges et graphique de progression.
- [ ] **Étape 2 — Alimentation** : base d'aliments (valeurs pour 100 g), repas du jour, total des macros vs objectifs, courbe de poids.
- [ ] **Étape 3 — Course + Strava** : connexion Strava, import des activités, volume hebdo, allure, zones cardio estimées (FC max / FC repos).
- [ ] **Étape 4 — Assistant vocal** : Web Speech API, appel à Claude Haiku avec des outils (ajouter_aliment, enregistrer_serie…), analyseur local de secours.

## Module salle

- **Bibliothèque** : ~55 exercices préremplis (par muscle et matériel), exercices perso, incrément de charge par exercice.
- **Programmes** : séances types avec séries, fourchette de reps, repos et charge cible (vide = auto). Trois modèles : Full body A/B, Push/Pull/Legs, Haut/Bas.
- **Séance** : saisie charge / reps / RPE avec boutons −/+, séance précédente et charge conseillée sous chaque exercice, minuteur de repos (vibration + bip), records signalés en direct, écran maintenu allumé.
- **Progression** : courbes par exercice (1RM estimé, volume, charge max, reps max), records, historique, volume hebdomadaire.
- **Surcharge progressive** (double progression) : toutes les séries au haut de la fourchette → +1 palier ; sinon +1 rep ; deux séances sous le bas de la fourchette → décharge de 10 %. Un RPE 10 bloque la hausse.
- **Poids de corps** : une mesure par jour, moyenne glissante sur 7 jours, partagé avec les autres modules.

### Couche d'actions

Les écrans n'accèdent jamais directement à IndexedDB : tout passe par `src/actions/` (`salle.js`, `poids.js`). `src/actions/index.js` expose ces actions sous forme d'outils (nom, description, schéma JSON) prêts pour l'assistant vocal : `toolDefinitions()` et `runAction(nom, args)`. Les calculs purs (1RM, records, suggestions) sont dans `src/lib/calc.js` et testés avec `npm test` (Node, sans dépendance).

## Lancer en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Structure

```
index.html          Page unique de l'app
manifest.webmanifest
sw.js               Service worker (cache hors ligne)
src/app.js          Routeur (#/module/écran/param) et démarrage
src/lib/db.js       Accès IndexedDB
src/lib/calc.js     Calculs purs : 1RM estimé, records, surcharge progressive
src/lib/            format, courbes SVG, minuteur de repos, exercices et modèles préremplis
src/actions/        Couche d'actions (salle, poids) + registre d'outils pour l'assistant
src/views/          Un écran par module ; src/views/salle/ pour les sous-écrans
tests/              Tests Node des calculs
styles.css
icons/
```
