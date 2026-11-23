import { test } from 'node:test';
import assert from 'node:assert/strict';
import { e1rm, roundTo, performances, records, newRecords, suggestNext, series } from '../src/lib/calc.js';

const perf = (date, sets) => ({ date, startedAt: new Date(date).getTime(), sets: sets.map(([kg, reps, rpe]) => ({ kg, reps, rpe })) });

test('1RM estimé (Epley, avec RPE)', () => {
  assert.equal(e1rm(100, 1), 100);
  assert.equal(Math.round(e1rm(100, 5)), 117);
  assert.equal(Math.round(e1rm(100, 5, 8)), 123); // 2 reps en réserve → 7 reps effectives
  assert.equal(e1rm(0, 10), 0);
});

test('arrondi au palier', () => {
  assert.equal(roundTo(61.3, 2.5), 62.5);
  assert.equal(roundTo(54, 2.5), 55);
  assert.equal(roundTo(0.1 + 0.2, 0.1), 0.3);
});

test('performances : séances terminées, plus récentes d\'abord', () => {
  const sessions = [
    { id: 1, date: '2026-11-01', startedAt: 1, endedAt: 2, exercises: [{ exerciseId: 7, sets: [{ kg: 60, reps: 8 }] }] },
    { id: 2, date: '2026-11-05', startedAt: 3, endedAt: null, exercises: [{ exerciseId: 7, sets: [{ kg: 65, reps: 8 }] }] },
    { id: 3, date: '2026-11-08', startedAt: 5, endedAt: 6, exercises: [{ exerciseId: 7, sets: [{ kg: 62.5, reps: 8 }] }] },
  ];
  assert.deepEqual(performances(sessions, 7).map(p => p.sessionId), [3, 1]);
});

test('records et détection de nouveau record', () => {
  const hist = [perf('2026-11-01', [[60, 8], [60, 8]]), perf('2026-11-04', [[62.5, 6]])];
  const r = records(hist);
  assert.equal(r.maxKg.value, 62.5);
  assert.equal(r.sessionVolume.value, 960);
  assert.deepEqual(newRecords(hist, [], { kg: 67.5, reps: 5 }), ['e1rm', 'maxKg']);
  assert.deepEqual(newRecords(hist, [], { kg: 65, reps: 5 }), ['maxKg']);
  assert.deepEqual(newRecords(hist, [], { kg: 50, reps: 5 }), []);
  assert.deepEqual(newRecords([], [], { kg: 50, reps: 5 }), []); // première fois
});

test('surcharge progressive : première séance', () => {
  const s = suggestNext([], { sets: 3, repsMin: 8, repsMax: 10 });
  assert.equal(s.kind, 'start');
  assert.equal(s.reps, 8);
});

test('surcharge progressive : haut de fourchette atteint → +palier', () => {
  const s = suggestNext([perf('2026-11-01', [[60, 10], [60, 10], [60, 10]])], { sets: 3, repsMin: 8, repsMax: 10 }, 2.5);
  assert.deepEqual([s.kind, s.kg, s.reps], ['increase', 62.5, 8]);
});

test('surcharge progressive : sinon +1 rep à charge égale', () => {
  const s = suggestNext([perf('2026-11-01', [[60, 9], [60, 8], [60, 8]])], { sets: 3, repsMin: 8, repsMax: 10 });
  assert.deepEqual([s.kind, s.kg, s.reps], ['reps', 60, 9]);
});

test('surcharge progressive : deux échecs → décharge de 10 %', () => {
  const t = { sets: 3, repsMin: 8, repsMax: 10 };
  const s = suggestNext([perf('2026-11-08', [[80, 7], [80, 6], [80, 6]]), perf('2026-11-04', [[80, 7], [80, 7], [80, 6]])], t, 2.5);
  assert.deepEqual([s.kind, s.kg], ['deload', 72.5]);
});

test('surcharge progressive : RPE 10 bloque la hausse', () => {
  const s = suggestNext([perf('2026-11-01', [[60, 10, 9], [60, 10, 10], [60, 10, 10]])], { sets: 3, repsMin: 8, repsMax: 10 });
  assert.notEqual(s.kind, 'increase');
});

test('séries pour les courbes, en ordre chronologique', () => {
  const pts = series([perf('2026-11-04', [[62.5, 6]]), perf('2026-11-01', [[60, 8]])], 'topKg');
  assert.deepEqual(pts, [{ x: '2026-11-01', y: 60 }, { x: '2026-11-04', y: 62.5 }]);
});
