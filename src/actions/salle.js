// Actions du module salle. Toute l'interface (et plus tard l'assistant vocal) passe par ici :
// aucune de ces fonctions ne touche au DOM.
import * as db from '../lib/db.js';
import * as calc from '../lib/calc.js';
import { SEED_EXERCISES, TEMPLATES, DEFAULT_INCREMENT } from '../lib/salle-seed.js';
import { today, normalize } from '../lib/format.js';
import { emit } from './events.js';

const ACTIVE_KEY = 'activeSessionId';

// ---------- Exercices ----------

export async function ensureSeed() {
  if (await db.get('settings', 'salleSeed')) return;
  const have = new Set((await db.getAll('exercises')).map(e => e.slug));
  for (const e of SEED_EXERCISES) if (!have.has(e.slug)) await db.put('exercises', { ...e, custom: false });
  await db.put('settings', { key: 'salleSeed', value: 1 });
}

export async function listExercises({ includeArchived = false } = {}) {
  const all = await db.getAll('exercises');
  return all.filter(e => includeArchived || !e.archived).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export const getExercise = id => db.get('exercises', Number(id));

/** Retrouve un exercice à partir d'un nom approximatif (« dev couché », « squat »…). */
export async function findExercise(query) {
  const q = normalize(query);
  if (!q) return null;
  const all = await listExercises();
  const scored = all.map(e => {
    const n = normalize(e.name);
    let score = 0;
    if (n === q) score = 100;
    else if (n.startsWith(q)) score = 80;
    else if (n.includes(q)) score = 60;
    else {
      const words = q.split(/\s+/);
      const hits = words.filter(w => n.split(/[\s-]+/).some(x => x.startsWith(w))).length;
      score = hits === words.length ? 50 : hits ? 20 * hits / words.length : 0;
    }
    return { e, score: score - n.length / 100 }; // à score égal, le nom le plus court
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  return scored[0]?.e || null;
}

export async function addExercise({ name, muscle = 'Autre', equipment = 'barre', increment, bodyweight = false }) {
  name = String(name || '').trim();
  if (!name) throw new Error('Nom d\'exercice manquant');
  const exists = (await listExercises()).find(e => normalize(e.name) === normalize(name));
  if (exists) return exists;
  const exercise = { name, muscle, equipment, bodyweight,
    increment: Number(increment) || DEFAULT_INCREMENT[equipment] || 2.5, custom: true };
  exercise.id = await db.put('exercises', exercise);
  emit('exercises');
  return exercise;
}

export async function updateExercise(id, patch) {
  const e = await getExercise(id);
  if (!e) throw new Error('Exercice introuvable');
  Object.assign(e, patch);
  if (patch.increment !== undefined) e.increment = Number(patch.increment) || 2.5;
  await db.put('exercises', e);
  emit('exercises');
  return e;
}

/** Supprime un exercice ; s'il apparaît dans l'historique, il est seulement archivé. */
export async function deleteExercise(id) {
  id = Number(id);
  const used = (await db.getAll('sessions')).some(s => s.exercises.some(x => x.exerciseId === id));
  if (used) await updateExercise(id, { archived: true });
  else await db.remove('exercises', id);
  emit('exercises');
  return { archived: used };
}

// ---------- Programmes ----------

export async function listPrograms() {
  return (await db.getAll('programs')).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}
export const getProgram = id => db.get('programs', Number(id));
export const listTemplates = () => TEMPLATES.map(({ key, name, days }) => ({ key, name, days: days.length }));

function cleanTarget(t) {
  const repsMin = Math.max(1, Number(t.repsMin) || 8);
  return {
    exerciseId: Number(t.exerciseId),
    sets: Math.max(1, Number(t.sets) || 3),
    repsMin,
    repsMax: Math.max(repsMin, Number(t.repsMax) || repsMin),
    kg: t.kg === '' || t.kg == null ? null : Number(t.kg),
    rest: Math.max(0, Number(t.rest) || 90),
  };
}

/** Crée ou met à jour un programme : { id?, name, days: [{ name, exercises: [target] }] }. */
export async function saveProgram(program) {
  const p = {
    ...program,
    name: String(program.name || '').trim() || 'Mon programme',
    days: (program.days || []).map((d, i) => ({
      name: String(d.name || '').trim() || `Jour ${i + 1}`,
      exercises: (d.exercises || []).filter(t => t.exerciseId).map(cleanTarget),
    })),
    createdAt: program.createdAt || Date.now(),
  };
  if (!p.id) delete p.id;
  p.id = await db.put('programs', p);
  emit('programs');
  return p;
}

export async function deleteProgram(id) {
  await db.remove('programs', Number(id));
  emit('programs');
}

export async function createProgramFromTemplate(key) {
  const tpl = TEMPLATES.find(t => t.key === key);
  if (!tpl) throw new Error('Modèle introuvable');
  await ensureSeed();
  const bySlug = new Map((await db.getAll('exercises')).map(e => [e.slug, e.id]));
  return saveProgram({
    name: tpl.name,
    days: tpl.days.map(d => ({
      name: d.name,
      exercises: d.exercises.filter(x => bySlug.has(x.slug)).map(x => ({ ...x, exerciseId: bySlug.get(x.slug) })),
    })),
  });
}

/** Prochaine journée du programme : celle qui suit la dernière séance faite avec ce programme. */
export async function nextDayIndex(programId) {
  const p = await getProgram(programId);
  if (!p?.days.length) return 0;
  const last = (await listSessions()).find(s => s.programId === p.id);
  return last ? (last.dayIndex + 1) % p.days.length : 0;
}

// ---------- Séances ----------

export async function getActiveSession() {
  const ref = await db.get('settings', ACTIVE_KEY);
  if (!ref?.value) return null;
  const s = await db.get('sessions', ref.value);
  return s && !s.endedAt ? s : null;
}

async function requireActive() {
  const s = await getActiveSession();
  if (!s) throw new Error('Aucune séance en cours');
  return s;
}

async function saveSession(s) {
  await db.put('sessions', s);
  emit('sessions', { sessionId: s.id });
  return s;
}

/** Démarre une séance libre ou une journée de programme. */
export async function startSession({ programId, dayIndex, name } = {}) {
  if (await getActiveSession()) throw new Error('Une séance est déjà en cours');
  const session = { date: today(), startedAt: Date.now(), endedAt: null, name: name || 'Séance libre', exercises: [] };
  if (programId) {
    const p = await getProgram(programId);
    if (!p) throw new Error('Programme introuvable');
    const i = dayIndex ?? await nextDayIndex(p.id);
    const day = p.days[i];
    if (!day) throw new Error('Journée introuvable');
    Object.assign(session, { programId: p.id, dayIndex: i, name: name || `${p.name} · ${day.name}` });
    session.exercises = day.exercises.map(t => ({ exerciseId: t.exerciseId, target: { ...t }, sets: [] }));
  }
  session.id = await db.put('sessions', session);
  await db.put('settings', { key: ACTIVE_KEY, value: session.id });
  emit('sessions', { sessionId: session.id });
  return session;
}

export async function addExerciseToSession(exerciseId, target = null) {
  const s = await requireActive();
  exerciseId = Number(exerciseId);
  let entry = s.exercises.find(e => e.exerciseId === exerciseId);
  if (!entry) {
    entry = { exerciseId, target: target ? cleanTarget({ ...target, exerciseId }) : null, sets: [] };
    s.exercises.push(entry);
    await saveSession(s);
  }
  return entry;
}

export async function removeExerciseFromSession(exerciseId) {
  const s = await requireActive();
  s.exercises = s.exercises.filter(e => e.exerciseId !== Number(exerciseId));
  return saveSession(s);
}

export async function moveExerciseInSession(exerciseId, delta) {
  const s = await requireActive();
  const i = s.exercises.findIndex(e => e.exerciseId === Number(exerciseId));
  const j = i + delta;
  if (i < 0 || j < 0 || j >= s.exercises.length) return s;
  [s.exercises[i], s.exercises[j]] = [s.exercises[j], s.exercises[i]];
  return saveSession(s);
}

/**
 * Enregistre une série dans la séance en cours (l'exercice est ajouté s'il n'y est pas).
 * Retourne { set, records: ['e1rm', 'maxKg', …], rest } — rest = repos cible en secondes.
 */
export async function logSet({ exerciseId, kg, reps, rpe }) {
  exerciseId = Number(exerciseId);
  reps = Math.round(Number(reps));
  if (!(reps > 0)) throw new Error('Nombre de répétitions invalide');
  const exercise = await getExercise(exerciseId);
  if (!exercise) throw new Error('Exercice introuvable');
  await addExerciseToSession(exerciseId);
  const s = await requireActive();
  const entry = s.exercises.find(e => e.exerciseId === exerciseId);
  const set = { kg: Math.max(0, Number(kg) || 0), reps, at: Date.now() };
  if (rpe) set.rpe = Number(rpe);
  const history = await getPerformances(exerciseId, { excludeSessionId: s.id });
  const records = calc.newRecords(history, entry.sets, set);
  if (records.length) set.pr = records;
  entry.sets.push(set);
  await saveSession(s);
  return { set, records, rest: entry.target?.rest ?? 90 };
}

export async function updateSet(exerciseId, setIndex, patch) {
  const s = await requireActive();
  const entry = s.exercises.find(e => e.exerciseId === Number(exerciseId));
  if (!entry?.sets[setIndex]) throw new Error('Série introuvable');
  Object.assign(entry.sets[setIndex], patch);
  return saveSession(s);
}

export async function deleteSet(exerciseId, setIndex) {
  const s = await requireActive();
  const entry = s.exercises.find(e => e.exerciseId === Number(exerciseId));
  if (!entry?.sets[setIndex]) throw new Error('Série introuvable');
  entry.sets.splice(setIndex, 1);
  return saveSession(s);
}

/** Termine la séance. Une séance sans aucune série est supprimée. Retourne un résumé. */
export async function finishSession({ notes } = {}) {
  const s = await requireActive();
  s.exercises = s.exercises.filter(e => e.sets.length);
  await db.put('settings', { key: ACTIVE_KEY, value: null });
  if (!s.exercises.length) {
    await db.remove('sessions', s.id);
    emit('sessions');
    return null;
  }
  s.endedAt = Date.now();
  if (notes) s.notes = notes;
  await saveSession(s);
  return sessionSummary(s);
}

export async function cancelSession() {
  const s = await requireActive();
  await db.remove('sessions', s.id);
  await db.put('settings', { key: ACTIVE_KEY, value: null });
  emit('sessions');
}

export function sessionSummary(s) {
  const sets = s.exercises.flatMap(e => e.sets);
  return {
    id: s.id, name: s.name, date: s.date,
    duration: (s.endedAt || Date.now()) - s.startedAt,
    exercises: s.exercises.length, sets: sets.length,
    reps: sets.reduce((n, x) => n + x.reps, 0),
    volume: calc.totalVolume(sets),
  };
}

/** Séances terminées, de la plus récente à la plus ancienne. */
export async function listSessions({ limit } = {}) {
  const all = (await db.getAll('sessions')).filter(s => s.endedAt).sort((a, b) => b.startedAt - a.startedAt);
  return limit ? all.slice(0, limit) : all;
}
export const getSession = id => db.get('sessions', Number(id));

export async function deleteSession(id) {
  await db.remove('sessions', Number(id));
  emit('sessions');
}

// ---------- Progression ----------

export async function getPerformances(exerciseId, { excludeSessionId } = {}) {
  const sessions = (await db.getAll('sessions')).filter(s => s.id !== excludeSessionId);
  return calc.performances(sessions, Number(exerciseId));
}

/** Dernière performance + suggestion de charge pour la prochaine série/séance. */
export async function getSuggestion(exerciseId, target) {
  const exercise = await getExercise(exerciseId);
  const active = await getActiveSession();
  const perfs = await getPerformances(exerciseId, { excludeSessionId: active?.id });
  if (!target) target = await lastTarget(exerciseId);
  return { last: perfs[0] || null, ...calc.suggestNext(perfs, target || {}, exercise?.increment || 2.5) };
}

/** Objectif (séries, fourchette de reps) de la dernière séance de programme contenant l'exercice. */
async function lastTarget(exerciseId) {
  const sessions = (await db.getAll('sessions')).sort((a, b) => b.startedAt - a.startedAt);
  for (const s of sessions) {
    const t = s.exercises.find(e => e.exerciseId === Number(exerciseId))?.target;
    if (t) return t;
  }
  return null;
}

/** Tout ce qu'il faut pour l'écran d'un exercice : historique, records, séries pour les courbes. */
export async function getExerciseProgress(exerciseId) {
  const exercise = await getExercise(exerciseId);
  if (!exercise) return null;
  const perfs = await getPerformances(exerciseId);
  return {
    exercise, perfs,
    records: calc.records(perfs),
    series: { e1rm: calc.series(perfs, 'e1rm'), volume: calc.series(perfs, 'volume'),
      topKg: calc.series(perfs, 'topKg'), maxReps: calc.series(perfs, 'maxReps') },
  };
}
