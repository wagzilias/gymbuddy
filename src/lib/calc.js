// Calculs purs (sans DOM ni IndexedDB) : 1RM estimé, volume, records, surcharge progressive.
// Une « performance » = les séries d'un exercice dans une séance terminée :
//   { sessionId, date: 'AAAA-MM-JJ', startedAt: ms, sets: [{ kg, reps, rpe? }] }

/** 1RM estimé (Epley). Avec un RPE, les reps en réserve (10 - RPE) sont ajoutées. */
export function e1rm(kg, reps, rpe) {
  if (!(kg > 0) || !(reps > 0)) return 0;
  const effective = reps + (rpe ? Math.max(0, 10 - rpe) : 0);
  return effective <= 1 ? kg : kg * (1 + effective / 30);
}

export const setVolume = s => (Number(s.kg) || 0) * (Number(s.reps) || 0);
export const totalVolume = sets => sets.reduce((sum, s) => sum + setVolume(s), 0);

/** Arrondit au multiple de `step` le plus proche (en évitant les erreurs de flottants). */
export function roundTo(x, step = 2.5) {
  if (!step) return Math.round(x * 100) / 100;
  return Math.round(Math.round(x / step) * step * 100) / 100;
}

/** Performances d'un exercice, de la plus récente à la plus ancienne. */
export function performances(sessions, exerciseId) {
  const out = [];
  for (const s of sessions) {
    if (!s.endedAt) continue;
    for (const e of s.exercises || []) {
      if (e.exerciseId !== exerciseId) continue;
      const sets = (e.sets || []).filter(x => x.reps > 0);
      if (sets.length) out.push({ sessionId: s.id, date: s.date, startedAt: s.startedAt, sets });
    }
  }
  return out.sort((a, b) => b.startedAt - a.startedAt);
}

/** Résumé d'une performance. */
export function perfStats(perf) {
  const sets = perf.sets;
  return {
    topKg: Math.max(0, ...sets.map(s => s.kg || 0)),
    bestE1rm: Math.max(0, ...sets.map(s => e1rm(s.kg, s.reps, s.rpe))),
    volume: totalVolume(sets),
    reps: sets.reduce((n, s) => n + (s.reps || 0), 0),
    maxReps: Math.max(0, ...sets.map(s => s.reps || 0)),
  };
}

const RECORD_LABELS = {
  e1rm: '1RM estimé', maxKg: 'Charge max', setVolume: 'Volume sur une série',
  sessionVolume: 'Volume sur une séance', maxReps: 'Reps max',
};
export const recordLabel = k => RECORD_LABELS[k] || k;

/** Records personnels sur un ensemble de performances. */
export function records(perfs) {
  const rec = {};
  const better = (key, value, date, set) => {
    if (value > 0 && (!rec[key] || value > rec[key].value)) rec[key] = { value, date, set };
  };
  for (const p of perfs) {
    for (const s of p.sets) {
      better('e1rm', e1rm(s.kg, s.reps, s.rpe), p.date, s);
      better('maxKg', s.kg || 0, p.date, s);
      better('setVolume', setVolume(s), p.date, s);
      better('maxReps', s.reps || 0, p.date, s);
    }
    better('sessionVolume', totalVolume(p.sets), p.date);
  }
  return rec;
}

/** Records battus par une nouvelle série, par rapport à l'historique (et aux séries précédentes de la séance). */
export function newRecords(previousPerfs, currentSets, set) {
  const prev = records([...previousPerfs, { date: '', sets: currentSets }]);
  if (!previousPerfs.length) return []; // première fois : pas de « record »
  const beaten = [];
  const check = (key, value) => { if (value > 0 && value > (prev[key]?.value || 0) + 1e-9) beaten.push(key); };
  check('e1rm', e1rm(set.kg, set.reps, set.rpe));
  check('maxKg', set.kg || 0);
  if (!(set.kg > 0)) check('maxReps', set.reps || 0);
  return beaten;
}

/** Série chronologique (ascendante) pour les courbes. metric : e1rm | volume | topKg | maxReps */
export function series(perfs, metric = 'e1rm') {
  const key = { e1rm: 'bestE1rm', volume: 'volume', topKg: 'topKg', maxReps: 'maxReps' }[metric] || 'bestE1rm';
  return perfs.slice().reverse().map(p => ({ x: p.date, y: Math.round(perfStats(p)[key] * 10) / 10 }));
}

/**
 * Suggestion de surcharge progressive (double progression).
 * target : { sets, repsMin, repsMax, kg? } ; increment : pas de charge en kg.
 * Retourne { kg, reps, reason, kind: 'start' | 'increase' | 'reps' | 'deload' | 'repeat' }.
 */
export function suggestNext(perfs, target = {}, increment = 2.5) {
  const repsMin = target.repsMin || target.repsMax || 8;
  const repsMax = target.repsMax || repsMin;
  const nSets = target.sets || 3;
  if (!perfs.length) {
    return { kg: target.kg ?? null, reps: repsMin, kind: 'start',
      reason: 'Première séance : choisis une charge que tu fais proprement avec 2-3 reps en réserve (RPE 7-8).' };
  }
  const workOf = p => {
    const topKg = Math.max(0, ...p.sets.map(s => s.kg || 0));
    return { topKg, sets: p.sets.filter(s => (s.kg || 0) === topKg) };
  };
  const last = workOf(perfs[0]);
  const kg = last.topKg;
  const minReps = Math.min(...last.sets.map(s => s.reps));
  const maxRpe = Math.max(0, ...last.sets.map(s => s.rpe || 0));
  const fmt = n => String(n).replace('.', ',');

  const allAtTop = last.sets.length >= nSets && last.sets.every(s => s.reps >= repsMax);
  if (allAtTop && maxRpe <= 9.5) {
    const next = roundTo(kg + increment, increment);
    return { kg: next, reps: repsMin, kind: 'increase',
      reason: `${repsMax} reps atteintes sur ${last.sets.length} séries à ${fmt(kg)} kg : passe à ${fmt(next)} kg et repars à ${repsMin} reps.` };
  }

  const failed = w => w.sets.some(s => s.reps < repsMin);
  if (failed(last) && perfs[1]) {
    const prev = workOf(perfs[1]);
    if (prev.topKg === kg && failed(prev)) {
      const next = roundTo(kg * 0.9, increment);
      return { kg: next, reps: repsMin, kind: 'deload',
        reason: `Deux séances sous ${repsMin} reps à ${fmt(kg)} kg : décharge à ${fmt(next)} kg (−10 %) puis remonte.` };
    }
  }

  if (last.sets.length < nSets) {
    return { kg, reps: Math.max(repsMin, Math.min(repsMax, minReps)), kind: 'repeat',
      reason: `Garde ${fmt(kg)} kg et complète les ${nSets} séries.` };
  }

  const reps = Math.min(repsMax, Math.max(repsMin, minReps + 1));
  return { kg, reps, kind: 'reps',
    reason: `Garde ${fmt(kg)} kg et vise ${reps} reps sur chaque série (objectif ${repsMax}).` };
}
