import Phaser from 'phaser';
import { PAL, settings, saveSettings } from '../data';
import { txt, shadowTxt, button, panel, showHelp, caps } from '../ui';
import { unlockAudio } from '../sfx';
import { Match, RW, RH, GX, CY } from './match';

let current: Match | null = null;

export class Hud extends Phaser.Scene {
  m!: Match;
  g!: Phaser.GameObjects.Graphics;
  scoreT!: Phaser.GameObjects.Text;
  clockT!: Phaser.GameObjects.Text;
  btnT!: Phaser.GameObjects.Text;
  superT!: Phaser.GameObjects.Text;
  joyId = -1; joyX = 0; joyY = 0; knobX = 0; knobY = 0;
  btnId = -1;
  paused: Phaser.GameObjects.Container | null = null;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  bannerT: Phaser.GameObjects.Text | null = null;

  constructor() { super('Hud'); }

  init(data: { match?: Match }) {
    if (data?.match) current = data.match;
    this.m = current!;
    this.joyId = -1; this.btnId = -1; this.paused = null;
  }

  get btn() { const { width: w, height: h } = this.scale; return { x: w - 58, y: h - 56, r: 36 }; }
  get sup() { const { width: w, height: h } = this.scale; return { x: w - 132, y: h - 34, r: 21 }; }
  get pauseB() { const { width: w } = this.scale; return { x: w - 20, y: 18, r: 14 }; }

  create() {
    const m = this.m;
    const { width: w } = this.scale;
    this.g = this.add.graphics();
    this.scoreT = shadowTxt(this, w / 2, 12, '', 8, PAL.text);
    this.clockT = txt(this, w / 2, 27, '2:00', 8, PAL.accent);
    this.btnT = txt(this, 0, 0, 'PASSE\nTIR', 8, '#120f2a');
    this.superT = txt(this, 0, 0, 'SUPER', 8, PAL.text);
    this.input.addPointer(3);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,J,K,SHIFT,P,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-SPACE', () => this.press()); kb.on('keydown-J', () => this.press());
    kb.on('keyup-SPACE', () => this.release()); kb.on('keyup-J', () => this.release());
    kb.on('keydown-K', () => { m.inp.superTap = true; }); kb.on('keydown-SHIFT', () => { m.inp.superTap = true; });
    kb.on('keydown-P', () => this.togglePause()); kb.on('keydown-ESC', () => this.togglePause());

    m.events2.removeAllListeners();
    m.events2.on('banner', (s: string, c: string, d: number) => this.banner(s, c, d));
    m.events2.on('goal', (scorer: number) => this.goal(scorer));
    m.events2.on('save', () => this.banner('ARRÊT !', PAL.text, 600, 16));

    if (m.state === 'intro') {
      if (!settings.seenHelp) showHelp(this, () => { settings.seenHelp = true; saveSettings(); m.begin(); });
      else m.begin();
    }
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
  }

  onResize() {
    const { width: w } = this.scale;
    this.scoreT.x = w / 2; this.clockT.x = w / 2;
  }

  // ------------------------------------------------------------ entrées
  press() {
    const m = this.m;
    if (m.inp.down) return;
    m.inp.down = true; m.inp.downAt = this.time.now; m.inp.pressed = true;
  }
  release() {
    const m = this.m;
    if (!m.inp.down) return;
    m.inp.down = false; m.inp.released = true; m.inp.releasedHold = (this.time.now - m.inp.downAt) / 1000;
  }

  down(p: Phaser.Input.Pointer) {
    unlockAudio();
    if (this.paused) return;
    const { width: w } = this.scale;
    const near = (o: { x: number; y: number; r: number }, extra = 10) => Math.hypot(p.x - o.x, p.y - o.y) < o.r + extra;
    if (near(this.pauseB, 8)) { this.togglePause(); return; }
    if (near(this.sup, 8) && this.m.gauge[0] >= 1) { this.m.inp.superTap = true; return; }
    if (p.x > w * 0.5 && this.btnId < 0) { this.btnId = p.id; this.press(); return; }
    if (p.x <= w * 0.5 && this.joyId < 0 && p.y > 40) {
      this.joyId = p.id; this.joyX = p.x; this.joyY = p.y; this.knobX = p.x; this.knobY = p.y;
    }
  }
  move(p: Phaser.Input.Pointer) {
    if (p.id !== this.joyId) return;
    const dx = p.x - this.joyX, dy = p.y - this.joyY, d = Math.hypot(dx, dy), R = 30;
    if (d > R * 1.6) { this.joyX += (dx / d) * (d - R * 1.6); this.joyY += (dy / d) * (d - R * 1.6); } // la base suit le pouce
    const d2 = Math.min(R, Math.hypot(p.x - this.joyX, p.y - this.joyY));
    const a = Math.atan2(p.y - this.joyY, p.x - this.joyX);
    this.knobX = this.joyX + Math.cos(a) * d2; this.knobY = this.joyY + Math.sin(a) * d2;
  }
  up(p: Phaser.Input.Pointer) {
    if (p.id === this.joyId) this.joyId = -1;
    if (p.id === this.btnId) { this.btnId = -1; this.release(); }
  }

  togglePause() {
    const { width: w, height: h } = this.scale;
    if (this.paused) { this.paused.destroy(); this.paused = null; this.scene.resume('Match'); return; }
    if (this.m.state === 'end') return;
    this.scene.pause('Match');
    this.joyId = -1; if (this.btnId >= 0) { this.btnId = -1; this.m.inp.down = false; }
    const c = this.add.container(0, 0).setDepth(500);
    c.add(this.add.rectangle(w / 2, h / 2, w, h, 0, 0.6).setInteractive());
    c.add(panel(this, w / 2, h / 2, 240, 150));
    c.add(shadowTxt(this, w / 2, h / 2 - 50, 'PAUSE', 16, PAL.accent));
    c.add(button(this, w / 2, h / 2 - 14, 180, 24, 'REPRENDRE', () => this.togglePause()));
    c.add(button(this, w / 2, h / 2 + 16, 180, 24, 'COMMENT JOUER', () => showHelp(this, () => {}), { fill: PAL.panel2, color: PAL.text }));
    c.add(button(this, w / 2, h / 2 + 46, 180, 24, 'QUITTER', () => {
      this.scene.stop('Match'); this.scene.start('Title');
    }, { fill: PAL.panel2, color: PAL.text }));
    this.paused = c;
  }

  // ------------------------------------------------------------ annonces
  banner(s: string, color: string, dur = 900, size = 24) {
    const { width: w, height: h } = this.scale;
    this.bannerT?.destroy();
    const t = shadowTxt(this, w / 2, h / 2 - 20, s, size, color).setDepth(300);
    this.bannerT = t;
    this.tweens.add({ targets: t, scale: { from: 1.6, to: 1 }, duration: 250, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: dur, duration: 250, onComplete: () => t.destroy() });
  }

  goal(scorer: number) {
    const { width: w, height: h } = this.scale;
    const team = this.m.teams[scorer];
    const c = this.add.container(0, 0).setDepth(400);
    const band = this.add.rectangle(w / 2, h / 2 - 10, w, 64, 0x120f2a, 0.85);
    const big = shadowTxt(this, w / 2, h / 2 - 18, 'BUT !', 32, PAL.accent, '#a3301c');
    const sub = txt(this, w / 2, h / 2 + 12, team.name, 8, team.css === '#1b1a22' ? PAL.text : team.css);
    c.add([band, big, sub]);
    // confettis
    for (let i = 0; i < 40; i++) {
      const r = this.add.rectangle(w / 2, h / 2 - 10, 3, 3, Phaser.Utils.Array.GetRandom([team.color, 0xffb52e, 0xf4f1ff, 0xff5a3c]));
      c.add(r);
      this.tweens.add({ targets: r, x: w / 2 + Phaser.Math.Between(-w / 2, w / 2), y: h / 2 + Phaser.Math.Between(-120, 120), angle: 360, alpha: 0, duration: Phaser.Math.Between(700, 1400), ease: 'Cubic.out' });
    }
    this.tweens.add({ targets: big, scale: { from: 2.2, to: 1 }, duration: 350, ease: 'Back.out' });
    this.tweens.add({ targets: big, angle: { from: -4, to: 4 }, yoyo: true, repeat: 4, duration: 120 });
    this.time.delayedCall(2100, () => c.destroy());
  }

  // ------------------------------------------------------------ boucle
  update() {
    const m = this.m; const { width: w, height: h } = this.scale;
    // clavier
    if (this.joyId < 0) {
      const k = this.keys;
      const x = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
      const y = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
      m.inp.mx = x; m.inp.my = y;
    } else {
      const dx = this.knobX - this.joyX, dy = this.knobY - this.joyY, d = Math.hypot(dx, dy);
      const mag = d < 5 ? 0 : Math.min(1, d / 30);
      m.inp.mx = d ? (dx / d) * mag : 0; m.inp.my = d ? (dy / d) * mag : 0;
    }

    const a = m.teams[0], b = m.teams[1];
    this.scoreT.setText(`${a.short} ${m.score[0]} - ${m.score[1]} ${b.short}`);
    const s = Math.ceil(m.clock);
    this.clockT.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
    this.clockT.setColor(m.clock < 15 ? PAL.hot : PAL.accent);

    const g = this.g; g.clear();
    // bandeau du score
    g.fillStyle(0x120f2a, 0.75); g.fillRect(w / 2 - 92, 2, 184, 33);
    g.fillStyle(a.color, 1); g.fillRect(w / 2 - 92, 2, 6, 33);
    g.fillStyle(b.color, 1); g.fillRect(w / 2 + 86, 2, 6, 33);

    // mini-carte
    const mw = 72, mh = 36, mx0 = 8, my0 = 6;
    g.fillStyle(0x2f6fb0, 0.85); g.fillRect(mx0, my0, mw, mh);
    g.lineStyle(1, 0xf4f1ff, 0.8); g.strokeRect(mx0, my0, mw, mh); g.lineBetween(mx0 + mw / 2, my0, mx0 + mw / 2, my0 + mh);
    g.fillStyle(0xe8423c, 1);
    [0, 1].forEach((t) => g.fillRect(mx0 + (GX[t] / RW) * mw - 1, my0 + ((CY + m.goalOff[t]) / RH) * mh - 3, 2, 6));
    for (const p of m.players) {
      g.fillStyle(m.teams[p.team].color, 1);
      const px = mx0 + (p.x / RW) * mw, py = my0 + (p.y / RH) * mh;
      g.fillRect(px - 1, py - 1, 3, 3);
      if (p === m.ctrl) { g.lineStyle(1, 0xffb52e, 1); g.strokeRect(px - 2, py - 2, 5, 5); }
    }
    g.fillStyle(0xffffff, 1); g.fillRect(mx0 + (m.ball.x / RW) * mw - 1, my0 + (m.ball.y / RH) * mh - 1, 2, 2);

    // pause
    const pb = this.pauseB;
    g.fillStyle(0x120f2a, 0.7); g.fillCircle(pb.x, pb.y, pb.r);
    g.fillStyle(0xf4f1ff, 1); g.fillRect(pb.x - 4, pb.y - 5, 3, 10); g.fillRect(pb.x + 1, pb.y - 5, 3, 10);

    // joystick
    if (this.joyId >= 0) {
      g.fillStyle(0xffffff, 0.12); g.fillCircle(this.joyX, this.joyY, 30);
      g.lineStyle(2, 0xffffff, 0.4); g.strokeCircle(this.joyX, this.joyY, 30);
      g.fillStyle(0xffb52e, 0.9); g.fillCircle(this.knobX, this.knobY, 13);
      g.lineStyle(2, 0x120f2a, 1); g.strokeCircle(this.knobX, this.knobY, 13);
    } else {
      g.lineStyle(2, 0xffffff, 0.15); g.strokeCircle(64, h - 60, 30);
      g.fillStyle(0xffffff, 0.12); g.fillCircle(64, h - 60, 12);
    }

    // gros bouton passe / tir
    const bt = this.btn;
    const has = m.ball.owner === m.ctrl;
    const holding = m.inp.down;
    const charge = holding && has ? Phaser.Math.Clamp(((this.time.now - m.inp.downAt) / 1000 - 0.22) / 0.7, 0, 1) : 0;
    g.fillStyle(0x000000, 0.4); g.fillCircle(bt.x, bt.y + 3, bt.r);
    g.fillStyle(has ? 0xffb52e : 0x8fd3ff, holding ? 0.75 : 0.92); g.fillCircle(bt.x, bt.y + (holding ? 2 : 0), bt.r);
    g.lineStyle(2, 0x120f2a, 1); g.strokeCircle(bt.x, bt.y + (holding ? 2 : 0), bt.r);
    if (charge > 0) {
      g.lineStyle(5, charge >= 1 ? 0xff5a3c : 0xf4f1ff, 1);
      g.beginPath(); g.arc(bt.x, bt.y + 2, bt.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge); g.strokePath();
    }
    this.btnT.setText(caps(has ? (charge > 0 ? 'TIR !' : 'PASSE\nTIR') : 'VOLER'));
    this.btnT.setPosition(bt.x, bt.y + (holding ? 2 : 0));

    // jauge Super
    const sp = this.sup; const full = m.gauge[0] >= 1;
    const pulse = full ? 1 + Math.sin(this.time.now / 110) * 0.08 : 1;
    g.fillStyle(0x120f2a, 0.8); g.fillCircle(sp.x, sp.y, sp.r * pulse);
    g.lineStyle(4, 0x3a3470, 1); g.strokeCircle(sp.x, sp.y, sp.r * pulse);
    g.lineStyle(4, full ? 0xff5a3c : a.color, 1);
    g.beginPath(); g.arc(sp.x, sp.y, sp.r * pulse, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * m.gauge[0]); g.strokePath();
    if (full) { g.fillStyle(0xff5a3c, 0.35); g.fillCircle(sp.x, sp.y, sp.r * pulse - 3); }
    this.superT.setPosition(sp.x, sp.y).setColor(full ? PAL.accent : PAL.dim);
    if (m.homing[0]) this.superT.setText('PRET').setColor(PAL.hot);
    else this.superT.setText('SUPER');
  }
}
