import Phaser from 'phaser';
import { TEAMS, settings, statMult, type Team, type MatchSetup, type MatchStats } from '../data';
import { sfx } from '../sfx';
import { FONT } from '../ui';

// --- Terrain (unités "sol" ; 20 unités = 1 m) -------------------------------
export const TILT = 0.72;           // écrasement vertical = vue inclinée
export const RW = 800, RH = 400, CY = 200;
export const GX = [70, 730];        // ligne de but de chaque camp (équipe 0 défend à gauche)
export const GH = 30;               // demi-largeur du but (un peu plus large que le vrai, c'est de l'arcade)
const GD = 22;                      // profondeur du but
export const MATCH_TIME = 120;
const sy = (y: number) => y * TILT;

export type Side = 0 | 1;

export interface Ctrl {
  mx: number; my: number;            // joystick, -1..1
  down: boolean; downAt: number;     // bouton maintenu
  pressed: boolean; released: boolean; releasedHold: number;
  superTap: boolean;
}

export interface P {
  team: Side; goalie: boolean; i: number;
  x: number; y: number; vx: number; vy: number; dx: number; dy: number;
  fx: number; fy: number;
  spr: Phaser.GameObjects.Sprite; sh: Phaser.GameObjects.Image;
  pickupCd: number; immune: number; stun: number; tackleCd: number; anim: number; holdT: number; aiT: number;
}

interface Ball {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  owner: P | null; last: P | null; passTo: P | null;
  kind: 'normal' | 'super' | 'homing'; isShot: boolean; checked: Set<P>;
  spr: Phaser.GameObjects.Image; sh: Phaser.GameObjects.Image;
}

type State = 'intro' | 'kickoff' | 'play' | 'goal' | 'end';

export class Match extends Phaser.Scene {
  setup!: MatchSetup;
  teams!: [Team, Team];
  players: P[] = [];
  ball!: Ball;
  score: [number, number] = [0, 0];
  clock = MATCH_TIME;
  state: State = 'intro';
  stateT = 0;
  ctrl: P | null = null;
  gauge: [number, number] = [0, 0];
  turbo: [number, number] = [0, 0];
  moveGoal: [number, number] = [0, 0];
  goalOff: [number, number] = [0, 0];
  homing: [boolean, boolean] = [false, false];
  stats!: MatchStats;
  inp: Ctrl = { mx: 0, my: 0, down: false, downAt: 0, pressed: false, released: false, releasedHold: 0, superTap: false };
  pressWithBall = false;
  t = 0;
  trailT = 0;
  goalGfx: Phaser.GameObjects.Container[] = [];
  marker!: Phaser.GameObjects.Graphics;
  camTarget = { x: 400, y: 144 };
  events2 = new Phaser.Events.EventEmitter();   // vers le HUD
  cpuPowerDelay = 0;

  constructor() { super('Match'); }

  init(data: MatchSetup) {
    this.setup = { player: data.player ?? 0, cpu: data.cpu ?? 1 };
    this.teams = [TEAMS[this.setup.player], TEAMS[this.setup.cpu]];
    this.players = []; this.score = [0, 0]; this.clock = MATCH_TIME; this.state = 'intro';
    this.gauge = [0, 0]; this.turbo = [0, 0]; this.moveGoal = [0, 0]; this.goalOff = [0, 0]; this.homing = [false, false];
    this.stats = { shots: [0, 0], passes: [0, 0], saves: [0, 0] };
    this.ctrl = null; this.t = 0; this.goalGfx = [];
    this.events2 = new Phaser.Events.EventEmitter();
    this.cpuPowerDelay = 3;
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0a0820);
    this.drawRink();
    this.goalGfx = [this.drawGoal(0), this.drawGoal(1)];
    ([0, 1] as Side[]).forEach((team) => {
      for (let i = 0; i < 4; i++) {
        const spr = this.add.sprite(0, 0, `p_${this.teams[team].id}_${i}`, 0).setOrigin(0.5, 0.95);
        const sh = this.add.image(0, 0, 'shadow').setDepth(-5);
        this.players.push({
          team, goalie: i === 3, i, x: 0, y: 0, vx: 0, vy: 0, dx: 0, dy: 0, fx: team === 0 ? 1 : -1, fy: 0,
          spr, sh, pickupCd: 0, immune: 0, stun: 0, tackleCd: 0, anim: 0, holdT: 0, aiT: 0,
        });
      }
    });
    this.ball = {
      x: 400, y: CY, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, passTo: null, kind: 'normal', isShot: false,
      checked: new Set(), spr: this.add.image(400, sy(CY), 'ball'), sh: this.add.image(400, sy(CY), 'shadow').setScale(0.5).setDepth(-4),
    };
    this.marker = this.add.graphics().setDepth(9000);
    const cam = this.cameras.main;
    cam.setBounds(-70, -80, RW + 140, sy(RH) + 130);
    cam.setZoom(1.3);
    cam.startFollow(this.camTarget, true, 0.08, 0.08);
    this.placeKickoff(0);
    this.render();
    this.scene.launch('Hud', { match: this });
    this.events.once('shutdown', () => this.scene.stop('Hud'));
  }

  /** appelé par le HUD une fois l'aide fermée */
  begin() { this.kickoff(0); }

  // ---------------------------------------------------------------- dessin
  drawRink() {
    const g = this.add.graphics().setDepth(-100);
    const H = sy(RH);
    // tribunes
    for (let y = -78; y < -18; y += 4) for (let x = -70; x < RW + 70; x += 4) {
      if (Math.random() < 0.55) {
        const c = Phaser.Utils.Array.GetRandom([0x3a3470, 0x2b2766, this.teams[0].color, this.teams[1].color, 0xf4f1ff, 0x5a54c4]);
        g.fillStyle(c, Math.random() * 0.5 + 0.35); g.fillRect(x + (y % 8 ? 2 : 0), y, 2, 2);
      }
    }
    // sol
    g.fillStyle(0x2f6fb0, 1); g.fillRect(0, 0, RW, H);
    for (let x = 0; x < RW; x += 80) { g.fillStyle(0x3478bb, 1); g.fillRect(x, 0, 40, H); }
    // lignes
    g.lineStyle(2, 0xf4f1ff, 0.85);
    g.lineBetween(400, 0, 400, H);
    g.strokeEllipse(400, sy(CY), 110, 110 * TILT);
    g.fillStyle(0xf4f1ff, 0.9); g.fillRect(398, sy(CY) - 1, 4, 3);
    [0, 1].forEach((t) => {
      const gx = GX[t], s = t === 0 ? 1 : -1;
      // zone de réparation
      const x0 = t === 0 ? gx - 25 : gx - 75, w = 100;
      g.lineStyle(2, 0xf4f1ff, 0.75); g.strokeRect(x0, sy(CY - 78), w, sy(156));
      // zone du gardien
      g.fillStyle(0xf4f1ff, 0.12); g.fillRect(t === 0 ? gx - 5 : gx - 20, sy(CY - 40), 25, sy(80));
      g.lineStyle(1, 0xf4f1ff, 0.7); g.strokeRect(t === 0 ? gx - 5 : gx - 20, sy(CY - 40), 25, sy(80));
      // points d'engagement
      [[gx + s * 60, 70], [gx + s * 60, 330]].forEach(([x, y]) => { g.fillStyle(0xf4f1ff, 0.8); g.fillRect(x - 3, sy(y), 7, 1); g.fillRect(x, sy(y) - 2, 1, 5); });
    });
    // bandes
    g.fillStyle(0xe9e6f6, 1); g.fillRect(-6, -16, RW + 12, 16);
    g.fillStyle(0xc9c4e6, 1); g.fillRect(-6, -4, RW + 12, 4);
    g.fillStyle(0x120f2a, 1); g.fillRect(-6, -17, RW + 12, 1);
    g.fillStyle(0xe9e6f6, 1); g.fillRect(-8, -16, 8, H + 16); g.fillRect(RW, -16, 8, H + 16);
    g.fillStyle(0x120f2a, 0.6); g.fillRect(-9, -16, 1, H + 16); g.fillRect(RW + 8, -16, 1, H + 16);
    // pubs sur la bande du fond
    const ads = ['MEGA CROSSE', 'BOUBOU GAMING', this.teams[0].name, this.teams[1].name];
    for (let i = 0; i < 6; i++) {
      this.add.text(70 + i * 130, -10, ads[i % ads.length], { fontFamily: FONT, fontSize: '8px', color: i % 2 ? '#5a54c4' : '#e8423c' })
        .setOrigin(0.5).setDepth(-99).setScale(0.75);
    }
    // bande avant (devant les joueurs)
    const f = this.add.graphics().setDepth(5000);
    f.fillStyle(0xe9e6f6, 0.92); f.fillRect(-8, H, RW + 16, 9);
    f.fillStyle(0x120f2a, 1); f.fillRect(-8, H + 9, RW + 16, 1);
    f.fillStyle(this.teams[0].color, 1); f.fillRect(-8, H + 3, RW / 2 + 8, 2);
    f.fillStyle(this.teams[1].color, 1); f.fillRect(RW / 2, H + 3, RW / 2 + 8, 2);
  }

  drawGoal(t: Side) {
    const c = this.add.container(GX[t], sy(CY));
    const g = this.add.graphics();
    const T = GH * TILT, Hh = 20, Hb = 11;
    const net = (pts: number[], a: number) => { g.fillStyle(0xffffff, a); g.fillPoints(pts.reduce<Phaser.Math.Vector2[]>((acc, v, i) => (i % 2 ? acc : [...acc, new Phaser.Math.Vector2(v, pts[i + 1])]), []), true); };
    net([0, -T - Hh, -GD, -T - Hb, -GD, T - Hb, 0, T - Hh], 0.16); // toit
    net([-GD, -T, -GD, -T - Hb, -GD, T - Hb, -GD, T], 0.22);       // fond
    net([0, -T, 0, -T - Hh, -GD, -T - Hb, -GD, -T], 0.22);         // côté loin
    g.lineStyle(1, 0xffffff, 0.35);
    for (let k = 1; k < 5; k++) { const yy = -T + (2 * T * k) / 5; g.lineBetween(-GD, yy, -GD, yy - Hb); g.lineBetween(0, yy - Hh, -GD, yy - Hb); }
    net([0, T, 0, T - Hh, -GD, T - Hb, -GD, T], 0.28);            // côté proche
    g.lineStyle(2, 0xe8423c, 1);
    g.lineBetween(0, -T, 0, -T - Hh); g.lineBetween(0, T, 0, T - Hh); g.lineBetween(0, -T - Hh, 0, T - Hh);
    g.lineStyle(1, 0xffffff, 0.6); g.lineBetween(-GD, -T, -GD, T); g.lineBetween(0, -T, -GD, -T); g.lineBetween(0, T, -GD, T);
    c.add(g);
    if (t === 1) c.setScale(-1, 1);
    c.setDepth(sy(CY) - 2);
    return c;
  }

  // ---------------------------------------------------------------- phases
  placeKickoff(team: Side) {
    const pos: Record<Side, [number, number][]> = {
      0: [[team === 0 ? 388 : 330, CY], [300, 110], [300, 290], [GX[0] + 8, CY]],
      1: [[team === 1 ? 412 : 470, CY], [500, 110], [500, 290], [GX[1] - 8, CY]],
    };
    this.players.forEach((p) => {
      const [x, y] = pos[p.team][p.i];
      p.x = x; p.y = y; p.vx = p.vy = 0; p.fx = p.team === 0 ? 1 : -1; p.fy = 0; p.stun = 0; p.pickupCd = 0; p.immune = 0.8;
    });
    const b = this.ball;
    b.vx = b.vy = b.vz = b.z = 0; b.kind = 'normal'; b.passTo = null; b.isShot = false; b.checked.clear();
    this.gain(this.players.find((p) => p.team === team && p.i === 0)!, true);
    this.ctrl = this.players.find((p) => p.team === 0 && p.i === 0)!;
    if (team === 0) this.ctrl = b.owner;
    this.camTarget.x = 400; this.camTarget.y = sy(CY);
  }

  kickoff(team: Side) {
    this.placeKickoff(team);
    this.state = 'kickoff'; this.stateT = 1.4;
    this.events2.emit('banner', 'PRÊTS ?', '#f4f1ff', 900);
  }

  onGoal(scorer: Side) {
    this.state = 'goal'; this.stateT = 2.6;
    this.score[scorer]++;
    this.gauge[1 - scorer as Side] = Math.min(1, this.gauge[1 - scorer as Side] + 0.15);
    sfx.goal();
    this.cameras.main.shake(350, 0.012);
    this.events2.emit('goal', scorer);
  }

  endMatch() {
    this.state = 'end'; this.stateT = 2;
    sfx.whistle();
    this.events2.emit('banner', 'FIN DU MATCH', '#ffb52e', 1800);
  }

  // ---------------------------------------------------------------- boucle
  update(_t: number, deltaMs: number) {
    let dt = Math.min(deltaMs / 1000, 1 / 30);
    const real = dt;
    if (this.state === 'intro') { this.render(); return; }
    if (this.state === 'kickoff') {
      this.stateT -= dt;
      if (this.stateT <= 0) { this.state = 'play'; sfx.whistle(); this.events2.emit('banner', 'PARTEZ !', '#ffb52e', 600); }
      this.clearInput(); this.render(); return;
    }
    if (this.state === 'goal') {
      if (this.stateT > 1.8) dt *= 0.35;
      this.stateT -= real;
      if (this.stateT <= 0) {
        if (this.clock <= 0) this.endMatch();
        else {
          const conceded: Side = this.ball.last && this.ball.x < 400 ? 0 : 1;
          this.kickoff(conceded);
        }
        return;
      }
    }
    if (this.state === 'end') {
      this.stateT -= real;
      this.players.forEach((p) => { p.dx = p.dy = 0; });
      this.integrate(dt); this.render();
      if (this.stateT <= 0) {
        this.state = 'intro';
        this.scene.stop('Hud');
        this.scene.start('Summary', { setup: this.setup, score: this.score, stats: this.stats });
      }
      return;
    }
    if (this.state === 'play') {
      this.clock -= dt;
      if (this.clock <= 0) { this.clock = 0; this.endMatch(); return; }
    }
    this.t += dt;
    this.sim(dt);
    this.clearInput();
    this.render();
  }

  clearInput() { this.inp.pressed = false; this.inp.released = false; this.inp.superTap = false; }

  sim(dt: number) {
    const b = this.ball;
    for (const s of [0, 1] as Side[]) {
      this.gauge[s] = Math.min(1, this.gauge[s] + dt / 80);
      this.turbo[s] = Math.max(0, this.turbo[s] - dt);
      this.moveGoal[s] = Math.max(0, this.moveGoal[s] - dt);
      const target = this.moveGoal[s] > 0 ? Math.sin(this.t * 2.4) * 55 : 0;
      this.goalOff[s] += (target - this.goalOff[s]) * Math.min(1, dt * 4);
      this.goalGfx[s].y = sy(CY + this.goalOff[s]);
    }
    this.players.forEach((p) => {
      p.pickupCd -= dt; p.immune -= dt; p.stun -= dt; p.tackleCd -= dt;
    });

    if (this.state === 'play') {
      this.pickControlled();
      this.userInput();
      this.cpuPower(dt);
    }
    for (const p of this.players) {
      if (this.state === 'play' && p === this.ctrl) continue;
      if (this.state !== 'play') { p.dx *= 0.9; p.dy *= 0.9; continue; }
      if (p.goalie) this.aiGoalie(p, dt); else this.aiSkater(p, dt);
    }
    this.integrate(dt);
    this.updateBall(dt);
    if (this.state === 'play') this.steals(dt);
    void b;
  }

  // ---------------------------------------------------------------- contrôle joueur
  pickControlled() {
    const b = this.ball;
    const mine = this.players.filter((p) => p.team === 0 && !p.goalie);
    if (b.owner && b.owner.team === 0 && !b.owner.goalie) { this.ctrl = b.owner; return; }
    if (!b.owner && b.passTo && b.passTo.team === 0) { this.ctrl = b.passTo; return; }
    const tx = b.x + b.vx * 0.2, ty = b.y + b.vy * 0.2;
    const d = (p: P) => Math.hypot(p.x - tx, p.y - ty);
    const near = mine.reduce((a, c) => (d(c) < d(a) ? c : a));
    if (!this.ctrl || this.ctrl.goalie || d(near) + 30 < d(this.ctrl)) this.ctrl = near;
  }

  userInput() {
    const p = this.ctrl; if (!p) return;
    const inp = this.inp; const b = this.ball;
    const sp = this.maxSpeed(p);
    let mx = inp.mx, my = inp.my;
    const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
    p.dx = mx * sp; p.dy = my * sp;
    const has = b.owner === p;
    if (inp.pressed) {
      this.pressWithBall = has;
      if (!has) this.tackle(p);
    }
    if (inp.released && has && (this.pressWithBall || inp.releasedHold > 0.25)) {
      const aim = m > 0.3 ? [mx / Math.max(m, 0.001), my / Math.max(m, 0.001)] : [p.fx, p.fy];
      if (inp.releasedHold < 0.22) this.pass(p, aim[0], aim[1]);
      else this.shoot(p, Phaser.Math.Clamp((inp.releasedHold - 0.22) / 0.7, 0, 1), my);
    }
    if (inp.superTap && this.gauge[0] >= 1) this.activatePower(0);
  }

  tackle(p: P) {
    if (p.tackleCd > 0) return;
    p.tackleCd = 0.45;
    const c = this.ball.owner;
    // petit élan vers la balle
    const dx = this.ball.x - p.x, dy = this.ball.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d < 60) { p.vx += (dx / d) * 120; p.vy += (dy / d) * 120; }
    if (c && c.team !== p.team && d < 28 && !c.goalie) {
      if (this.turbo[c.team] <= 0 && Math.random() < 0.72) this.steal(p);
      else { p.stun = 0.3; }
    }
  }

  activatePower(s: Side) {
    this.gauge[s] = 0;
    const team = this.teams[s];
    sfx.power();
    if (team.id === 'caen') this.homing[s] = true;
    if (team.id === 'sal') this.turbo[s] = 6;
    if (team.id === 'nan') this.moveGoal[s] = 15;
    this.events2.emit('banner', team.power + ' !', team.css, 1300);
  }

  cpuPower(dt: number) {
    if (this.gauge[1] < 1) return;
    this.cpuPowerDelay -= dt;
    if (this.cpuPowerDelay > 0) return;
    const id = this.teams[1].id; const o = this.ball.owner;
    const ok = id === 'nan' ? (!o || o.team === 0) : (o && o.team === 1);
    if (ok) { this.activatePower(1); this.cpuPowerDelay = Phaser.Math.FloatBetween(2, 8); }
  }

  // ---------------------------------------------------------------- actions balle
  maxSpeed(p: P) {
    if (p.goalie) return 175;
    let s = 132 * statMult(this.teams[p.team].stats.v);
    if (this.ball.owner === p) s *= 0.9;
    if (this.turbo[p.team] > 0) s *= 1.5;
    if (p.team === 1 && settings.difficulty === 'facile') s *= 0.88;
    return s;
  }

  kick(p: P, tx: number, ty: number, speed: number, vz: number) {
    const b = this.ball;
    const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
    b.owner = null; b.vx = (dx / d) * speed; b.vy = (dy / d) * speed; b.vz = vz;
    b.last = p; b.passTo = null; b.isShot = false; b.kind = 'normal'; b.checked.clear();
    p.pickupCd = 0.3;
  }

  pass(p: P, ax: number, ay: number) {
    const mates = this.players.filter((q) => q.team === p.team && q !== p && !q.goalie);
    let best: P | null = null, bs = -99;
    for (const q of mates) {
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
      const s = (dx * ax + dy * ay) / d - d / 700;
      if (s > bs) { bs = s; best = q; }
    }
    if (!best) return;
    const d = Math.hypot(best.x - p.x, best.y - p.y);
    const tx = best.x + best.vx * 0.3, ty = best.y + best.vy * 0.3;
    this.kick(p, tx, ty, Phaser.Math.Clamp(d * 1.4 + 170, 240, 440), 0);
    this.ball.passTo = best;
    sfx.pass();
  }

  shoot(p: P, power: number, aimY: number) {
    const o = (1 - p.team) as Side;
    const gx = GX[o], gy = CY + this.goalOff[o];
    const dist = Math.hypot(gx - p.x, gy - p.y);
    let ty = gy + Phaser.Math.Clamp(aimY, -1, 1) * (GH - 7);
    ty += Phaser.Math.FloatBetween(-1, 1) * 16 * (1 - power * 0.6) * Math.min(1.5, dist / 300);
    let speed = (290 + 250 * power) * statMult(this.teams[p.team].stats.t);
    if (p.team === 1 && settings.difficulty === 'facile') speed *= 0.85;
    this.kick(p, gx, ty, speed, 30 + 120 * power);
    const b = this.ball;
    b.isShot = true;
    this.stats.shots[p.team]++;
    this.gauge[p.team] = Math.min(1, this.gauge[p.team] + 0.06);
    if (this.homing[p.team]) {
      this.homing[p.team] = false;
      b.kind = 'homing'; speed = 400;
      const d = Math.hypot(b.vx, b.vy) || 1; b.vx = (b.vx / d) * speed; b.vy = (b.vy / d) * speed; b.vz = 20;
      sfx.superShot();
    } else if (power > 0.85) { b.kind = 'super'; sfx.superShot(); } else sfx.shot();
  }

  gain(p: P, silent = false) {
    const b = this.ball;
    if (!silent && b.passTo && b.last && b.last.team === p.team && b.last !== p) {
      this.stats.passes[p.team]++;
      this.gauge[p.team] = Math.min(1, this.gauge[p.team] + 0.05);
    }
    b.owner = p; b.passTo = null; b.isShot = false; b.kind = 'normal'; b.z = 0; b.vz = 0; b.checked.clear();
    p.immune = 0.5;
    if (p.goalie) p.holdT = 0.9;
    if (p.team === 0 && !p.goalie) this.ctrl = p;
  }

  steal(q: P) {
    const c = this.ball.owner; if (!c) return;
    c.stun = 0.45; c.vx *= 0.3; c.vy *= 0.3;
    this.ball.last = c;
    this.gain(q, true);
    sfx.steal();
  }

  steals(dt: number) {
    const c = this.ball.owner;
    if (!c || c.goalie || c.immune > 0 || this.turbo[c.team] > 0) return;
    for (const q of this.players) {
      if (q.team === c.team || q.goalie || q.stun > 0) continue;
      if (Math.hypot(q.x - this.ball.x, q.y - this.ball.y) > 13) continue;
      let rate = 1.3 * statMult(this.teams[q.team].stats.d);
      if (c === this.ctrl) rate *= settings.difficulty === 'facile' ? 0.5 : 0.85;
      if (q === this.ctrl) rate *= 0.7;
      if (Math.random() < rate * dt) { this.steal(q); return; }
    }
  }

  // ---------------------------------------------------------------- IA
  moveTo(p: P, x: number, y: number, f = 1) {
    const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
    const sp = this.maxSpeed(p) * f * Math.min(1, d / 24);
    if (d < 1) { p.dx = p.dy = 0; return; }
    p.dx = (dx / d) * sp; p.dy = (dy / d) * sp;
  }

  aiGoalie(p: P, dt: number) {
    const b = this.ball, t = p.team, s = t === 0 ? 1 : -1;
    const gy = CY + this.goalOff[t];
    if (b.owner === p) {
      p.dx = p.dy = 0;
      p.holdT -= dt;
      if (p.holdT <= 0) {
        // relance vers le coéquipier le plus libre
        const opp = this.players.filter((q) => q.team !== t && !q.goalie);
        const mates = this.players.filter((q) => q.team === t && !q.goalie);
        const best = mates.reduce((a, c) => {
          const free = (q: P) => Math.min(...opp.map((o) => Math.hypot(o.x - q.x, o.y - q.y))) + (q.x - p.x) * s * 0.2;
          return free(c) > free(a) ? c : a;
        });
        this.pass(p, best.x - p.x, best.y - p.y);
      }
      return;
    }
    const out = Phaser.Math.Clamp(1 - Math.abs(b.x - GX[t]) / 300, 0, 1) * 12;
    // sur un tir, le gardien anticipe le point d'arrivée de la balle
    let aimY = b.y + b.vy * 0.08;
    const incoming = !b.owner && (t === 0 ? b.vx < -80 : b.vx > 80);
    if (incoming) aimY = b.y + b.vy * Phaser.Math.Clamp((p.x - b.x) / b.vx, 0, 1.2);
    const ty = Phaser.Math.Clamp(aimY, gy - GH + 4, gy + GH - 4);
    const tx = GX[t] + s * (7 + out);
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
    const sp = Math.min(this.maxSpeed(p), d * 8);
    p.dx = d > 0.5 ? (dx / d) * sp : 0; p.dy = d > 0.5 ? (dy / d) * sp : 0;
    if (Math.abs(b.x - p.x) > 4) p.fx = Math.sign(b.x - p.x);
  }

  aiSkater(p: P, dt: number) {
    const b = this.ball, t = p.team, o = (1 - t) as Side, dir = t === 0 ? 1 : -1;
    const ogx = GX[o], ogy = CY + this.goalOff[o];
    const mgx = GX[t], mgy = CY + this.goalOff[t];
    const own = b.owner;
    const wob = Math.sin(this.t * 1.3 + p.i * 2) * 14;
    const mates = this.players.filter((q) => q.team === t && !q.goalie && q !== p);
    const foes = this.players.filter((q) => q.team === o && !q.goalie);

    if (own === p) {
      // porteur IA
      let tx = ogx - dir * 75, ty = ogy + Math.sin(this.t * 1.5 + p.i) * 50;
      for (const f of foes) {
        const fx = f.x - p.x, fy = f.y - p.y, fd = Math.hypot(fx, fy);
        if (fd < 50 && fx * dir > -5) ty += (p.y > f.y ? 1 : -1) * 40;
      }
      this.moveTo(p, tx, Phaser.Math.Clamp(ty, 40, RH - 40));
      p.aiT -= dt;
      if (p.aiT <= 0) {
        p.aiT = Phaser.Math.FloatBetween(0.3, 0.55);
        const dG = Math.hypot(ogx - p.x, ogy - p.y);
        const front = (ogx - p.x) * dir > 30;
        const nearFoe = Math.min(...foes.map((f) => Math.hypot(f.x - p.x, f.y - p.y)));
        const hard = settings.difficulty === 'normal';
        const shootP = !front ? 0 : dG < 190 ? (hard ? 0.55 : 0.4) : dG < 260 ? 0.12 : 0;
        if (Math.random() < shootP) this.shoot(p, Phaser.Math.FloatBetween(0.35, 1), Phaser.Math.FloatBetween(-1, 1));
        else if (nearFoe < 34 && Math.random() < 0.5) this.pass(p, dir, Phaser.Math.FloatBetween(-0.5, 0.5));
      }
      return;
    }
    if (!own && b.passTo === p) { this.moveTo(p, b.x + b.vx * 0.15, b.y + b.vy * 0.15); return; }

    if (own && own.team === t) {
      // soutien offensif
      const others = this.players.filter((q) => q.team === t && !q.goalie && q !== own);
      const k = others.indexOf(p);
      const side = own.y < CY ? 1 : -1;
      const x = k === 0 ? own.x + dir * 120 : own.x - dir * 60;
      const y = k === 0 ? CY + side * 85 : CY + side * 30;
      this.moveTo(p, Phaser.Math.Clamp(x, 110, 690), y + wob, 0.85);
      return;
    }

    const chasers = [p, ...mates].filter((q) => !(t === 0 && q === this.ctrl));
    const byBall = [...chasers].sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y));
    const rank = byBall.indexOf(p);

    if (own && own.team !== t) {
      // défense
      const role = t === 1 ? rank : rank + 1; // côté joueur, l'humain fait le pressing
      if (role === 0) {
        const dd = Math.hypot(mgx - b.x, mgy - b.y) || 1;
        this.moveTo(p, b.x + ((mgx - b.x) / dd) * 4, b.y + ((mgy - b.y) / dd) * 4);
      } else if (role === 1) {
        const atk = foes.filter((f) => f !== own).sort((a, c) => Math.hypot(a.x - mgx, a.y - mgy) - Math.hypot(c.x - mgx, c.y - mgy))[0];
        if (atk) this.moveTo(p, atk.x + (mgx - atk.x) * 0.3, atk.y + (mgy - atk.y) * 0.3, 0.9);
      } else {
        this.moveTo(p, mgx + dir * 85, mgy + (b.y - mgy) * 0.4, 0.9);
      }
      return;
    }

    // balle libre
    if (rank === 0 && (t === 1 || !this.ctrl || Math.hypot(this.ctrl.x - b.x, this.ctrl.y - b.y) > 90)) {
      this.moveTo(p, b.x + b.vx * 0.2, b.y + b.vy * 0.2);
    } else {
      const x = (b.x - 400) * dir > 0 ? b.x - dir * 60 : mgx + dir * 110;
      this.moveTo(p, Phaser.Math.Clamp(x, 100, 700), CY + (p.i === 1 ? -70 : 70) + wob, 0.8);
    }
  }

  // ---------------------------------------------------------------- physique
  integrate(dt: number) {
    for (const p of this.players) {
      let dx = p.dx, dy = p.dy;
      if (p.stun > 0) { dx = 0; dy = 0; }
      const k = Math.min(1, dt * 7);
      p.vx += (dx - p.vx) * k; p.vy += (dy - p.vy) * k;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.x = Phaser.Math.Clamp(p.x, 8, RW - 8); p.y = Phaser.Math.Clamp(p.y, 8, RH - 8);
      if (!p.goalie) for (const t of [0, 1] as Side[]) this.pushOutOfGoal(p, t);
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 15 && !p.goalie) {
        const k2 = Math.min(1, dt * 10);
        p.fx += (p.vx / sp - p.fx) * k2; p.fy += (p.vy / sp - p.fy) * k2;
        const n = Math.hypot(p.fx, p.fy) || 1; p.fx /= n; p.fy /= n;
      }
      p.anim += sp * dt;
    }
    // séparation
    for (let a = 0; a < this.players.length; a++) for (let c = a + 1; c < this.players.length; c++) {
      const p = this.players[a], q = this.players[c];
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < 11) {
        const push = (11 - d) / 2;
        if (!p.goalie) { p.x -= (dx / d) * push; p.y -= (dy / d) * push; }
        if (!q.goalie) { q.x += (dx / d) * push; q.y += (dy / d) * push; }
      }
    }
  }

  goalBox(t: Side) {
    const gy = CY + this.goalOff[t];
    const x0 = t === 0 ? GX[0] - GD : GX[1], x1 = t === 0 ? GX[0] : GX[1] + GD;
    return { x0, x1, y0: gy - GH, y1: gy + GH };
  }

  pushOutOfGoal(p: P, t: Side) {
    const g = this.goalBox(t), m = 6;
    if (p.x < g.x0 - m || p.x > g.x1 + m || p.y < g.y0 - m || p.y > g.y1 + m) return;
    const opts = [[p.x - (g.x0 - m), 'l'], [(g.x1 + m) - p.x, 'r'], [p.y - (g.y0 - m), 'u'], [(g.y1 + m) - p.y, 'd']] as [number, string][];
    opts.sort((a, b) => a[0] - b[0]);
    const s = opts[0][1];
    if (s === 'l') p.x = g.x0 - m; else if (s === 'r') p.x = g.x1 + m; else if (s === 'u') p.y = g.y0 - m; else p.y = g.y1 + m;
  }

  updateBall(dt: number) {
    const b = this.ball;
    if (b.owner) {
      const o = b.owner;
      b.x = o.x + o.fx * 9; b.y = o.y + o.fy * 6 + 2; b.z = 0;
      b.vx = o.vx; b.vy = o.vy;
      b.x = Phaser.Math.Clamp(b.x, 5, RW - 5); b.y = Phaser.Math.Clamp(b.y, 5, RH - 5);
      return;
    }
    if (b.kind === 'homing') {
      const o: Side = b.last ? (1 - b.last.team) as Side : 1;
      const tx = GX[o] + (o === 0 ? -8 : 8), ty = CY + this.goalOff[o];
      const sp = Math.max(330, Math.hypot(b.vx, b.vy));
      const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, dt * 5);
      b.vx += ((dx / d) * sp - b.vx) * k; b.vy += ((dy / d) * sp - b.vy) * k;
    } else {
      const f = Math.exp(-(b.z > 0 ? 0.35 : 1.0) * dt);
      b.vx *= f; b.vy *= f;
    }
    if (b.z > 0 || b.vz > 0) {
      b.vz -= 650 * dt; b.z += b.vz * dt;
      if (b.z < 0) { b.z = 0; b.vz = b.vz < -60 ? -b.vz * 0.35 : 0; }
    }
    const px = b.x, py = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt;
    // bandes
    if (b.x < 5) { b.x = 5; b.vx = -b.vx * 0.75; }
    if (b.x > RW - 5) { b.x = RW - 5; b.vx = -b.vx * 0.75; }
    if (b.y < 5) { b.y = 5; b.vy = -b.vy * 0.75; }
    if (b.y > RH - 5) { b.y = RH - 5; b.vy = -b.vy * 0.75; }
    // buts
    for (const t of [0, 1] as Side[]) {
      const g = this.goalBox(t);
      if (b.x < g.x0 || b.x > g.x1 || b.y < g.y0 || b.y > g.y1) continue;
      const fromFront = t === 0 ? px >= GX[0] : px <= GX[1];
      if (fromFront && py >= g.y0 && py <= g.y1 && b.z < 24 && this.state === 'play') {
        b.vx *= 0.15; b.vy *= 0.15; b.kind = 'normal';
        this.onGoal((1 - t) as Side);
        return;
      }
      if (this.state === 'goal' && fromFront) {
        b.vx *= 0.5; b.vy *= 0.5;
        b.x = Phaser.Math.Clamp(b.x, g.x0 + 3, g.x1 - 3); b.y = Phaser.Math.Clamp(b.y, g.y0 + 3, g.y1 - 3);
        continue;
      }
      if (py < g.y0) { b.y = g.y0 - 1; b.vy = -b.vy * 0.6; }
      else if (py > g.y1) { b.y = g.y1 + 1; b.vy = -b.vy * 0.6; }
      else if (fromFront) { b.x = t === 0 ? g.x1 + 1 : g.x0 - 1; b.vx = -b.vx * 0.5; b.vz = 80; sfx.post(); }
      else { b.x = t === 0 ? g.x0 - 1 : g.x1 + 1; b.vx = -b.vx * 0.6; }
      b.kind = 'normal';
    }
    if (this.state !== 'play') return;
    // arrêts du gardien
    const speed = Math.hypot(b.vx, b.vy);
    for (const g of this.players) {
      if (!g.goalie || b.checked.has(g) || b.z > 28) continue;
      const toward = g.team === 0 ? b.vx < -40 : b.vx > 40;
      if (!toward || Math.abs(b.x - g.x) > 9 || Math.abs(b.y - g.y) > 19) continue;
      b.checked.add(g);
      let pSave = Phaser.Math.Clamp(1.05 - speed / 900, 0.4, 0.88) * (0.85 + 0.04 * this.teams[g.team].stats.d);
      if (b.kind === 'homing') pSave = 0.3;
      if (settings.difficulty === 'facile') pSave *= g.team === 1 ? 0.8 : 1.1;
      if (Math.random() < pSave) {
        this.stats.saves[g.team]++;
        this.gauge[g.team] = Math.min(1, this.gauge[g.team] + 0.04);
        sfx.save();
        this.events2.emit('save', g.team);
        if (speed < 380 || Math.random() < 0.5) { b.last = g; this.gain(g, true); return; }
        b.vx = -b.vx * 0.4; b.vy = Phaser.Math.FloatBetween(-170, 170); b.vz = 90; b.kind = 'normal'; b.isShot = false; b.last = g;
      } else g.pickupCd = 0.5;
    }
    // ramassage
    if (b.z > 12) return;
    let best: P | null = null, bd = 99;
    for (const p of this.players) {
      if (p.pickupCd > 0 || p.stun > 0) continue;
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      const r = p.goalie ? 12 : 11;
      if (d > r || d >= bd) continue;
      if (p.goalie && speed > 260) continue;
      if (!p.goalie && speed > 430 && (!b.last || b.last.team !== p.team)) {
        if (Math.random() > 0.4) { p.pickupCd = 0.25; continue; }
      }
      best = p; bd = d;
    }
    if (best) this.gain(best);
  }

  // ---------------------------------------------------------------- rendu
  render() {
    const b = this.ball;
    for (const p of this.players) {
      const sp = Math.hypot(p.vx, p.vy);
      p.spr.setPosition(Math.round(p.x), Math.round(sy(p.y)));
      p.spr.setDepth(sy(p.y));
      p.spr.setFrame(sp > 20 ? Math.floor(p.anim / 12) % 2 : 0);
      p.spr.setFlipX(p.fx < 0);
      p.spr.setAlpha(p.stun > 0 && Math.floor(this.time.now / 60) % 2 ? 0.4 : 1);
      if (this.turbo[p.team] > 0 && !p.goalie) p.spr.setTint(Math.floor(this.time.now / 80) % 2 ? 0xffffff : 0xfff2a0);
      else p.spr.clearTint();
      p.sh.setPosition(Math.round(p.x), Math.round(sy(p.y)) + 1);
    }
    b.spr.setPosition(Math.round(b.x), Math.round(sy(b.y) - b.z - 2));
    b.spr.setDepth(sy(b.y) + (b.owner && b.owner.fy < -0.3 ? -0.5 : 0.5));
    b.sh.setPosition(Math.round(b.x), Math.round(sy(b.y)) + 1);
    // traînée de feu pour les tirs puissants
    if (!b.owner && (b.kind !== 'normal') && this.time.now - this.trailT > 16) {
      this.trailT = this.time.now;
      const col = b.kind === 'homing' ? Phaser.Utils.Array.GetRandom([0xff5a3c, 0xffb52e, 0xc65bff]) : Phaser.Utils.Array.GetRandom([0xff5a3c, 0xffb52e, 0xfff2a0]);
      const s = this.add.image(b.spr.x + Phaser.Math.Between(-1, 1), b.spr.y + Phaser.Math.Between(-1, 1), 'px').setTint(col).setDepth(b.spr.depth - 0.1);
      this.tweens.add({ targets: s, alpha: 0, scale: 0.3, duration: 260, onComplete: () => s.destroy() });
    }
    // marqueur du joueur contrôlé
    this.marker.clear();
    const c = this.ctrl;
    if (c && this.state !== 'end') {
      const bob = Math.sin(this.time.now / 120) * 1.5;
      const x = Math.round(c.x), y = Math.round(sy(c.y) - 26 + bob);
      this.marker.fillStyle(0x120f2a, 1); this.marker.fillTriangle(x - 5, y - 1, x + 5, y - 1, x, y + 6);
      this.marker.fillStyle(0xffb52e, 1); this.marker.fillTriangle(x - 4, y, x + 4, y, x, y + 4);
      this.marker.lineStyle(1, 0xffb52e, 0.8); this.marker.strokeEllipse(x, Math.round(sy(c.y)) + 1, 16, 6);
    }
    if (b.passTo && !b.owner && b.passTo.team === 0) {
      this.marker.lineStyle(1, 0xffffff, 0.6); this.marker.strokeEllipse(Math.round(b.passTo.x), Math.round(sy(b.passTo.y)) + 1, 18, 7);
    }
    // caméra : la balle, avec un peu d'avance vers l'attaque
    const lead = b.owner ? b.owner.fx * 40 : b.vx * 0.12;
    this.camTarget.x = b.x + lead;
    this.camTarget.y = sy(b.y) - 10;
  }
}
