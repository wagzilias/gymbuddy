// Minuteur de repos : barre fixe au-dessus des onglets, survit aux changements d'écran
// et au rechargement (l'heure de fin est gardée dans localStorage).
import { fmtClock } from './format.js';

const KEY = 'gymbuddy.rest';
let bar, interval, audio;

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const save = st => st ? localStorage.setItem(KEY, JSON.stringify(st)) : localStorage.removeItem(KEY);

function ensureBar() {
  if (bar) return bar;
  bar = document.createElement('div');
  bar.className = 'rest-bar';
  bar.hidden = true;
  bar.innerHTML = `<div class="rest-progress"></div>
    <span class="rest-label">Repos</span><strong class="rest-time">0:00</strong>
    <button data-d="-15" class="ghost">−15 s</button><button data-d="15" class="ghost">+15 s</button>
    <button data-stop class="ghost" aria-label="Arrêter">✕</button>`;
  bar.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.stop !== undefined) stopRest(); else adjustRest(Number(b.dataset.d));
  });
  document.body.appendChild(bar);
  return bar;
}

function beep() {
  try {
    const ctx = audio;
    if (!ctx) return;
    [0, 0.25, 0.5].forEach(at => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; g.gain.value = 0.15;
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 0.15);
    });
  } catch { /* son indisponible */ }
}

function tick() {
  const st = load();
  ensureBar();
  if (!st) { bar.hidden = true; clearInterval(interval); interval = null; return; }
  const left = (st.endAt - Date.now()) / 1000;
  bar.hidden = false;
  if (left <= 0) {
    if (!st.done) {
      st.done = true; save(st);
      navigator.vibrate?.([300, 150, 300]);
      beep();
    }
    bar.classList.add('done');
    bar.querySelector('.rest-label').textContent = 'Repos terminé';
    bar.querySelector('.rest-time').textContent = 'Go !';
    bar.querySelector('.rest-progress').style.width = '100%';
    if (left < -8) stopRest();
    return;
  }
  bar.classList.remove('done');
  bar.querySelector('.rest-label').textContent = 'Repos';
  bar.querySelector('.rest-time').textContent = fmtClock(left);
  bar.querySelector('.rest-progress').style.width = `${100 * (1 - left / st.total)}%`;
}

export function startRest(seconds) {
  if (!(seconds > 0)) return;
  // L'AudioContext doit être créé pendant un geste de l'utilisateur (clic sur « Valider »).
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch { /* */ }
  save({ endAt: Date.now() + seconds * 1000, total: seconds });
  resume();
}

export function adjustRest(delta) {
  const st = load();
  if (!st) return;
  st.endAt += delta * 1000;
  st.total = Math.max(1, st.total + delta);
  st.done = false;
  save(st);
  tick();
}

export function stopRest() { save(null); tick(); }

/** À appeler au démarrage de l'app pour reprendre un repos en cours. */
export function resume() {
  tick();
  if (load() && !interval) interval = setInterval(tick, 250);
}
