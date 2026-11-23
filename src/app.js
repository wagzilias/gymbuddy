import { openDB } from './lib/db.js';
import { resume as resumeRestTimer } from './lib/timer.js';
import { ensureSeed } from './actions/salle.js';
import salle from './views/salle.js';
import course from './views/course.js';
import alimentation from './views/alimentation.js';
import assistant from './views/assistant.js';

const routes = { salle, course, alimentation, assistant };
let renderId = 0;

// Routes : #/<module>/<sous-écran>/<param>… ex. #/salle/exercice/12
async function render() {
  const id = ++renderId;
  const [name = 'salle', ...params] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const view = routes[name] || salle;
  document.querySelectorAll('.tabbar a').forEach(a =>
    a.classList.toggle('active', a.getAttribute('href') === `#/${name}`));
  const title = document.getElementById('title');
  title.textContent = view.title;
  // Un conteneur neuf à chaque rendu : les écouteurs de l'écran précédent disparaissent avec lui.
  const el = document.createElement('div');
  const ctx = {
    params,
    setTitle: t => { title.textContent = t; },
    rerender: () => id === renderId && render(),
  };
  try {
    await view.render(el, ctx);
  } catch (err) {
    console.error(err);
    el.innerHTML = `<div class="card"><p>Erreur : ${String(err.message || err)}</p></div>`;
  }
  if (id === renderId) document.getElementById('view').replaceChildren(el);
}

await openDB();
await ensureSeed();
resumeRestTimer();
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
