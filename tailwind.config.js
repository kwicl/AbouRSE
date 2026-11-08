/** @type {import('tailwindcss').Config} */

/*
 * Palette « Nuit » tirée de la photo de fond (public/bg-night.jpg) :
 * brume bleu ardoise, lumières ambrées de la ville, fauteuil en cuir.
 * Thème sombre : la photo reste visible, les textes sont clairs.
 * Les noms Tailwind d'origine sont conservés pour ne pas toucher aux composants :
 *   slate   -> bleu brume (950 = nuit, 50 = presque blanc)
 *   emerald -> vert (gain), lumineux pour rester lisible sur fond sombre
 *   rose    -> rouge (perte)
 *   sky     -> ambre des lumières de la ville (actions, synchro)
 *   amber   -> jaune (avertissements)
 */
const mist = {
  50: '#f4f7fa',
  100: '#e6edf3',
  200: '#d4dee7',
  300: '#c3d0db',
  400: '#b3c2cf',
  500: '#a2b3c2',
  600: '#8597a8',
  700: '#4a5d6e',
  800: '#2e3d4b',
  900: '#1c2833',
  950: '#111a22',
};

const green = {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e',
  600: '#16a34a',
  700: '#15803d',
  800: '#166534',
  900: '#14532d',
  950: '#052e16',
};

const red = {
  50: '#fef2f2',
  100: '#fee2e2',
  200: '#fecaca',
  300: '#fca5a5',
  400: '#f87171',
  500: '#ef4444',
  600: '#dc2626',
  700: '#b91c1c',
  800: '#991b1b',
  900: '#7f1d1d',
  950: '#450a0a',
};

const cityLight = {
  50: '#fff6ea',
  100: '#ffe8c9',
  200: '#ffd6a3',
  300: '#ffc98a',
  400: '#f5a85a',
  500: '#e08a3c',
  600: '#c06f2a',
  700: '#94531f',
  800: '#6b3c17',
  900: '#4a2a10',
  950: '#2a170a',
};

const yellow = {
  50: '#fefce8',
  100: '#fef9c3',
  200: '#fef08a',
  300: '#fde68a',
  400: '#fcd34d',
  500: '#f59e0b',
  600: '#d97706',
  700: '#b45309',
  800: '#92400e',
  900: '#78350f',
  950: '#451a03',
};

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: mist,
        emerald: green,
        rose: red,
        sky: cityLight,
        amber: yellow,
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
