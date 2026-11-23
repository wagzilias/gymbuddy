// Stockage local (IndexedDB). Un object store par type de donnée.
const DB_NAME = 'gymbuddy';
const DB_VERSION = 1;
const STORES = {
  // { slug?, name, muscle, equipment, increment, bodyweight?, custom, archived? }
  exercises: { keyPath: 'id', autoIncrement: true },
  // { name, createdAt, days: [{ name, exercises: [{ exerciseId, sets, repsMin, repsMax, kg, rest }] }] }
  programs:  { keyPath: 'id', autoIncrement: true },
  // { date, startedAt, endedAt, name, programId?, dayIndex?, notes?,
  //   exercises: [{ exerciseId, target, sets: [{ kg, reps, rpe?, at, pr? }] }] }
  sessions:  { keyPath: 'id', autoIncrement: true, indexes: ['date'] },
  foods:     { keyPath: 'id', autoIncrement: true },   // { name, kcal, protein, carbs, fat } pour 100 g
  meals:     { keyPath: 'id', autoIncrement: true, indexes: ['date'] }, // { date, slot, items: [{ foodId, grams }] }
  weights:   { keyPath: 'date' },                      // { date, kg } poids de corps, partagé
  runs:      { keyPath: 'id', indexes: ['date'] },     // activités Strava
  settings:  { keyPath: 'key' },                       // { key, value }
};

let db;

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      for (const [name, { indexes = [], ...opts }] of Object.entries(STORES)) {
        if (d.objectStoreNames.contains(name)) continue;
        const store = d.createObjectStore(name, opts);
        indexes.forEach(i => store.createIndex(i, i));
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const getAll = store => tx(store, 'readonly', s => s.getAll());
export const get = (store, key) => tx(store, 'readonly', s => s.get(key));
export const put = (store, value) => tx(store, 'readwrite', s => s.put(value));
export const remove = (store, key) => tx(store, 'readwrite', s => s.delete(key));

export async function exportAll() {
  const out = {};
  for (const name of Object.keys(STORES)) out[name] = await getAll(name);
  return out;
}
