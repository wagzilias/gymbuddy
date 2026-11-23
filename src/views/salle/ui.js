// Briques d'interface partagées par les écrans du module salle.
import { esc } from '../../lib/format.js';
import { MUSCLES } from '../../lib/salle-seed.js';

export const back = (href, label = 'Retour') => `<a class="back" href="${href}">‹ ${esc(label)}</a>`;

/** Champ numérique avec boutons − / +. */
export const stepper = (name, value, step, { label = '', min = 0, inputmode = 'decimal' } = {}) => `
  <label class="stepper"><span>${esc(label)}</span>
    <div><button type="button" class="ghost" data-step="-${step}" data-for="${name}">−</button>
    <input name="${name}" type="number" inputmode="${inputmode}" step="any" min="${min}" value="${value ?? ''}">
    <button type="button" class="ghost" data-step="${step}" data-for="${name}">+</button></div>
  </label>`;

/** Active les boutons − / + des steppers contenus dans `root`. */
export function bindSteppers(root) {
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const input = b.closest('.stepper').querySelector(`input[name="${b.dataset.for}"]`);
    const v = Math.max(Number(input.min) || 0, (Number(input.value) || 0) + Number(b.dataset.step));
    input.value = Math.round(v * 100) / 100;
  });
}

/** Bouton à double appui pour les actions destructrices (évite les boîtes de dialogue). */
export function armed(button, action) {
  const label = button.textContent;
  button.addEventListener('click', async () => {
    if (button.dataset.armed) { await action(); return; }
    button.dataset.armed = '1';
    button.textContent = 'Confirmer ?';
    setTimeout(() => { delete button.dataset.armed; button.textContent = label; }, 3000);
  });
}

export const exerciseOptions = (exercises, selected) => {
  const groups = {};
  exercises.forEach(e => (groups[e.muscle] ??= []).push(e));
  const order = [...MUSCLES, ...Object.keys(groups).filter(m => !MUSCLES.includes(m))];
  return order.filter(m => groups[m]).map(m => `<optgroup label="${esc(m)}">${groups[m].map(e =>
    `<option value="${e.id}" ${e.id === selected ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</optgroup>`).join('');
};

export const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
