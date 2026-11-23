// Poids de corps (#/salle/poids). Les données sont partagées avec l'alimentation et la course.
import * as poids from '../../actions/poids.js';
import { lineChart } from '../../lib/chart.js';
import { kg, num, fmtDate, today, localDate, toast } from '../../lib/format.js';
import { back } from './ui.js';

export default async function poidsView(el, ctx) {
  ctx.setTitle('Poids de corps');
  const entries = await poids.listBodyWeights();
  const avg = poids.movingAverage(entries);
  const last = entries[entries.length - 1];
  const monthAgo = entries.filter(e => e.date <= isoDaysAgo(30)).pop();
  const delta = last && monthAgo ? last.kg - monthAgo.kg : null;

  el.innerHTML = `${back('#/salle', 'Salle')}
    <div class="card">
      <form class="stack" data-add>
        <div class="row">
          <input name="kg" type="number" step="0.1" inputmode="decimal" placeholder="Poids (kg)" required>
          <input name="date" type="date" value="${today()}" max="${today()}" required>
        </div>
        <button>Enregistrer</button>
      </form>
    </div>
    ${entries.length ? `<div class="card">
      <div class="stats">
        <div><strong>${kg(last.kg)}</strong><span>dernière mesure</span></div>
        <div><strong>${kg(avg[avg.length - 1].kg)}</strong><span>moyenne 7 j</span></div>
        ${delta != null ? `<div><strong>${delta > 0 ? '+' : ''}${num(delta)} kg</strong><span>sur 30 j</span></div>` : ''}
      </div>
      ${lineChart(avg.map(e => ({ x: e.date, y: e.kg })), { unit: 'kg', secondary: entries.map(e => ({ x: e.date, y: e.kg })) })}
      <p class="muted small-print">Trait plein : moyenne sur 7 jours · pointillés : mesures.</p>
    </div>
    <div class="card"><ul class="list">${entries.slice().reverse().map(e => `<li>
      <span>${fmtDate(e.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
      <span>${kg(e.kg)} <button class="ghost small" data-del="${e.date}" aria-label="Supprimer">🗑</button></span></li>`).join('')}</ul></div>`
    : '<div class="card"><p class="muted">Aucune mesure. Pèse-toi le matin à jeun pour des données comparables.</p></div>'}`;

  el.querySelector('[data-add]').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await poids.logBodyWeight(e.target.kg.value, e.target.date.value);
      toast('Poids enregistré');
      ctx.rerender();
    } catch (err) { toast(err.message); }
  });
  el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    await poids.deleteBodyWeight(b.dataset.del);
    ctx.rerender();
  }));
}

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDate(d);
}
