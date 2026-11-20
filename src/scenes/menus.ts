import Phaser from 'phaser';
import logoUrl from '../assets/logo.png';
import boubouUrl from '../assets/boubou.png';
import { makeTextures } from '../art';
import { makeMascots } from '../mascots';
import { TEAMS, PAL, settings, saveSettings, type MatchResult } from '../data';
import { txt, vt, shadowTxt, button, panel, starfield, showHelp } from '../ui';
import { buzz } from '../haptic';
import { unlockAudio, sfx } from '../sfx';

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.load.image('logo', logoUrl);
    this.load.image('boubou', boubouUrl);
  }
  create() {
    makeTextures(this);
    makeMascots(this);
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
    vt(this, 12, 14, 'v0.2', 16, PAL.dim, 0);

    // logo à gauche : tombe, rebondit, flotte et crache des étincelles
    const lx = Math.round(w * 0.26), ly = 128;
    const logo = this.add.image(lx, -80, 'logo').setDisplaySize(186, 124);
    this.tweens.add({
      targets: logo, y: ly, duration: 900, ease: 'Bounce.out',
      onComplete: () => {
        this.tweens.add({ targets: logo, y: ly - 5, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.inOut' });
        this.tweens.add({ targets: logo, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 1600, ease: 'Sine.inOut' });
      },
    });
    this.time.addEvent({
      delay: 45, loop: true, callback: () => {
        const bx = logo.x - 4 + Phaser.Math.Between(-4, 4), by = logo.y - 9 + Phaser.Math.Between(-4, 4);
        const sp = this.add.image(bx, by, 'px').setTint(Phaser.Utils.Array.GetRandom([0xff5a3c, 0xffc94a, 0xfff2a0, 0xe8423c]));
        this.tweens.add({ targets: sp, x: bx + Phaser.Math.Between(8, 46), y: by - Phaser.Math.Between(10, 44), alpha: 0, scale: 0.4, duration: Phaser.Math.Between(400, 800), onComplete: () => sp.destroy() });
      },
    });

    // titre et modes à droite
    const cx = Math.round(w * 0.69);
    txt(this, cx + 4, 66, 'MEGA CROSSE', 16, '#000000');
    txt(this, cx + 2, 64, 'MEGA CROSSE', 16, '#a8411a');
    const title = txt(this, cx, 62, 'MEGA CROSSE', 16, PAL.accent);
    title.setScale(0); this.tweens.add({ targets: title, scale: 1, duration: 500, delay: 500, ease: 'Back.out' });
    txt(this, cx, 86, 'FLOORBALL ARCADE', 8, PAL.teal);
    txt(this, cx, 98, '3 CONTRE 3', 8, PAL.teal);
    const go = button(this, cx, 134, 196, 34, 'ENTRAÎNEMENT', () => this.scene.start('Teams'), { size: 8 });
    this.tweens.add({ targets: go, scale: 1.04, yoyo: true, repeat: -1, duration: 650, ease: 'Sine.inOut' });
    const locked = (x: number, label: string) => {
      const c = this.add.container(x, 178);
      const g = this.add.graphics();
      g.fillStyle(0x1c1c38, 1); g.fillRect(-46, -15, 92, 30);
      g.lineStyle(2, 0x3d3d6b, 1); g.strokeRect(-46, -15, 92, 30);
      // cadenas
      g.lineStyle(2, 0x8e89b5, 1); g.strokeRect(-36, -3, 8, 7); g.beginPath(); g.arc(-32, -3, 3, Math.PI, 0); g.strokePath();
      c.add([g, vt(this, 6, 0, label, 16, '#8e89b5')]);
      c.setSize(92, 30).setInteractive(new Phaser.Geom.Rectangle(0, 0, 92, 30), Phaser.Geom.Rectangle.Contains);
      c.on('pointerup', () => { sfx.click(); this.tweens.add({ targets: c, x: x + 3, yoyo: true, repeat: 2, duration: 40 }); this.toast('Bientôt !'); });
    };
    locked(cx - 50, '2 JOUEURS');
    locked(cx + 50, 'TOURNOI');
    vt(this, w / 2, h - 12, 'Bientôt : 2 joueurs sur le même téléphone, tournoi', 16, PAL.dim);

    const opt = button(this, w - 22, 20, 26, 26, '', () => this.options(), { fill: PAL.panel2, color: PAL.text, size: 8 });
    const gear = this.add.graphics();
    gear.fillStyle(0xf4f1de, 1); gear.fillCircle(0, 0, 6);
    for (let i = 0; i < 8; i++) { const an = (i * Math.PI) / 4; gear.fillRect(Math.cos(an) * 7 - 1.5, Math.sin(an) * 7 - 1.5, 3, 3); }
    gear.fillStyle(PAL.panel2, 1); gear.fillCircle(0, 0, 2.5);
    opt.add(gear);
    this.input.once('pointerdown', () => unlockAudio());
  }

  toast(s: string) {
    const { width: w, height: h } = this.scale;
    const t = vt(this, w * 0.69, 204, s, 18, PAL.accent).setDepth(50);
    this.tweens.add({ targets: t, y: 196, alpha: 0, delay: 500, duration: 400, onComplete: () => t.destroy() });
    void h;
  }

  options() {
    const { width: w, height: h } = this.scale;
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(w / 2, h / 2, w, h, 0, 0.6).setInteractive();
    const p = panel(this, w / 2, h / 2, 280, 230);
    const title = shadowTxt(this, w / 2, h / 2 - 96, 'OPTIONS', 16, PAL.accent);
    c.add([dim, p, title]);
    const rows: [() => string, () => void][] = [
      [() => `SON : ${settings.sound ? 'OUI' : 'NON'}`, () => { settings.sound = !settings.sound; }],
      [() => `VIBRATIONS : ${settings.vibration ? 'OUI' : 'NON'}`, () => { settings.vibration = !settings.vibration; if (settings.vibration) buzz(40); }],
      [() => `NIVEAU : ${settings.difficulty === 'facile' ? 'FACILE' : 'NORMAL'}`, () => { settings.difficulty = settings.difficulty === 'facile' ? 'normal' : 'facile'; }],
    ];
    let btns: Phaser.GameObjects.Container[] = [];
    const rebuild = () => {
      btns.forEach((b) => b.destroy());
      btns = rows.map(([lab, act], i) => button(this, w / 2, h / 2 - 60 + i * 30, 220, 24, lab(), () => { act(); saveSettings(); rebuild(); }, { fill: PAL.panel2, color: PAL.text }));
      c.add(btns);
    };
    rebuild();
    c.add(button(this, w / 2, h / 2 + 30, 220, 24, 'COMMENT JOUER', () => showHelp(this, () => {}), { fill: PAL.panel2, color: PAL.text }));
    c.add(button(this, w / 2, h / 2 + 76, 140, 24, 'OK', () => c.destroy()));
  }
}

export class Teams extends Phaser.Scene {
  idx = 0;
  constructor() { super('Teams'); }
  create() {
    const { width: w } = this.scale;
    starfield(this);
    txt(this, w / 2, 20, 'CHOISIS TON ÉQUIPE', 8, PAL.text);
    const card = this.add.container(0, 0);
    const lx = Math.round(w * 0.29), rx = Math.round(w * 0.69);
    const draw = () => {
      card.removeAll(true);
      const t = TEAMS[this.idx];
      // carte de gauche : mascotte
      card.add(panel(this, lx, 128, 170, 160, PAL.panel, 0xf4f1de));
      const g = this.add.graphics();
      g.fillStyle(0x000000, 1); g.fillRect(lx - 38, 58, 76, 76);
      g.fillStyle(t.color, 1); g.fillRect(lx - 36, 60, 72, 72);
      g.fillStyle(0x000000, 0.25); g.fillRect(lx - 36, 126, 72, 6); g.fillRect(lx + 30, 60, 6, 72);
      card.add(g);
      const m = this.add.image(lx - 2, 94, `m_${t.id}`).setScale(2.6);
      this.tweens.add({ targets: m, y: 91, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.inOut' });
      card.add(m);
      card.add(vt(this, lx, 148, t.mascot, 18, PAL.dim));
      card.add(txt(this, lx, 166, t.name, 8, PAL.text));
      card.add(vt(this, lx, 184, t.city, 18, PAL.teal));
      // stats
      card.add(panel(this, rx, 84, 210, 64, PAL.panel, 0xf4f1de));
      ([['VITESSE', t.stats.v], ['TIR', t.stats.t], ['DÉFENSE', t.stats.d]] as [string, number][]).forEach(([lab, n], i) => {
        const y = 66 + i * 18;
        card.add(vt(this, rx - 94, y, lab, 18, PAL.text, 0));
        const sg = this.add.graphics();
        for (let k = 0; k < 5; k++) {
          sg.fillStyle(0x000000, 1); sg.fillRect(rx - 22 + k * 22, y - 5, 20, 10);
          sg.fillStyle(k < n ? PAL.tealN : PAL.bg, 1); sg.fillRect(rx - 21 + k * 22, y - 4, 18, 8);
        }
        card.add(sg);
      });
      // pouvoir
      card.add(panel(this, rx, 167, 210, 86, 0x2e2a1a, PAL.accentN));
      const ic = this.add.image(rx - 82, 167, `m_${t.id}`).setScale(1.4);
      card.add(ic);
      card.add(txt(this, rx - 60, 134, 'POUVOIR', 8, PAL.accent, 0));
      card.add(txt(this, rx - 60, 146, t.power, 8, PAL.accent, 0));
      const d = vt(this, rx - 60, 154, t.powerDesc, 15, PAL.text, 0).setOrigin(0, 0);
      d.setWordWrapWidth(150).setAlign('left');
      card.add(d);
      TEAMS.forEach((_, i) => card.add(this.add.rectangle(w - 54 + i * 14, 20, 8, 8, i === this.idx ? PAL.accentN : 0x3d3d6b)));
    };
    draw();
    const go = (d: number) => { this.idx = (this.idx + d + TEAMS.length) % TEAMS.length; draw(); };
    button(this, 22, 128, 24, 40, '<', () => go(-1), { fill: PAL.panel, color: PAL.text, size: 8 });
    button(this, w - 22, 128, 24, 40, '>', () => go(1), { fill: PAL.panel, color: PAL.text, size: 8 });
    button(this, 22, 20, 26, 26, '<', () => this.scene.start('Title'), { fill: PAL.panel, color: PAL.text, size: 8 });
    button(this, w / 2, 240, 170, 28, 'CHOISIR', () => {
      const others = TEAMS.map((_, i) => i).filter((i) => i !== this.idx);
      const cpu = Phaser.Utils.Array.GetRandom(others);
      this.scene.start('Match', { player: this.idx, cpu });
    });
    let sx = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { sx = p.x; });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => { if (Math.abs(p.x - sx) > 50 && p.y > 40 && p.y < 220) go(p.x < sx ? 1 : -1); });
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
