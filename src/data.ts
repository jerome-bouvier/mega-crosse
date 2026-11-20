export interface Team {
  id: string; name: string; short: string; city: string;
  mascot: string; power: string; powerDesc: string;
  color: number; trim: number; css: string; trimCss: string;
  stats: { v: number; t: number; d: number }; // 1..5
}

export const TEAMS: Team[] = [
  {
    id: 'caen', name: 'CAEN FLOORBALL', short: 'CAE', city: 'Caen',
    mascot: 'Ragnar la panthère', power: 'INSTINCT PRIMAL',
    powerDesc: 'Le prochain tir fonce tout seul vers le but (70 % de réussite).',
    color: 0xe8423c, trim: 0xf4f1ff, css: '#e8423c', trimCss: '#f4f1ff',
    stats: { v: 3, t: 5, d: 3 },
  },
  {
    id: 'sal', name: 'SALAMANDRES', short: 'SAL', city: 'Montbazon',
    mascot: 'Magnus la salamandre', power: 'TURBO SALAMANDRE',
    powerDesc: 'Super vitesse et dribble auto : personne ne te prend la balle (6 s).',
    color: 0xffc62e, trim: 0x1b1a22, css: '#ffc62e', trimCss: '#1b1a22',
    stats: { v: 5, t: 3, d: 3 },
  },
  {
    id: 'nan', name: 'NANTES FLOORBALL', short: 'NAN', city: 'Nantes',
    mascot: "Rouage l'éléphant mécanique", power: 'DÉFENSE MOBILE',
    powerDesc: 'Ton but glisse de gauche à droite pour tromper les tireurs (15 s).',
    color: 0x26b07c, trim: 0xd98a35, css: '#26b07c', trimCss: '#d98a35',
    stats: { v: 3, t: 3, d: 5 },
  },
];

export const statMult = (n: number) => 0.85 + 0.06 * n; // 1 -> 0.91, 5 -> 1.15

export type Difficulty = 'facile' | 'normal';
export const settings = { sound: true, difficulty: 'facile' as Difficulty, seenHelp: false };

const KEY = 'mega-crosse-settings';
export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(settings, JSON.parse(raw));
  } catch { /* stockage indisponible : réglages par défaut */ }
}
export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignoré */ }
}

export interface MatchSetup { player: number; cpu: number }
export interface MatchStats { shots: [number, number]; passes: [number, number]; saves: [number, number] }
export interface MatchResult { setup: MatchSetup; score: [number, number]; stats: MatchStats }

export const PAL = {
  bg: 0x0d0b24, panel: 0x1d1a4a, panel2: 0x2b2766, line: 0x5a54c4,
  text: '#f4f1ff', dim: '#9c96d8', accent: '#ffb52e', accentN: 0xffb52e,
  hot: '#ff5a3c', ok: '#5ee08a',
};
