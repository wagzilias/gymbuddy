import * as salle from '../../actions/salle.js';
import * as poids from '../../actions/poids.js';
import { esc, kg, num, fmtDate, fmtDuration, toast } from '../../lib/format.js';

export default async function accueil(el, ctx) {
  const [active, programs, recent, weight] = await Promise.all([
    salle.getActiveSession(), salle.listPrograms(), salle.listSessions({ limit: 3 }), poids.latestBodyWeight(),
  ]);
  const nextDays = await Promise.all(programs.map(p => salle.nextDayIndex(p.id)));

  const start = active
    ? `<div class="card highlight">
        <h2>Séance en cours</h2>
        <p>${esc(active.name)} · commencée il y a ${fmtDuration(Date.now() - active.startedAt)}
          · ${active.exercises.reduce((n, e) => n + e.sets.length, 0)} séries</p>
        <a class="button" href="#/salle/seance">Reprendre la séance</a>
      </div>`
    : `<div class="card">
        <h2>Démarrer une séance</h2>
        ${programs.length ? programs.map((p, i) => `
          <div class="start-row">
            <div><strong>${esc(p.name)}</strong>
              <select data-days="${p.id}" aria-label="Journée">${p.days.map((d, j) =>
                `<option value="${j}" ${j === nextDays[i] ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>
            </div>
            <button data-start="${p.id}">Go</button>
          </div>`).join('')
        : `<p class="muted">Aucun programme pour l'instant. <a href="#/salle/programmes">Crée-en un ou choisis un modèle</a>.</p>`}
        <button class="secondary wide" data-free>Séance libre</button>
      </div>`;

  el.innerHTML = `
    ${start}
    <nav class="tiles">
      <a href="#/salle/programmes">📋<span>Programmes</span></a>
      <a href="#/salle/exercices">💪<span>Exercices</span></a>
      <a href="#/salle/historique">📈<span>Historique</span></a>
      <a href="#/salle/poids">⚖️<span>Poids</span></a>
    </nav>
    <div class="card">
      <h2>Poids de corps</h2>
      <form class="inline-form" data-weight>
        <span class="big">${weight ? kg(weight.kg) : '–'}</span>
        <span class="muted">${weight ? fmtDate(weight.date) : ''}</span>
        <input name="kg" type="number" step="0.1" inputmode="decimal" placeholder="kg aujourd'hui" required>
        <button>OK</button>
      </form>
    </div>
    <div class="card">
      <h2>Dernières séances</h2>
      ${recent.length ? `<ul class="list">${recent.map(s => {
        const sum = salle.sessionSummary(s);
        return `<li><a href="#/salle/seance/${s.id}"><span>${esc(s.name)}<small>${fmtDate(s.date)} · ${fmtDuration(sum.duration)}</small></span>
          <span class="muted">${sum.sets} séries · ${num(sum.volume / 1000)} t</span></a></li>`;
      }).join('')}</ul><a href="#/salle/historique">Tout l'historique ›</a>`
      : '<p class="muted">Aucune séance enregistrée.</p>'}
    </div>`;

  el.querySelectorAll('[data-start]').forEach(b => b.addEventListener('click', async () => {
    const programId = Number(b.dataset.start);
    const dayIndex = Number(el.querySelector(`[data-days="${programId}"]`).value);
    await salle.startSession({ programId, dayIndex });
    location.hash = '#/salle/seance';
  }));
  el.querySelector('[data-free]')?.addEventListener('click', async () => {
    await salle.startSession();
    location.hash = '#/salle/seance';
  });
  el.querySelector('[data-weight]').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await poids.logBodyWeight(e.target.kg.value);
      toast('Poids enregistré');
      ctx.rerender();
    } catch (err) { toast(err.message); }
  });
}
