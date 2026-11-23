// Petites aides d'affichage, en français.

export const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Date locale au format AAAA-MM-JJ. */
export function localDate(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
export const today = () => localDate();

export const num = (n, digits = 1) =>
  n == null || Number.isNaN(Number(n)) ? '–' : Number(n).toLocaleString('fr-FR', { maximumFractionDigits: digits });
export const kg = n => `${num(n)} kg`;

export function fmtDate(iso, opts = { day: 'numeric', month: 'short' }) {
  if (!iso) return '';
  return new Date(`${iso}T12:00`).toLocaleDateString('fr-FR', opts);
}
export const fmtLongDate = iso => fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'long' });

export function fmtDuration(ms) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** Minuscules sans accents, pour les recherches. */
export const normalize = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const fmtSet = s => `${num(s.kg)}×${s.reps}${s.rpe ? ` @${num(s.rpe)}` : ''}`;
export const fmtTarget = t => !t ? '' :
  `${t.sets} × ${t.repsMin === t.repsMax || !t.repsMax ? t.repsMin : `${t.repsMin}-${t.repsMax}`}`;

export function toast(message, ms = 2500) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
