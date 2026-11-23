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

- [ ] **Étape 1 — Base + salle** : navigation, stockage IndexedDB, exercices, programmes, séances, historique des charges et graphique de progression.
- [ ] **Étape 2 — Alimentation** : base d'aliments (valeurs pour 100 g), repas du jour, total des macros vs objectifs, courbe de poids.
- [ ] **Étape 3 — Course + Strava** : connexion Strava, import des activités, volume hebdo, allure, zones cardio estimées (FC max / FC repos).
- [ ] **Étape 4 — Assistant vocal** : Web Speech API, appel à Claude Haiku avec des outils (ajouter_aliment, enregistrer_serie…), analyseur local de secours.

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
src/app.js          Routeur et démarrage
src/lib/db.js       Accès IndexedDB
src/views/          Un écran par module (salle, course, alimentation, assistant)
styles.css
icons/
```
