// Séance en cours (#/salle/seance) ou détail d'une séance passée (#/salle/seance/12).
import * as salle from '../../actions/salle.js';
import { recordLabel } from '../../lib/calc.js';
import { startRest } from '../../lib/timer.js';
import { esc, num, kg, fmtSet, fmtTarget, fmtDate, fmtLongDate, fmtClock, fmtDuration, toast } from '../../lib/format.js';
import { back, stepper, bindSteppers, armed, exerciseOptions, RPE_VALUES } from './ui.js';

let wakeLock;

export default async function seance(el, ctx) {
  if (ctx.params[0]) return detail(el, ctx, Number(ctx.params[0]));
  const session = await salle.getActiveSession();
  if (!session) {
    el.innerHTML = `${back('#/salle')}<div class="card"><p>Aucune séance en cours.</p>
      <a class="button" href="#/salle">Démarrer une séance</a></div>`;
    return;
  }
  ctx.setTitle('Séance');
  try { wakeLock ??= await navigator.wakeLock?.request('screen'); wakeLock?.addEventListener('release', () => { wakeLock = null; }); } catch { /* */ }

  const exercises = await salle.listExercises({ includeArchived: true });
  const byId = new Map(exercises.map(e => [e.id, e]));
  const suggestions = await Promise.all(session.exercises.map(x => salle.getSuggestion(x.exerciseId, x.target)));
  const totalSets = session.exercises.reduce((n, x) => n + x.sets.length, 0);

  const card = (x, i) => {
    const e = byId.get(x.exerciseId) || { name: '?', increment: 2.5 };
    const sug = suggestions[i];
    const t = x.target;
    const lastSet = x.sets[x.sets.length - 1];
    const firstPrev = sug.last?.sets[x.sets.length] || sug.last?.sets[sug.last.sets.length - 1];
    const kgVal = lastSet?.kg ?? sug.kg ?? firstPrev?.kg ?? '';
    const repsVal = lastSet?.reps ?? sug.reps ?? firstPrev?.reps ?? 8;
    const done = t && x.sets.length >= t.sets;
    return `<section class="card ex-card ${done ? 'done' : ''}" data-ex="${x.exerciseId}">
      <header class="ex-head">
        <a href="#/salle/exercices/${x.exerciseId}"><h3>${done ? '✓ ' : ''}${esc(e.name)}</h3></a>
        <div class="ex-tools">
          <button class="ghost small" data-move="-1" aria-label="Monter">↑</button>
          <button class="ghost small" data-move="1" aria-label="Descendre">↓</button>
          <button class="ghost small" data-remove aria-label="Retirer">✕</button>
        </div>
      </header>
      ${t ? `<p class="target">Objectif ${fmtTarget(t)} reps · repos ${fmtClock(t.rest)}${sug.kg != null ? ` · <strong>${kg(sug.kg)}</strong>` : ''}</p>` : ''}
      <p class="hint ${sug.kind}">💡 ${esc(sug.reason)}</p>
      ${sug.last ? `<p class="prev">Dernière fois (${fmtDate(sug.last.date)}) : ${sug.last.sets.map(fmtSet).join(' · ')}</p>` : ''}
      ${x.sets.length ? `<table class="sets"><thead><tr><th>#</th><th>kg</th><th>reps</th><th>RPE</th><th></th></tr></thead><tbody>
        ${x.sets.map((s, j) => `<tr><td>${j + 1}</td><td>${num(s.kg)}</td><td>${s.reps}</td><td>${s.rpe ? num(s.rpe) : '–'}</td>
          <td>${s.pr ? '<span title="Record">🏆</span>' : ''}<button class="ghost small" data-del="${j}" aria-label="Supprimer la série">🗑</button></td></tr>`).join('')}
      </tbody></table>` : ''}
      <form class="set-form">
        ${stepper('kg', kgVal, e.increment || 2.5, { label: e.bodyweight ? 'Lest (kg)' : 'Charge (kg)' })}
        ${stepper('reps', repsVal, 1, { label: 'Reps', min: 1, inputmode: 'numeric' })}
        <label class="rpe"><span>RPE</span><select name="rpe"><option value="">–</option>
          ${RPE_VALUES.map(v => `<option value="${v}">${num(v)}</option>`).join('')}</select></label>
        <button class="wide">Valider la série ${x.sets.length + 1}${t ? `/${t.sets}` : ''}</button>
      </form>
    </section>`;
  };

  el.innerHTML = `
    <div class="card session-head">
      <div><h2>${esc(session.name)}</h2>
        <p class="muted">Depuis ${fmtDuration(Date.now() - session.startedAt)} · ${totalSets} séries</p></div>
      <div class="row">
        <button data-finish>Terminer</button>
        <button class="danger" data-cancel>Annuler</button>
      </div>
    </div>
    ${session.exercises.map(card).join('')}
    <div class="card">
      <h3>Ajouter un exercice</h3>
      <form class="row" data-add>
        <select name="exerciseId" required><option value="">Choisir…</option>${exerciseOptions(exercises.filter(e => !e.archived))}</select>
        <button>Ajouter</button>
      </form>
    </div>`;

  bindSteppers(el);

  el.querySelectorAll('.ex-card').forEach(c => {
    const id = Number(c.dataset.ex);
    c.querySelector('.set-form').addEventListener('submit', async ev => {
      ev.preventDefault();
      const f = ev.target;
      try {
        const r = await salle.logSet({ exerciseId: id, kg: f.kg.value, reps: f.reps.value, rpe: f.rpe.value });
        if (r.records.length) toast(`🏆 Record : ${r.records.map(recordLabel).join(', ')}`, 3500);
        startRest(r.rest);
        ctx.rerender();
      } catch (err) { toast(err.message); }
    });
    c.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      await salle.deleteSet(id, Number(b.dataset.del)); ctx.rerender();
    }));
    c.querySelectorAll('[data-move]').forEach(b => b.addEventListener('click', async () => {
      await salle.moveExerciseInSession(id, Number(b.dataset.move)); ctx.rerender();
    }));
    armed(c.querySelector('[data-remove]'), async () => { await salle.removeExerciseFromSession(id); ctx.rerender(); });
  });

  el.querySelector('[data-add]').addEventListener('submit', async ev => {
    ev.preventDefault();
    await salle.addExerciseToSession(ev.target.exerciseId.value);
    ctx.rerender();
  });
  armed(el.querySelector('[data-finish]'), async () => {
    const summary = await salle.finishSession();
    wakeLock?.release(); wakeLock = null;
    if (!summary) { toast('Séance vide : rien n\'a été enregistré'); location.hash = '#/salle'; return; }
    toast('Séance enregistrée 💪');
    location.hash = `#/salle/seance/${summary.id}`;
  });
  armed(el.querySelector('[data-cancel]'), async () => {
    await salle.cancelSession();
    wakeLock?.release(); wakeLock = null;
    location.hash = '#/salle';
  });
}

async function detail(el, ctx, id) {
  const s = await salle.getSession(id);
  if (!s) { el.innerHTML = `${back('#/salle/historique')}<p>Séance introuvable.</p>`; return; }
  ctx.setTitle('Séance');
  const exercises = new Map((await salle.listExercises({ includeArchived: true })).map(e => [e.id, e]));
  const sum = salle.sessionSummary(s);
  const prs = s.exercises.flatMap(x => x.sets.filter(st => st.pr).map(st => ({ x, st })));
  el.innerHTML = `${back('#/salle/historique', 'Historique')}
    <div class="card">
      <h2>${esc(s.name)}</h2>
      <p class="muted">${fmtLongDate(s.date)}</p>
      <div class="stats">
        <div><strong>${fmtDuration(sum.duration)}</strong><span>durée</span></div>
        <div><strong>${sum.sets}</strong><span>séries</span></div>
        <div><strong>${sum.reps}</strong><span>reps</span></div>
        <div><strong>${num(sum.volume, 0)}</strong><span>kg soulevés</span></div>
      </div>
      ${prs.length ? `<p class="pr-line">🏆 ${prs.map(({ x, st }) =>
        `${esc(exercises.get(x.exerciseId)?.name)} ${fmtSet(st)}`).join(' · ')}</p>` : ''}
      ${s.notes ? `<p>${esc(s.notes)}</p>` : ''}
    </div>
    ${s.exercises.map(x => `<div class="card">
      <a href="#/salle/exercices/${x.exerciseId}"><h3>${esc(exercises.get(x.exerciseId)?.name || '?')}</h3></a>
      <p>${x.sets.map(st => `${fmtSet(st)}${st.pr ? ' 🏆' : ''}`).join(' · ')}</p>
    </div>`).join('')}
    <button class="danger wide" data-delete>Supprimer cette séance</button>`;
  armed(el.querySelector('[data-delete]'), async () => {
    await salle.deleteSession(id);
    location.hash = '#/salle/historique';
  });
}
