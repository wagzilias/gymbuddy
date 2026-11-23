// Bibliothèque d'exercices (#/salle/exercices) et progression d'un exercice (#/salle/exercices/12).
import * as salle from '../../actions/salle.js';
import { recordLabel } from '../../lib/calc.js';
import { lineChart } from '../../lib/chart.js';
import { MUSCLES, EQUIPMENT, DEFAULT_INCREMENT } from '../../lib/salle-seed.js';
import { esc, num, kg, fmtDate, fmtSet, normalize, toast } from '../../lib/format.js';
import { back, armed } from './ui.js';

let filter = { q: '', muscle: '' };

export default async function exercices(el, ctx) {
  if (ctx.params[0]) return progress(el, ctx, Number(ctx.params[0]));
  ctx.setTitle('Exercices');
  const all = await salle.listExercises();

  const options = (list, sel) => list.map(v => `<option ${v === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');
  el.innerHTML = `${back('#/salle', 'Salle')}
    <div class="card">
      <input type="search" name="q" placeholder="Rechercher un exercice" value="${esc(filter.q)}">
      <div class="chips">${['', ...MUSCLES].map(m =>
        `<button class="chip ${filter.muscle === m ? 'on' : ''}" data-muscle="${esc(m)}">${m || 'Tous'}</button>`).join('')}</div>
    </div>
    <div class="card"><ul class="list" data-list></ul></div>
    <details class="card">
      <summary>➕ Nouvel exercice</summary>
      <form class="stack" data-new>
        <input name="name" placeholder="Nom (ex. Rowing Yates)" required>
        <label>Muscle <select name="muscle">${options(MUSCLES, filter.muscle || 'Pectoraux')}</select></label>
        <label>Matériel <select name="equipment">${options(EQUIPMENT, 'barre')}</select></label>
        <label>Incrément de charge (kg) <input name="increment" type="number" step="0.25" value="2.5"></label>
        <button>Ajouter à la bibliothèque</button>
      </form>
    </details>`;

  const list = el.querySelector('[data-list]');
  const draw = () => {
    const q = normalize(filter.q);
    const shown = all.filter(e => (!filter.muscle || e.muscle === filter.muscle) && (!q || normalize(e.name).includes(q)));
    list.innerHTML = shown.length ? shown.map(e => `<li><a href="#/salle/exercices/${e.id}">
      <span>${esc(e.name)}${e.custom ? ' <small class="badge">perso</small>' : ''}<small>${esc(e.muscle)} · ${esc(e.equipment)}</small></span><span>›</span></a></li>`).join('')
      : '<li class="muted">Aucun exercice.</li>';
  };
  draw();

  el.querySelector('[name=q]').addEventListener('input', e => { filter.q = e.target.value; draw(); });
  el.querySelectorAll('[data-muscle]').forEach(b => b.addEventListener('click', () => {
    filter.muscle = b.dataset.muscle;
    el.querySelectorAll('[data-muscle]').forEach(x => x.classList.toggle('on', x === b));
    draw();
  }));
  const form = el.querySelector('[data-new]');
  form.equipment.addEventListener('change', () => { form.increment.value = DEFAULT_INCREMENT[form.equipment.value]; });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const ex = await salle.addExercise({ name: form.name.value, muscle: form.muscle.value,
      equipment: form.equipment.value, increment: form.increment.value, bodyweight: form.equipment.value === 'poids du corps' });
    toast(`${ex.name} ajouté`);
    location.hash = `#/salle/exercices/${ex.id}`;
  });
}

const METRICS = { e1rm: ['1RM estimé', 'kg'], volume: ['Volume', 'kg'], topKg: ['Charge max', 'kg'], maxReps: ['Reps max', 'reps'] };
let metric = 'e1rm';

async function progress(el, ctx, id) {
  const p = await salle.getExerciseProgress(id);
  if (!p) { el.innerHTML = `${back('#/salle/exercices')}<p>Exercice introuvable.</p>`; return; }
  const { exercise: e, perfs, records, series } = p;
  ctx.setTitle(e.name);
  const sug = await salle.getSuggestion(id);
  if (e.bodyweight && !records.maxKg && metric !== 'maxReps') metric = 'maxReps';

  const recordCards = ['e1rm', 'maxKg', 'maxReps', 'setVolume', 'sessionVolume'].filter(k => records[k]).map(k => {
    const r = records[k];
    const value = k === 'maxReps' ? `${r.value} reps` : kg(r.value);
    return `<div><strong>${value}</strong><span>${recordLabel(k)}</span><small>${r.set ? `${fmtSet(r.set)} · ` : ''}${fmtDate(r.date)}</small></div>`;
  }).join('');

  el.innerHTML = `${back('#/salle/exercices', 'Exercices')}
    <div class="card">
      <h2>${esc(e.name)}</h2>
      <p class="muted">${esc(e.muscle)} · ${esc(e.equipment)} · +${num(e.increment, 2)} kg par palier${e.archived ? ' · archivé' : ''}</p>
      <p class="hint ${sug.kind}">💡 Prochaine séance : ${esc(sug.reason)}</p>
    </div>
    ${perfs.length ? `
    <div class="card">
      <h3>Records</h3>
      <div class="stats records">${recordCards}</div>
    </div>
    <div class="card">
      <div class="chips">${Object.entries(METRICS).map(([k, [label]]) =>
        `<button class="chip ${k === metric ? 'on' : ''}" data-metric="${k}">${label}</button>`).join('')}</div>
      <div data-chart>${lineChart(series[metric], { unit: METRICS[metric][1] })}</div>
    </div>
    <div class="card">
      <h3>Historique</h3>
      <ul class="list">${perfs.map(pf => `<li><a href="#/salle/seance/${pf.sessionId}">
        <span>${fmtDate(pf.date, { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}<small>${pf.sets.map(s => `${fmtSet(s)}${s.pr ? ' 🏆' : ''}`).join(' · ')}</small></span><span>›</span></a></li>`).join('')}</ul>
    </div>` : '<div class="card"><p class="muted">Pas encore de série enregistrée sur cet exercice.</p></div>'}
    <details class="card">
      <summary>✏️ Modifier l'exercice</summary>
      <form class="stack" data-edit>
        <input name="name" value="${esc(e.name)}" required>
        <label>Muscle <select name="muscle">${MUSCLES.map(m => `<option ${m === e.muscle ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        <label>Matériel <select name="equipment">${EQUIPMENT.map(m => `<option ${m === e.equipment ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        <label>Incrément de charge (kg) <input name="increment" type="number" step="0.25" value="${e.increment}"></label>
        <button>Enregistrer</button>
        <button type="button" class="danger" data-delete>Supprimer l'exercice</button>
      </form>
    </details>`;

  el.querySelectorAll('[data-metric]').forEach(b => b.addEventListener('click', () => {
    metric = b.dataset.metric;
    el.querySelectorAll('[data-metric]').forEach(x => x.classList.toggle('on', x === b));
    el.querySelector('[data-chart]').innerHTML = lineChart(series[metric], { unit: METRICS[metric][1] });
  }));
  const form = el.querySelector('[data-edit]');
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    await salle.updateExercise(id, { name: form.name.value.trim(), muscle: form.muscle.value,
      equipment: form.equipment.value, increment: form.increment.value, bodyweight: form.equipment.value === 'poids du corps' });
    toast('Exercice mis à jour');
    ctx.rerender();
  });
  armed(form.querySelector('[data-delete]'), async () => {
    const r = await salle.deleteExercise(id);
    toast(r.archived ? 'Exercice archivé (il reste dans ton historique)' : 'Exercice supprimé');
    location.hash = '#/salle/exercices';
  });
}
