// Les JSON sont dans public/examples/ — servis par Vite à /examples/
// BASE_URL gère le sous-chemin en production (ex: /simulations-mdc/)

const base = import.meta.env.BASE_URL;

export const EXAMPLE_FILES = [
  {
    file: "ex_lineaire.json",
    url: `${base}examples/ex_lineaire.json`,
    title: "Rigidité de pièces plastiques",
    context: "3 facteurs · Modèle linéaire · R² = 0.591",
    difficulty: "débutant",
    real_data: true,
  },
  {
    file: "ex_synergie.json",
    url: `${base}examples/ex_synergie.json`,
    title: "Rigidité de pièces plastiques",
    context: "3 facteurs · Modèle synergie · R² = 0.778",
    difficulty: "intermédiaire",
    real_data: true,
  },
  {
    file: "ex_quadratique.json",
    url: `${base}examples/ex_quadratique.json`,
    title: "Rigidité de pièces plastiques",
    context: "3 facteurs · Modèle quadratique · R² = 0.998",
    difficulty: "avancé",
    real_data: true,
  },
  {
    file: "ex_extraction.json",
    url: `${base}examples/ex_extraction.json`,
    title: "Extraction d'un principe actif",
    context: "3 facteurs · Rendement & Pureté",
    difficulty: "débutant",
    real_data: false,
  },
  {
    file: "ex_revetement.json",
    url: `${base}examples/ex_revetement.json`,
    title: "Formulation d'un revêtement",
    context: "4 facteurs · Viscosité",
    difficulty: "intermédiaire",
    real_data: false,
  },
];