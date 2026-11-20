import Phaser from 'phaser';
import { PAL } from './data';
import { sfx, unlockAudio } from './sfx';

export const FONT = '"Press Start 2P", monospace';
export const BODY = 'VT323, monospace';

/** Texte courant (police VT323 des maquettes, accents complets). */
export function vt(scene: Phaser.Scene, x: number, y: number, s: string, size = 14, color: string = PAL.text, origin = 0.5) {
  const t = scene.add.text(x, y, s, { fontFamily: BODY, fontSize: `${size}px`, color, align: 'center', lineSpacing: 0 });
  t.setOrigin(origin, 0.5);
  return t;
}

// La police pixel n'a pas les majuscules accentuées : on les simplifie (usage courant en français).
export const caps = (s: string) => s.replace(/[ÉÈÊ]/g, 'E').replace(/[ÎÏ]/g, 'I').replace(/[ÀÂ]/g, 'A').replace(/Ô/g, 'O').replace(/[ÙÛ]/g, 'U');

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size = 8, color = PAL.text, origin = 0.5) {
  s = caps(s);
  const t = scene.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center', lineSpacing: Math.round(size * 0.6) });
  t.setOrigin(origin, 0.5);
  return t;
}

export function shadowTxt(scene: Phaser.Scene, x: number, y: number, s: string, size: number, color: string, shadow = '#120f2a') {
  const t = txt(scene, x, y, s, size, color);
  t.setShadow(0, Math.max(2, size / 8), shadow, 0, false, true);
  return t;
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill = PAL.panel, border = PAL.line) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.45); g.fillRect(x - w / 2 + 3, y - h / 2 + 3, w, h);
  g.fillStyle(fill, 1); g.fillRect(x - w / 2, y - h / 2, w, h);
  g.lineStyle(2, border, 1); g.strokeRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2);
  return g;
}

export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void, opts: { fill?: number; color?: string; size?: number } = {}) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (down: boolean) => {
    g.clear();
    const dy = down ? 2 : 0;
    g.fillStyle(0x000000, 0.5); g.fillRect(-w / 2, -h / 2 + 3, w, h);
    g.fillStyle(opts.fill ?? PAL.accentN, 1); g.fillRect(-w / 2, -h / 2 + dy, w, h);
    g.fillStyle(0xffffff, 0.25); g.fillRect(-w / 2 + 2, -h / 2 + dy + 2, w - 4, 2);
    g.lineStyle(2, 0x120f2a, 1); g.strokeRect(-w / 2, -h / 2 + dy, w, h);
    t.y = dy;
  };
  const t = txt(scene, 0, 0, label, opts.size ?? 8, opts.color ?? '#120f2a');
  c.add([g, t]);
  draw(false);
  c.setSize(w, h);
  c.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h + 4), Phaser.Geom.Rectangle.Contains);
  c.on('pointerdown', () => { unlockAudio(); draw(true); });
  c.on('pointerout', () => draw(false));
  c.on('pointerup', () => { draw(false); sfx.click(); onClick(); });
  return c;
}

export function starfield(scene: Phaser.Scene) {
  const { width: w, height: h } = scene.scale;
  scene.cameras.main.setBackgroundColor(PAL.bg);
  const g = scene.add.graphics();
  for (let i = 0; i < 70; i++) {
    g.fillStyle(i % 7 === 0 ? PAL.accentN : 0x5a54c4, Phaser.Math.FloatBetween(0.3, 0.9));
    g.fillRect(Phaser.Math.Between(0, w), Phaser.Math.Between(0, h), 1, 1);
  }
  // sol en damier façon console portable
  for (let x = 0; x < w; x += 16) {
    g.fillStyle(0x1d1a4a, 0.5); g.fillRect(x, h - 18, 8, 18);
  }
  return g;
}

export function bars(scene: Phaser.Scene, x: number, y: number, label: string, n: number, color: number) {
  const c = scene.add.container(0, 0);
  c.add(txt(scene, x, y, label, 8, PAL.dim, 0));
  const g = scene.add.graphics();
  for (let i = 0; i < 5; i++) {
    g.fillStyle(i < n ? color : 0x2b2766, 1); g.fillRect(x + 72 + i * 12, y - 4, 10, 8);
  }
  c.add(g);
  return c;
}

export function showHelp(scene: Phaser.Scene, onClose: () => void) {
  const { width: w, height: h } = scene.scale;
  const c = scene.add.container(0, 0).setDepth(1000);
  const dim = scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6).setInteractive();
  const pw = Math.min(w - 24, 440), ph = 230;
  const p = panel(scene, w / 2, h / 2, pw, ph);
  const left = w / 2 - pw / 2 + 16;
  const lines: [string, string][] = [
    ['JOYSTICK', 'Pose le pouce à gauche et glisse pour patiner.'],
    ['TAPE', 'Tape le gros bouton pour faire une passe.'],
    ['MAINTIENS', 'Garde le doigt puis lâche pour tirer fort.'],
    ['SANS BALLE', 'Tape le bouton près d’un adversaire pour voler la balle.'],
    ['SUPER', 'Quand la jauge est pleine, tape SUPER : pouvoir d’équipe !'],
  ];
  const items: Phaser.GameObjects.GameObject[] = [dim, p, shadowTxt(scene, w / 2, h / 2 - ph / 2 + 18, 'COMMENT JOUER', 16, PAL.accent)];
  lines.forEach(([k, v], i) => {
    const y = h / 2 - ph / 2 + 48 + i * 28;
    items.push(txt(scene, left, y, k, 8, PAL.accent, 0));
    const d = txt(scene, left + 92, y, v, 8, PAL.text, 0);
    d.setWordWrapWidth(pw - 120); d.setAlign('left'); d.setLineSpacing(4);
    items.push(d);
  });
  items.push(button(scene, w / 2, h / 2 + ph / 2 - 20, 170, 22, "C'EST PARTI !", () => { c.destroy(); onClose(); }));
  c.add(items);
  return c;
}
