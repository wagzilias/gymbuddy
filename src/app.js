import { openDB } from './lib/db.js';
import salle from './views/salle.js';
import course from './views/course.js';
import alimentation from './views/alimentation.js';
import assistant from './views/assistant.js';

const routes = { salle, course, alimentation, assistant };

async function render() {
  const name = location.hash.replace('#/', '') || 'salle';
  const view = routes[name] || salle;
  document.querySelectorAll('.tabbar a').forEach(a =>
    a.classList.toggle('active', a.getAttribute('href') === `#/${name}`));
  document.getElementById('title').textContent = view.title;
  const el = document.getElementById('view');
  el.innerHTML = '';
  await view.render(el);
}

await openDB();
window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
