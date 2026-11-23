// Registre des actions exposées à l'assistant vocal (étape 4).
// Chaque action a une description et un schéma JSON compatibles avec les « tools » de l'API Claude,
// et une fonction `run(args)` qui renvoie un objet sérialisable.
import * as salle from './salle.js';
import * as poids from './poids.js';
import { fmtSet } from '../lib/format.js';

async function resolveExercise(name) {
  const e = await salle.findExercise(name);
  if (!e) throw new Error(`Exercice inconnu : « ${name} »`);
  return e;
}

export const actions = {
  demarrer_seance: {
    description: 'Démarre une séance de musculation, libre ou à partir d\'un programme (prochaine journée par défaut).',
    params: { type: 'object', properties: {
      programme: { type: 'string', description: 'Nom (approximatif) du programme, optionnel' },
    } },
    async run({ programme } = {}) {
      let programId;
      if (programme) {
        const p = (await salle.listPrograms()).find(x => x.name.toLowerCase().includes(programme.toLowerCase()));
        if (!p) throw new Error(`Programme inconnu : « ${programme} »`);
        programId = p.id;
      }
      const s = await salle.startSession({ programId });
      return { seance: s.name };
    },
  },
  enregistrer_serie: {
    description: 'Enregistre une série dans la séance en cours (la démarre si besoin). Ex. « 3 séries… » = appeler plusieurs fois.',
    params: { type: 'object', required: ['exercice', 'reps'], properties: {
      exercice: { type: 'string', description: 'Nom de l\'exercice, ex. « développé couché »' },
      kg: { type: 'number', description: 'Charge en kg (0 ou lest pour le poids du corps)' },
      reps: { type: 'integer' },
      rpe: { type: 'number', description: 'Effort perçu de 6 à 10, optionnel' },
    } },
    async run({ exercice, kg = 0, reps, rpe }) {
      const e = await resolveExercise(exercice);
      if (!(await salle.getActiveSession())) await salle.startSession();
      const r = await salle.logSet({ exerciseId: e.id, kg, reps, rpe });
      return { exercice: e.name, serie: fmtSet(r.set), records: r.records };
    },
  },
  terminer_seance: {
    description: 'Termine la séance en cours et renvoie son résumé.',
    params: { type: 'object', properties: {} },
    async run() { return (await salle.finishSession()) || { info: 'Séance vide supprimée' }; },
  },
  suggestion_charge: {
    description: 'Donne la charge conseillée pour la prochaine séance sur un exercice (surcharge progressive).',
    params: { type: 'object', required: ['exercice'], properties: { exercice: { type: 'string' } } },
    async run({ exercice }) {
      const e = await resolveExercise(exercice);
      const s = await salle.getSuggestion(e.id);
      return { exercice: e.name, kg: s.kg, reps: s.reps, raison: s.reason };
    },
  },
  records_exercice: {
    description: 'Records personnels (1RM estimé, charge max…) sur un exercice.',
    params: { type: 'object', required: ['exercice'], properties: { exercice: { type: 'string' } } },
    async run({ exercice }) {
      const e = await resolveExercise(exercice);
      const p = await salle.getExerciseProgress(e.id);
      return { exercice: e.name, records: Object.fromEntries(
        Object.entries(p.records).map(([k, v]) => [k, { valeur: Math.round(v.value * 10) / 10, date: v.date }])) };
    },
  },
  ajouter_exercice: {
    description: 'Ajoute un exercice personnalisé à la bibliothèque.',
    params: { type: 'object', required: ['nom'], properties: {
      nom: { type: 'string' }, muscle: { type: 'string' }, materiel: { type: 'string' },
    } },
    async run({ nom, muscle, materiel }) {
      const e = await salle.addExercise({ name: nom, muscle, equipment: materiel });
      return { exercice: e.name, id: e.id };
    },
  },
  enregistrer_poids: {
    description: 'Enregistre le poids de corps du jour (ou d\'une date AAAA-MM-JJ).',
    params: { type: 'object', required: ['kg'], properties: { kg: { type: 'number' }, date: { type: 'string' } } },
    async run({ kg, date }) { return poids.logBodyWeight(kg, date); },
  },
};

/** Définitions au format « tools » de l'API Claude. */
export const toolDefinitions = () => Object.entries(actions).map(([name, a]) =>
  ({ name, description: a.description, input_schema: a.params }));

export async function runAction(name, args) {
  const a = actions[name];
  if (!a) throw new Error(`Action inconnue : ${name}`);
  return a.run(args || {});
}
