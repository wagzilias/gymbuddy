// Module salle : aiguillage vers les sous-écrans (#/salle/<écran>/<param>).
import accueil from './salle/accueil.js';
import seance from './salle/seance.js';
import programmes from './salle/programmes.js';
import exercices from './salle/exercices.js';
import historique from './salle/historique.js';
import poids from './salle/poids.js';

const screens = {
  '': accueil,
  seance,          // #/salle/seance (en cours) · #/salle/seance/12 (détail)
  programmes,      // #/salle/programmes · #/salle/programmes/12 · #/salle/programmes/nouveau
  exercices,       // #/salle/exercices · #/salle/exercices/12
  historique,
  poids,
};

export default {
  title: 'Salle',
  async render(el, ctx = { params: [] }) {
    const [screen = '', ...rest] = ctx.params;
    const view = screens[screen] || accueil;
    await view(el, { ...ctx, params: rest });
  },
};
