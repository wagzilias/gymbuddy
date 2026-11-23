// Poids de corps, partagé entre les modules (salle, alimentation, course).
// Une mesure par jour : { date: 'AAAA-MM-JJ', kg }.
import * as db from '../lib/db.js';
import { today } from '../lib/format.js';
import { emit } from './events.js';

export async function logBodyWeight(kg, date = today()) {
  kg = Math.round(Number(String(kg).replace(',', '.')) * 10) / 10;
  if (!(kg > 20 && kg < 400)) throw new Error('Poids invalide');
  const entry = { date, kg };
  await db.put('weights', entry);
  emit('weights');
  return entry;
}

export async function deleteBodyWeight(date) {
  await db.remove('weights', date);
  emit('weights');
}

/** Mesures triées par date croissante. */
export async function listBodyWeights() {
  return (await db.getAll('weights')).sort((a, b) => a.date.localeCompare(b.date));
}

export async function latestBodyWeight() {
  const all = await listBodyWeights();
  return all[all.length - 1] || null;
}

/** Moyenne glissante sur 7 jours (lisse les variations quotidiennes). */
export function movingAverage(entries, days = 7) {
  return entries.map((e, i) => {
    const from = new Date(`${e.date}T12:00`).getTime() - (days - 1) * 86400000;
    const win = entries.slice(0, i + 1).filter(x => new Date(`${x.date}T12:00`).getTime() >= from);
    return { date: e.date, kg: Math.round(win.reduce((s, x) => s + x.kg, 0) / win.length * 10) / 10 };
  });
}
