// Courbe SVG minimaliste, sans dépendance. points : [{ x: 'AAAA-MM-JJ', y: nombre }] triés par date.
import { esc, num, fmtDate } from './format.js';

export function lineChart(points, { unit = '', height = 180, secondary = null } = {}) {
  if (!points.length) return '<p class="muted">Pas encore de données.</p>';
  const W = 340, H = height, L = 40, R = 12, T = 14, B = 24;
  const t = p => new Date(`${p.x}T12:00`).getTime();
  const all = secondary ? points.concat(secondary) : points;
  const xs = all.map(t), ys = all.map(p => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 86400000; x1 += 86400000; }
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.15 || Math.max(1, y1 * 0.05);
  y0 = Math.max(0, y0 - pad); y1 += pad;
  const sx = v => L + (v - x0) / (x1 - x0) * (W - L - R);
  const sy = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const path = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(t(p)).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');

  const ticks = [y0, (y0 + y1) / 2, y1];
  const grid = ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" class="grid"/>
    <text x="${L - 6}" y="${sy(v) + 4}" text-anchor="end">${num(v, 0)}</text>`).join('');
  const last = points[points.length - 1];
  const dots = points.length <= 40
    ? points.map(p => `<circle cx="${sx(t(p))}" cy="${sy(p.y)}" r="3"><title>${esc(fmtDate(p.x))} : ${num(p.y)} ${esc(unit)}</title></circle>`).join('')
    : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe">
    ${grid}
    ${secondary ? `<path d="${path(secondary)}" class="line2"/>` : ''}
    <path d="${path(points)}" class="line"/>
    ${dots}
    <text x="${L}" y="${H - 6}">${esc(fmtDate(points[0].x))}</text>
    <text x="${W - R}" y="${H - 6}" text-anchor="end">${esc(fmtDate(last.x))}</text>
  </svg>`;
}
