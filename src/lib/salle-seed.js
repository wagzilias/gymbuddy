// Bibliothèque d'exercices préremplie et programmes types.
// `slug` est un identifiant stable (indépendant de l'id IndexedDB) utilisé par les modèles.

export const MUSCLES = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps',
  'Ischios', 'Fessiers', 'Mollets', 'Abdos', 'Avant-bras'];

export const EQUIPMENT = ['barre', 'haltères', 'machine', 'poulie', 'poids du corps', 'kettlebell'];

// Incrément de charge conseillé par type de matériel (kg).
export const DEFAULT_INCREMENT = {
  'barre': 2.5, 'haltères': 2, 'machine': 5, 'poulie': 2.5, 'poids du corps': 2.5, 'kettlebell': 4,
};

const ex = (slug, name, muscle, equipment, extra = {}) =>
  ({ slug, name, muscle, equipment, increment: DEFAULT_INCREMENT[equipment], ...extra });

export const SEED_EXERCISES = [
  // Pectoraux
  ex('developpe-couche', 'Développé couché', 'Pectoraux', 'barre'),
  ex('developpe-incline', 'Développé incliné', 'Pectoraux', 'barre'),
  ex('developpe-decline', 'Développé décliné', 'Pectoraux', 'barre'),
  ex('developpe-couche-halteres', 'Développé couché haltères', 'Pectoraux', 'haltères'),
  ex('developpe-incline-halteres', 'Développé incliné haltères', 'Pectoraux', 'haltères'),
  ex('ecarte-halteres', 'Écarté haltères', 'Pectoraux', 'haltères'),
  ex('pec-deck', 'Pec deck', 'Pectoraux', 'machine'),
  ex('ecarte-poulie', 'Écarté poulie vis-à-vis', 'Pectoraux', 'poulie'),
  ex('pompes', 'Pompes', 'Pectoraux', 'poids du corps', { bodyweight: true }),
  ex('dips', 'Dips', 'Triceps', 'poids du corps', { bodyweight: true }),
  // Dos
  ex('souleve-de-terre', 'Soulevé de terre', 'Dos', 'barre', { increment: 5 }),
  ex('tractions-pronation', 'Tractions pronation', 'Dos', 'poids du corps', { bodyweight: true }),
  ex('tractions-supination', 'Tractions supination', 'Dos', 'poids du corps', { bodyweight: true }),
  ex('tirage-vertical', 'Tirage vertical poulie', 'Dos', 'poulie'),
  ex('rowing-barre', 'Rowing barre', 'Dos', 'barre'),
  ex('rowing-haltere', 'Rowing haltère un bras', 'Dos', 'haltères'),
  ex('tirage-horizontal', 'Tirage horizontal poulie', 'Dos', 'poulie'),
  ex('pull-over-poulie', 'Pull-over poulie', 'Dos', 'poulie'),
  ex('shrugs', 'Shrugs haltères', 'Dos', 'haltères'),
  // Épaules
  ex('developpe-militaire', 'Développé militaire', 'Épaules', 'barre'),
  ex('developpe-halteres-assis', 'Développé haltères assis', 'Épaules', 'haltères'),
  ex('elevations-laterales', 'Élévations latérales haltères', 'Épaules', 'haltères', { increment: 1 }),
  ex('elevations-laterales-poulie', 'Élévations latérales poulie', 'Épaules', 'poulie', { increment: 1.25 }),
  ex('oiseau', 'Oiseau haltères', 'Épaules', 'haltères', { increment: 1 }),
  ex('face-pull', 'Face pull', 'Épaules', 'poulie'),
  // Biceps
  ex('curl-barre', 'Curl barre', 'Biceps', 'barre'),
  ex('curl-halteres', 'Curl haltères', 'Biceps', 'haltères'),
  ex('curl-marteau', 'Curl marteau', 'Biceps', 'haltères'),
  ex('curl-pupitre', 'Curl pupitre', 'Biceps', 'machine', { increment: 2.5 }),
  ex('curl-poulie', 'Curl poulie', 'Biceps', 'poulie'),
  // Triceps
  ex('extension-triceps-poulie', 'Extension triceps poulie', 'Triceps', 'poulie'),
  ex('barre-au-front', 'Barre au front', 'Triceps', 'barre'),
  ex('extension-nuque', 'Extension nuque haltère', 'Triceps', 'haltères'),
  ex('developpe-prise-serree', 'Développé couché prise serrée', 'Triceps', 'barre'),
  ex('kickback', 'Kickback haltère', 'Triceps', 'haltères', { increment: 1 }),
  // Jambes
  ex('squat', 'Squat', 'Quadriceps', 'barre'),
  ex('front-squat', 'Front squat', 'Quadriceps', 'barre'),
  ex('presse', 'Presse à cuisses', 'Quadriceps', 'machine', { increment: 10 }),
  ex('hack-squat', 'Hack squat', 'Quadriceps', 'machine'),
  ex('leg-extension', 'Leg extension', 'Quadriceps', 'machine'),
  ex('fentes', 'Fentes haltères', 'Quadriceps', 'haltères'),
  ex('squat-bulgare', 'Squat bulgare', 'Quadriceps', 'haltères'),
  ex('goblet-squat', 'Goblet squat', 'Quadriceps', 'kettlebell'),
  ex('souleve-de-terre-roumain', 'Soulevé de terre roumain', 'Ischios', 'barre'),
  ex('leg-curl-allonge', 'Leg curl allongé', 'Ischios', 'machine'),
  ex('leg-curl-assis', 'Leg curl assis', 'Ischios', 'machine'),
  ex('good-morning', 'Good morning', 'Ischios', 'barre'),
  ex('hip-thrust', 'Hip thrust', 'Fessiers', 'barre', { increment: 5 }),
  ex('abduction', 'Abduction machine', 'Fessiers', 'machine'),
  ex('kickback-poulie', 'Kickback fessier poulie', 'Fessiers', 'poulie'),
  ex('mollets-debout', 'Mollets debout', 'Mollets', 'machine'),
  ex('mollets-assis', 'Mollets assis', 'Mollets', 'machine'),
  // Abdos / avant-bras
  ex('crunch', 'Crunch', 'Abdos', 'poids du corps', { bodyweight: true }),
  ex('crunch-poulie', 'Crunch poulie', 'Abdos', 'poulie'),
  ex('releve-jambes', 'Relevé de jambes suspendu', 'Abdos', 'poids du corps', { bodyweight: true }),
  ex('roue-abdominale', 'Roue abdominale', 'Abdos', 'poids du corps', { bodyweight: true }),
  ex('curl-poignet', 'Curl poignets', 'Avant-bras', 'haltères', { increment: 1 }),
];

// t(slug, séries, repsMin, repsMax, repos en secondes)
const t = (slug, sets, repsMin, repsMax, rest) => ({ slug, sets, repsMin, repsMax, rest });

export const TEMPLATES = [
  {
    key: 'full-body', name: 'Full body (3 j/sem, A/B alternés)',
    days: [
      { name: 'Full body A', exercises: [
        t('squat', 3, 5, 8, 180), t('developpe-couche', 3, 6, 10, 150), t('rowing-barre', 3, 8, 10, 120),
        t('elevations-laterales', 3, 12, 15, 60), t('curl-halteres', 2, 10, 12, 60)] },
      { name: 'Full body B', exercises: [
        t('souleve-de-terre-roumain', 3, 8, 10, 150), t('developpe-militaire', 3, 6, 10, 150),
        t('tractions-pronation', 3, 6, 10, 120), t('presse', 3, 10, 12, 120),
        t('extension-triceps-poulie', 2, 10, 15, 60)] },
    ],
  },
  {
    key: 'ppl', name: 'Push / Pull / Legs',
    days: [
      { name: 'Push', exercises: [
        t('developpe-couche', 4, 6, 8, 180), t('developpe-incline-halteres', 3, 8, 12, 120),
        t('developpe-militaire', 3, 8, 10, 120), t('elevations-laterales', 3, 12, 15, 60),
        t('extension-triceps-poulie', 3, 10, 15, 60)] },
      { name: 'Pull', exercises: [
        t('tractions-pronation', 4, 6, 10, 150), t('rowing-barre', 3, 8, 10, 120),
        t('tirage-horizontal', 3, 10, 12, 90), t('face-pull', 3, 12, 15, 60), t('curl-barre', 3, 8, 12, 60)] },
      { name: 'Legs', exercises: [
        t('squat', 4, 5, 8, 180), t('souleve-de-terre-roumain', 3, 8, 10, 150), t('presse', 3, 10, 12, 120),
        t('leg-curl-assis', 3, 10, 15, 75), t('mollets-debout', 4, 10, 15, 60)] },
    ],
  },
  {
    key: 'upper-lower', name: 'Haut / Bas (4 j/sem)',
    days: [
      { name: 'Haut du corps', exercises: [
        t('developpe-couche', 4, 6, 8, 180), t('rowing-barre', 4, 6, 8, 150),
        t('developpe-halteres-assis', 3, 8, 10, 120), t('tirage-vertical', 3, 8, 12, 90),
        t('curl-halteres', 2, 10, 12, 60), t('extension-triceps-poulie', 2, 10, 12, 60)] },
      { name: 'Bas du corps', exercises: [
        t('squat', 4, 5, 8, 180), t('souleve-de-terre-roumain', 3, 8, 10, 150), t('fentes', 3, 10, 12, 90),
        t('leg-curl-allonge', 3, 10, 12, 75), t('mollets-debout', 3, 12, 15, 60)] },
    ],
  },
];
