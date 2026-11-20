import { settings } from './data';

let ctx: AudioContext | null = null;
export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { ctx = null; }
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.08, slideTo?: number, delay = 0) {
  if (!ctx || !settings.sound) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur: number, vol = 0.12, delay = 0) {
  if (!ctx || !settings.sound) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(); const g = ctx.createGain(); g.gain.value = vol;
  s.buffer = buf; s.connect(g).connect(ctx.destination); s.start(t0);
}

export const sfx = {
  click: () => tone(660, 0.06, 'square', 0.05),
  pass: () => tone(520, 0.07, 'square', 0.05, 780),
  shot: () => { noise(0.08, 0.15); tone(220, 0.12, 'square', 0.06, 110); },
  superShot: () => { noise(0.2, 0.18); tone(180, 0.35, 'sawtooth', 0.07, 900); },
  steal: () => tone(300, 0.08, 'triangle', 0.08, 500),
  save: () => { noise(0.05, 0.1); tone(140, 0.1, 'square', 0.06); },
  bounce: () => tone(900, 0.04, 'triangle', 0.035, 600),
  post: () => tone(1200, 0.15, 'triangle', 0.06, 900),
  whistle: () => { tone(2200, 0.35, 'sine', 0.05); tone(2350, 0.35, 'sine', 0.03); },
  goal: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'square', 0.06, undefined, i * 0.1)),
  power: () => [392, 523, 784].forEach((f, i) => tone(f, 0.12, 'sawtooth', 0.05, undefined, i * 0.06)),
};
