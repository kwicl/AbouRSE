/** @type {import('tailwindcss').Config} */

/*
 * Palette « Lime / noir / bleu ».
 * Les noms Tailwind d'origine sont conservés pour ne pas toucher aux composants :
 *   slate   -> noir bleuté (950 = noir, 50 = presque blanc)
 *   emerald -> lime (gain, action principale)
 *   sky     -> bleu électrique (action secondaire, prix d'achat, synchro)
 *   rose    -> rouge : réservé aux pertes et aux erreurs
 *   amber   -> jaune : réservé aux avertissements
 */
const ink = {
  50: '#f5f8ff',
  100: '#e8eefb',
  200: '#d5def0',
  300: '#bcc8df',
  400: '#a9b7d1',
  500: '#99a8c4',
  600: '#8c9cb9',
  700: '#34466b',
  800: '#1c2944',
  900: '#0a101d',
  950: '#03060c',
};

const lime = {
  50: '#f8ffe5',
  100: '#eeffbf',
  200: '#e0ff8f',
  300: '#d0fb62',
  400: '#b8f23a',
  500: '#a3e635',
  600: '#7fbd16',
  700: '#5c8d12',
  800: '#42660f',
  900: '#2b430d',
  950: '#142206',
};

const blue = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e3a9f',
  900: '#14285f',
  950: '#0a1533',
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
      colors: { slate: ink, emerald: lime, sky: blue, rose: red, amber: yellow },
      fontFamily: { sans: ['"Manrope Variable"', 'Manrope', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
