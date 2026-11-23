// Programmes (#/salle/programmes), éditeur (#/salle/programmes/12 ou /nouveau).
import * as salle from '../../actions/salle.js';
import { esc, fmtTarget, toast } from '../../lib/format.js';
import { back, armed, exerciseOptions } from './ui.js';

export default async function programmes(el, ctx) {
  if (ctx.params[0]) return editor(el, ctx, ctx.params[0]);
  ctx.setTitle('Programmes');
  const [programs, exercises] = await Promise.all([salle.listPrograms(), salle.listExercises({ includeArchived: true })]);
  const names = new Map(exercises.map(e => [e.id, e.name]));
  el.innerHTML = `${back('#/salle', 'Salle')}
    ${programs.map(p => `<div class="card">
      <div class="ex-head"><h2>${esc(p.name)}</h2><a class="button secondary small" href="#/salle/programmes/${p.id}">Modifier</a></div>
      ${p.days.map(d => `<h4>${esc(d.name)}</h4><p class="muted">${d.exercises.map(t =>
        `${esc(names.get(t.exerciseId) || '?')} ${fmtTarget(t)}`).join(' · ') || 'Aucun exercice'}</p>`).join('')}
    </div>`).join('') || '<div class="card"><p class="muted">Aucun programme.</p></div>'}
    <a class="button wide" href="#/salle/programmes/nouveau">➕ Créer un programme</a>
    <div class="card">
      <h3>Partir d'un modèle</h3>
      <ul class="list">${salle.listTemplates().map(t => `<li><span>${esc(t.name)}<small>${t.days} séances types</small></span>
        <button class="secondary small" data-tpl="${t.key}">Ajouter</button></li>`).join('')}</ul>
    </div>`;
  el.querySelectorAll('[data-tpl]').forEach(b => b.addEventListener('click', async () => {
    const p = await salle.createProgramFromTemplate(b.dataset.tpl);
    toast(`${p.name} ajouté : ajuste-le à ta guise`);
    location.hash = `#/salle/programmes/${p.id}`;
  }));
}

const blankTarget = () => ({ exerciseId: '', sets: 3, repsMin: 8, repsMax: 12, rest: 90, kg: '' });

async function editor(el, ctx, param) {
  const isNew = param === 'nouveau';
  const loaded = isNew ? null : await salle.getProgram(param);
  if (!isNew && !loaded) { el.innerHTML = `${back('#/salle/programmes')}<p>Programme introuvable.</p>`; return; }
  ctx.setTitle(isNew ? 'Nouveau programme' : 'Modifier le programme');
  const exercises = await salle.listExercises();
  const program = loaded ? structuredClone(loaded) : { name: '', days: [{ name: 'Jour 1', exercises: [blankTarget()] }] };

  const num = (name, value, label, attrs = '') =>
    `<label class="mini"><span>${label}</span><input data-f="${name}" type="number" inputmode="numeric" value="${value ?? ''}" ${attrs}></label>`;

  const draw = () => {
    el.innerHTML = `${back('#/salle/programmes', 'Programmes')}
      <div class="card"><label class="stack">Nom du programme
        <input data-name value="${esc(program.name)}" placeholder="ex. PPL hiver" required></label></div>
      ${program.days.map((d, di) => `<div class="card" data-day="${di}">
        <div class="ex-head">
          <input class="day-name" data-dayname value="${esc(d.name)}" aria-label="Nom de la séance">
          <button class="ghost small" data-delday aria-label="Supprimer la séance">🗑</button>
        </div>
        ${d.exercises.map((t, ti) => `<div class="target-row" data-t="${ti}">
          <div class="row">
            <select data-f="exerciseId" required><option value="">Exercice…</option>${exerciseOptions(exercises, Number(t.exerciseId))}</select>
            <button class="ghost small" data-mv="-1" aria-label="Monter">↑</button>
            <button class="ghost small" data-mv="1" aria-label="Descendre">↓</button>
            <button class="ghost small" data-delt aria-label="Retirer">✕</button>
          </div>
          <div class="row mini-row">
            ${num('sets', t.sets, 'Séries', 'min="1"')}
            ${num('repsMin', t.repsMin, 'Reps min', 'min="1"')}
            ${num('repsMax', t.repsMax, 'Reps max', 'min="1"')}
            ${num('rest', t.rest, 'Repos (s)', 'min="0" step="15"')}
            ${num('kg', t.kg, 'Charge', 'step="any" placeholder="auto"')}
          </div>
        </div>`).join('')}
        <button class="secondary small" data-addt>➕ Exercice</button>
      </div>`).join('')}
      <button class="secondary wide" data-addday>➕ Ajouter une séance type</button>
      <button class="wide" data-save>Enregistrer le programme</button>
      ${isNew ? '' : '<button class="danger wide" data-delete>Supprimer le programme</button>'}
      <p class="muted small-print">Charge vide = calculée automatiquement à partir de ta dernière séance (surcharge progressive).</p>`;
    const del = el.querySelector('[data-delete]');
    if (del) armed(del, async () => { await salle.deleteProgram(program.id); location.hash = '#/salle/programmes'; });
  };
  draw();

  // Les saisies mettent à jour l'objet `program` ; les changements de structure redessinent l'écran.
  el.addEventListener('input', e => {
    const f = e.target;
    if (f.matches('[data-name]')) { program.name = f.value; return; }
    const day = program.days[f.closest('[data-day]')?.dataset.day];
    if (!day) return;
    if (f.matches('[data-dayname]')) { day.name = f.value; return; }
    const t = day.exercises[f.closest('[data-t]')?.dataset.t];
    if (t && f.dataset.f) t[f.dataset.f] = f.value;
  });
  el.addEventListener('change', e => { if (e.target.matches('select[data-f]')) e.target.dispatchEvent(new Event('input', { bubbles: true })); });

  el.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    const di = b.closest('[data-day]')?.dataset.day;
    const day = program.days[di];
    const ti = Number(b.closest('[data-t]')?.dataset.t);
    if (b.matches('[data-addt]')) { day.exercises.push(blankTarget()); draw(); }
    else if (b.matches('[data-delt]')) { day.exercises.splice(ti, 1); draw(); }
    else if (b.matches('[data-mv]')) {
      const j = ti + Number(b.dataset.mv);
      if (j >= 0 && j < day.exercises.length) [day.exercises[ti], day.exercises[j]] = [day.exercises[j], day.exercises[ti]];
      draw();
    }
    else if (b.matches('[data-addday]')) { program.days.push({ name: `Jour ${program.days.length + 1}`, exercises: [blankTarget()] }); draw(); }
    else if (b.matches('[data-delday]')) { program.days.splice(di, 1); draw(); }
    else if (b.matches('[data-save]')) {
      if (!program.days.some(d => d.exercises.some(t => t.exerciseId))) { toast('Ajoute au moins un exercice'); return; }
      await salle.saveProgram(program);
      toast('Programme enregistré');
      location.hash = '#/salle/programmes';
    }
  });
}
