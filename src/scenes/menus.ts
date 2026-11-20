import Phaser from 'phaser';
import logoUrl from '../assets/logo.png';
import boubouUrl from '../assets/boubou.png';
import { makeTextures } from '../art';
import { TEAMS, PAL, settings, saveSettings, type MatchResult } from '../data';
import { txt, shadowTxt, button, panel, starfield, bars, showHelp } from '../ui';
import { unlockAudio, sfx } from '../sfx';

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.load.image('logo', logoUrl);
    this.load.image('boubou', boubouUrl);
  }
  create() {
    makeTextures(this);
    this.scene.start('Splash');
  }
}

export class Splash extends Phaser.Scene {
  constructor() { super('Splash'); }
  create() {
    const { width: w, height: h } = this.scale;
    this.cameras.main.setBackgroundColor(0x000000);
    const img = this.add.image(w / 2, h / 2 - 22, 'boubou').setDisplaySize(120, 119).setAlpha(0);
    const t = shadowTxt(this, w / 2, h / 2 + 60, 'BOUBOU GAMING', 16, PAL.text).setAlpha(0);
    const s = txt(this, w / 2, h / 2 + 84, 'présente', 8, PAL.dim).setAlpha(0);
    this.tweens.add({ targets: [img, t, s], alpha: 1, duration: 500 });
    this.tweens.add({ targets: img, y: img.y - 4, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' });
    let gone = false;
    const next = () => {
      if (gone) return; gone = true;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Title'));
    };
    this.time.delayedCall(2200, next);
    this.input.once('pointerdown', () => { unlockAudio(); next(); });
  }
}

export class Title extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    const { width: w, height: h } = this.scale;
    starfield(this);
    this.cameras.main.fadeIn(300);
    const logo = this.add.image(w / 2, 70, 'logo').setDisplaySize(156, 104);
    this.tweens.add({ targets: logo, angle: { from: -2, to: 2 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
    shadowTxt(this, w / 2, 138, 'MEGA CROSSE', 24, PAL.accent, '#a3301c');
    txt(this, w / 2, 160, 'FLOORBALL ARCADE', 8, PAL.dim);
    button(this, w / 2, 196, 190, 26, 'ENTRAÎNEMENT', () => this.scene.start('Teams'), { size: 8 });
    const blink = txt(this, w / 2, 222, '1 joueur contre l’ordi', 8, PAL.text);
    this.tweens.add({ targets: blink, alpha: 0.3, yoyo: true, repeat: -1, duration: 700 });
    button(this, w - 24, 22, 28, 24, '⚙', () => this.options(), { fill: PAL.panel2, color: PAL.text, size: 8 });
    button(this, w - 58, 22, 28, 24, '?', () => showHelp(this, () => {}), { fill: PAL.panel2, color: PAL.text, size: 8 });
    txt(this, 10, h - 9, 'proto v0.1', 8, '#5a54c4', 0);
    this.input.once('pointerdown', () => unlockAudio());
  }

  options() {
    const { width: w, height: h } = this.scale;
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(w / 2, h / 2, w, h, 0, 0.6).setInteractive();
    const p = panel(this, w / 2, h / 2, 280, 170);
    const title = shadowTxt(this, w / 2, h / 2 - 62, 'OPTIONS', 16, PAL.accent);
    const lab = () => `SON : ${settings.sound ? 'OUI' : 'NON'}`;
    const lab2 = () => `NIVEAU : ${settings.difficulty === 'facile' ? 'FACILE' : 'NORMAL'}`;
    let b1: Phaser.GameObjects.Container, b2: Phaser.GameObjects.Container;
    const rebuild = () => {
      b1?.destroy(); b2?.destroy();
      b1 = button(this, w / 2, h / 2 - 22, 220, 24, lab(), () => { settings.sound = !settings.sound; saveSettings(); rebuild(); }, { fill: PAL.panel2, color: PAL.text });
      b2 = button(this, w / 2, h / 2 + 12, 220, 24, lab2(), () => { settings.difficulty = settings.difficulty === 'facile' ? 'normal' : 'facile'; saveSettings(); rebuild(); }, { fill: PAL.panel2, color: PAL.text });
      c.add([b1, b2]);
    };
    c.add([dim, p, title]);
    rebuild();
    c.add(button(this, w / 2, h / 2 + 56, 140, 24, 'OK', () => c.destroy()));
  }
}

export class Teams extends Phaser.Scene {
  idx = 0;
  constructor() { super('Teams'); }
  create() {
    const { width: w } = this.scale;
    starfield(this);
    shadowTxt(this, w / 2, 20, 'CHOISIS TON ÉQUIPE', 16, PAL.accent);
    const card = this.add.container(0, 0);
    const draw = () => {
      card.removeAll(true);
      const t = TEAMS[this.idx];
      const cx = w / 2, cy = 132;
      card.add(panel(this, cx, cy, 340, 196, PAL.panel, t.color));
      // portrait : joueur géant + gardien
      const g = this.add.graphics();
      g.fillStyle(t.color, 0.25); g.fillRect(cx - 160, cy - 88, 110, 120);
      card.add(g);
      const pl = this.add.sprite(cx - 112, cy - 4, `p_${t.id}_0`, 0).setScale(4);
      this.tweens.add({ targets: pl, y: pl.y - 3, yoyo: true, repeat: -1, duration: 400 });
      this.time.addEvent({ delay: 220, loop: true, callback: () => pl.active && pl.setFrame(pl.frame.name === '0' ? 1 : 0) });
      card.add(pl);
      card.add(txt(this, cx - 105, cy + 46, t.mascot.split(' ')[0].toUpperCase(), 8, PAL.accent));
      const rx = cx - 40;
      card.add(txt(this, rx, cy - 76, t.name, 8, t.css === '#ffc62e' ? PAL.accent : PAL.text, 0));
      card.add(txt(this, rx, cy - 60, t.city, 8, PAL.dim, 0));
      card.add(txt(this, rx, cy - 44, 'Mascotte :', 8, PAL.dim, 0));
      const m = txt(this, rx, cy - 30, t.mascot, 8, PAL.text, 0);
      card.add(m);
      card.add(bars(this, rx, cy - 10, 'VITESSE', t.stats.v, t.color));
      card.add(bars(this, rx, cy + 4, 'TIR', t.stats.t, t.color));
      card.add(bars(this, rx, cy + 18, 'DÉFENSE', t.stats.d, t.color));
      card.add(txt(this, cx - 160, cy + 64, 'POUVOIR : ' + t.power, 8, PAL.accent, 0));
      const d = txt(this, cx - 160, cy + 82, t.powerDesc, 8, PAL.text, 0);
      d.setWordWrapWidth(320).setAlign('left').setLineSpacing(3).setOrigin(0, 0);
      d.y = cy + 72;
      card.add(d);
      // puces
      TEAMS.forEach((_, i) => {
        const r = this.add.rectangle(cx - 12 + i * 12, cy + 106, 6, 6, i === this.idx ? PAL.accentN : 0x5a54c4);
        card.add(r);
      });
    };
    draw();
    const go = (d: number) => { this.idx = (this.idx + d + TEAMS.length) % TEAMS.length; draw(); };
    button(this, w / 2 - 196, 132, 30, 40, '<', () => go(-1), { fill: PAL.panel2, color: PAL.text, size: 16 });
    button(this, w / 2 + 196, 132, 30, 40, '>', () => go(1), { fill: PAL.panel2, color: PAL.text, size: 16 });
    button(this, 44, 20, 64, 22, 'RETOUR', () => this.scene.start('Title'), { fill: PAL.panel2, color: PAL.text });
    button(this, w / 2, 254, 160, 24, 'CHOISIR', () => {
      const others = TEAMS.map((_, i) => i).filter((i) => i !== this.idx);
      const cpu = Phaser.Utils.Array.GetRandom(others);
      this.scene.start('Match', { player: this.idx, cpu });
    });
    // swipe
    let sx = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { sx = p.x; });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => { if (Math.abs(p.x - sx) > 50 && p.y > 40 && p.y < 235) go(p.x < sx ? 1 : -1); });
    this.input.keyboard?.on('keydown-LEFT', () => go(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => go(1));
  }
}

export class Summary extends Phaser.Scene {
  constructor() { super('Summary'); }
  create(r: MatchResult) {
    const { width: w } = this.scale;
    starfield(this);
    this.cameras.main.fadeIn(300);
    const a = TEAMS[r.setup.player], b = TEAMS[r.setup.cpu];
    const [s0, s1] = r.score;
    const res = s0 > s1 ? 'VICTOIRE !' : s0 < s1 ? 'DÉFAITE...' : 'MATCH NUL';
    const col = s0 > s1 ? PAL.ok : s0 < s1 ? PAL.hot : PAL.accent;
    const big = shadowTxt(this, w / 2, 30, res, 24, col);
    this.tweens.add({ targets: big, scale: { from: 1.4, to: 1 }, duration: 400, ease: 'Back.out' });
    if (s0 > s1) sfx.goal();
    panel(this, w / 2, 116, 330, 116);
    txt(this, w / 2 - 80, 74, a.short, 16, a.css);
    txt(this, w / 2 + 80, 74, b.short, 16, b.css);
    shadowTxt(this, w / 2, 74, `${s0} - ${s1}`, 16, PAL.text);
    const rows: [string, number, number][] = [
      ['TIRS', r.stats.shots[0], r.stats.shots[1]],
      ['PASSES', r.stats.passes[0], r.stats.passes[1]],
      ['ARRÊTS', r.stats.saves[0], r.stats.saves[1]],
    ];
    rows.forEach(([k, x, y], i) => {
      const yy = 108 + i * 22;
      txt(this, w / 2, yy, k, 8, PAL.dim);
      txt(this, w / 2 - 80, yy, String(x), 8, PAL.text);
      txt(this, w / 2 + 80, yy, String(y), 8, PAL.text);
    });
    button(this, w / 2 - 80, 226, 140, 26, 'REJOUER', () => this.scene.start('Match', r.setup));
    button(this, w / 2 + 80, 226, 140, 26, 'MENU', () => this.scene.start('Title'), { fill: PAL.panel2, color: PAL.text });
  }
}
