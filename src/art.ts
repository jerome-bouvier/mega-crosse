import Phaser from 'phaser';
import { TEAMS } from './data';

const W = 18, H = 22;
const OUTLINE = '#120f2a';
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

type Grid = (string | null)[][];

function playerGrid(frame: number, jersey: string, trim: string, goalie: boolean, hair: string, skin: string): Grid {
  const g: Grid = Array.from({ length: H }, () => Array(W).fill(null));
  const set = (x: number, y: number, c: string) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  const rect = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c);
  };
  const shorts = '#22203a', shoe = '#f4f1ff', stick = '#d9d6ea';
  if (goalie) {
    rect(5, 1, 10, 6, '#f4f1ff');               // casque
    for (let y = 3; y <= 6; y++) { set(9, y, '#6b6790'); set(10, y, y % 2 ? '#6b6790' : '#f4f1ff'); }
    set(8, 4, '#120f2a');
    rect(3, 7, 12, 13, jersey); rect(3, 9, 12, 9, trim);
    rect(1, 8, 2, 10, jersey); rect(13, 8, 14, 10, jersey);
    rect(0, 10, 1, 11, '#f4f1ff'); rect(14, 10, 15, 11, '#f4f1ff'); // gants
    rect(3, 14, 12, 15, shorts);
    const s = frame ? 1 : 0;
    rect(3 - s, 16, 6 - s, 19, '#e9e6f6'); rect(9 + s, 16, 12 + s, 19, '#e9e6f6'); // jambières
    rect(3 - s, 20, 6 - s, 20, '#6b6790'); rect(9 + s, 20, 12 + s, 20, '#6b6790');
  } else {
    rect(6, 1, 9, 2, hair); set(5, 3, hair);
    rect(6, 3, 10, 6, skin); set(9, 4, '#120f2a');
    rect(5, 7, 11, 12, jersey); rect(5, 9, 11, 9, trim);
    rect(4, 8, 4, 10, jersey); rect(12, 8, 12, 10, jersey);
    set(4, 11, skin); set(12, 11, skin);
    rect(5, 13, 11, 14, shorts);
    if (frame === 0) {
      rect(6, 15, 7, 18, trim); rect(9, 15, 10, 18, trim);
      rect(6, 19, 7, 19, shoe); rect(9, 19, 10, 19, shoe);
    } else {
      rect(5, 15, 6, 17, trim); rect(10, 15, 11, 17, trim);
      rect(4, 18, 6, 18, shoe); rect(10, 18, 12, 18, shoe);
    }
    // crosse
    [[13, 12], [13, 13], [14, 14], [14, 15], [14, 16], [15, 17], [15, 18]].forEach(([x, y]) => set(x, y, stick));
    rect(14, 19, 16, 19, '#f4f1ff'); set(16, 18, '#f4f1ff');
  }
  // contour
  const out: [number, number][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x]) continue;
    if ((g[y - 1]?.[x]) || (g[y + 1]?.[x]) || g[y][x - 1] || g[y][x + 1]) out.push([x, y]);
  }
  out.forEach(([x, y]) => (g[y][x] = OUTLINE));
  return g;
}

function paint(ctx: CanvasRenderingContext2D, grid: Grid, ox: number) {
  grid.forEach((row, y) => row.forEach((c, x) => { if (c) { ctx.fillStyle = c; ctx.fillRect(ox + x, y, 1, 1); } }));
}

const LOOKS = [
  { hair: '#5a3418', skin: '#f2c49b' }, { hair: '#e8c25a', skin: '#f6d2b0' }, { hair: '#1b1410', skin: '#b97a50' },
];

export function makeTextures(scene: Phaser.Scene) {
  TEAMS.forEach((t) => {
    for (let i = 0; i < 4; i++) {
      const goalie = i === 3;
      const key = `p_${t.id}_${i}`;
      const tex = scene.textures.createCanvas(key, W * 2, H)!;
      const ctx = tex.getContext();
      const look = LOOKS[i % 3];
      for (let f = 0; f < 2; f++) paint(ctx, playerGrid(f, hex(t.color), hex(t.trim), goalie, look.hair, look.skin), f * W);
      tex.add(0, 0, 0, 0, W, H); tex.add(1, 0, W, 0, W, H);
      tex.refresh();
    }
  });
  // balle (trouée, comme une vraie balle de floorball)
  const b = scene.textures.createCanvas('ball', 6, 6)!;
  const bc = b.getContext();
  const bp = ['.oooo.', 'owwwwo', 'owgwwo', 'owwwgo', 'owwwwo', '.oooo.'];
  bp.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.') return;
    bc.fillStyle = ch === 'o' ? OUTLINE : ch === 'g' ? '#8a86b0' : '#ffffff'; bc.fillRect(x, y, 1, 1);
  }));
  b.refresh();
  // ombre
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x000000, 0.35); g.fillEllipse(7, 3, 14, 5); g.generateTexture('shadow', 14, 6);
  g.clear(); g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 2, 2); g.generateTexture('px', 2, 2);
  g.destroy();
}
