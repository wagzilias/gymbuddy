// Bus d'événements partagé : prévient l'interface quand une action modifie les données
// (utile quand l'assistant vocal agira hors de l'écran affiché).
export const changes = new EventTarget();

export function emit(type, detail = {}) {
  changes.dispatchEvent(new CustomEvent('change', { detail: { type, ...detail } }));
}
