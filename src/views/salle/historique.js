// Historique des séances (#/salle/historique).
import * as salle from '../../actions/salle.js';
import { lineChart } from '../../lib/chart.js';
import { esc, num, fmtDate, fmtDuration, localDate } from '../../lib/format.js';
import { back } from './ui.js';

/** Lundi de la semaine d'une date AAAA-MM-JJ. */
function weekStart(iso) {
  const d = new Date(`${iso}T12:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localDate(d);
}

export default async function historique(el, ctx) {
  ctx.setTitle('Historique');
  const sessions = await salle.listSessions();
  const summaries = sessions.map(s => ({ s, sum: salle.sessionSummary(s) }));

  // Volume hebdomadaire (12 dernières semaines avec activité).
  const weeks = new Map();
  summaries.forEach(({ s, sum }) => {
    const w = weekStart(s.date);
    const cur = weeks.get(w) || { sessions: 0, volume: 0 };
    weeks.set(w, { sessions: cur.sessions + 1, volume: cur.volume + sum.volume });
  });
  const weekly = [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  const thisWeek = weeks.get(weekStart(localDate())) || { sessions: 0, volume: 0 };

  // Regroupement par mois.
  const months = new Map();
  summaries.forEach(x => {
    const m = x.s.date.slice(0, 7);
    months.set(m, [...(months.get(m) || []), x]);
  });

  el.innerHTML = `${back('#/salle', 'Salle')}
    <div class="card">
      <div class="stats">
        <div><strong>${thisWeek.sessions}</strong><span>séances cette semaine</span></div>
        <div><strong>${num(thisWeek.volume / 1000)} t</strong><span>volume cette semaine</span></div>
        <div><strong>${sessions.length}</strong><span>séances au total</span></div>
      </div>
      ${weekly.length > 1 ? `<h3>Volume par semaine (kg)</h3>${lineChart(weekly.map(([x, v]) => ({ x, y: Math.round(v.volume) })), { unit: 'kg' })}` : ''}
    </div>
    ${[...months.entries()].map(([m, list]) => `<div class="card">
      <h3>${fmtDate(`${m}-01`, { month: 'long', year: 'numeric' })}</h3>
      <ul class="list">${list.map(({ s, sum }) => `<li><a href="#/salle/seance/${s.id}">
        <span>${esc(s.name)}<small>${fmtDate(s.date, { weekday: 'short', day: 'numeric' })} · ${fmtDuration(sum.duration)} · ${sum.exercises} exercices</small></span>
        <span class="muted">${sum.sets} séries<br>${num(sum.volume, 0)} kg</span></a></li>`).join('')}</ul>
    </div>`).join('') || '<div class="card"><p class="muted">Aucune séance pour l\'instant.</p></div>'}`;
}
