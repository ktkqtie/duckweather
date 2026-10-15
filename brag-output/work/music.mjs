// Synthesizes the whole soundtrack (music + effects as one piece) to soundtrack.wav.
// 100 BPM in F major; effects are tuned to the chord under them and share one reverb.
import fs from "node:fs";

const SR = 48000;
const DUR = 24;
const N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
const sendL = new Float32Array(N), sendR = new Float32Array(N); // reverb send

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, Bb: 10, B: 11 };
const m = (name, oct) => 12 * (oct + 1) + NOTE[name];

// deterministic noise
let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

function add(t0, buf, { gain = 1, pan = 0, send = 0.2 } = {}) {
  const s0 = Math.round(t0 * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < buf.length; i++) {
    const j = s0 + i;
    if (j < 0 || j >= N) continue;
    L[j] += buf[i] * gl; R[j] += buf[i] * gr;
    sendL[j] += buf[i] * gl * send; sendR[j] += buf[i] * gr * send;
  }
}

// ---------- voices ----------
function mallet(f, len = 0.9, bright = 1) {
  // soft marimba-ish: fundamental + a quiet 4x partial that dies fast
  const n = Math.round(len * SR), b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const att = Math.min(1, t / 0.004);
    b[i] = att * (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 5.5)
      + 0.22 * bright * Math.sin(2 * Math.PI * f * 4 * t) * Math.exp(-t * 28)
      + 0.08 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 9));
  }
  return b;
}

function pad(freqs, len) {
  const n = Math.round(len * SR), b = new Float32Array(n);
  for (const f of freqs) {
    for (const d of [-0.12, 0.12]) {
      const ff = f * Math.pow(2, d / 12);
      const ph = Math.random() * 0 + d * 3;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        // soft, warm: sine + a little 2nd/3rd harmonic
        const x = 2 * Math.PI * ff * t + ph;
        b[i] += (Math.sin(x) + 0.18 * Math.sin(2 * x) + 0.06 * Math.sin(3 * x)) / (freqs.length * 2);
      }
    }
  }
  const a = 0.35 * SR, r = 0.5 * SR;
  for (let i = 0; i < n; i++) b[i] *= Math.min(1, i / a) * Math.min(1, (n - i) / r);
  return b;
}

function bass(f, len) {
  const n = Math.round(len * SR), b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    b[i] = (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t)) * Math.min(1, t / 0.01) * Math.exp(-t * 2.2) * Math.min(1, (n - i) / (0.05 * SR));
  }
  return b;
}

function kick() {
  const n = Math.round(0.32 * SR), b = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 48 + 70 * Math.exp(-t * 32);
    ph += 2 * Math.PI * f / SR;
    b[i] = Math.sin(ph) * Math.exp(-t * 11) * Math.min(1, t / 0.002);
  }
  return b;
}

function noiseHit(len, { hp = 0.9, decay = 60 } = {}) {
  // high-passed noise burst (shaker / tick)
  const n = Math.round(len * SR), b = new Float32Array(n);
  let prev = 0, lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const x = rnd();
    const h = x - prev; prev = x; // crude high-pass
    lp += (h - lp) * hp;
    b[i] = lp * Math.exp(-t * decay) * Math.min(1, t / 0.003);
  }
  return b;
}

function snap() {
  // soft rim/snap for 2 and 4
  const n = Math.round(0.18 * SR), b = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    lp += (rnd() - lp) * 0.35;
    b[i] = (lp * 0.9 + 0.5 * Math.sin(2 * Math.PI * 330 * t) * Math.exp(-t * 60)) * Math.exp(-t * 26);
  }
  return b;
}

function whoosh(len, up = true) {
  // band of noise whose brightness swells then falls
  const n = Math.round(len * SR), b = new Float32Array(n);
  let lp1 = 0, lp2 = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const shape = up ? Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 2) : Math.pow(Math.sin(Math.PI * u), 2);
    const cut = 0.01 + 0.12 * shape;
    lp1 += (rnd() - lp1) * cut;
    lp2 += (lp1 - lp2) * cut;
    b[i] = lp2 * shape * 2.2;
  }
  return b;
}

function click() {
  // a soft, woody tock
  const n = Math.round(0.09 * SR), b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    b[i] = (Math.sin(2 * Math.PI * 1760 * t) * 0.6 + Math.sin(2 * Math.PI * 1175 * t) * 0.4) * Math.exp(-t * 85) * Math.min(1, t / 0.0015);
  }
  const tick = noiseHit(0.02, { hp: 0.6, decay: 300 });
  for (let i = 0; i < tick.length; i++) b[i] += tick[i] * 0.25;
  return b;
}

function bloop(f) {
  // the duck changing outfit: a quick rising pluck
  const n = Math.round(0.45 * SR), b = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const fr = f * (0.72 + 0.28 * (1 - Math.exp(-t * 40)));
    ph += 2 * Math.PI * fr / SR;
    b[i] = (Math.sin(ph) + 0.15 * Math.sin(2 * ph)) * Math.exp(-t * 9) * Math.min(1, t / 0.003);
  }
  return b;
}

function bell(f, len = 2.5) {
  const n = Math.round(len * SR), b = new Float32Array(n);
  const parts = [[1, 1, 2.2], [2.0, 0.35, 3.5], [3.01, 0.18, 5], [4.2, 0.08, 8]];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (const [r, a, d] of parts) v += a * Math.sin(2 * Math.PI * f * r * t) * Math.exp(-t * d);
    b[i] = v * Math.min(1, t / 0.002);
  }
  return b;
}

// ---------- the music ----------
const BEAT = 0.6, BAR = 2.4, OFF = 0.35; // bar 1 lands on the reveal (2.75s)
const CHORDS = [ // bar start, root, triad (midi)
  ["F", [m("F", 3), m("A", 3), m("C", 4)]],
  ["F", [m("F", 3), m("A", 3), m("C", 4)]],
  ["C", [m("E", 3), m("G", 3), m("C", 4)]],
  ["D", [m("D", 3), m("F", 3), m("A", 3)]],
  ["Bb", [m("D", 3), m("F", 3), m("Bb", 3)]],
  ["C", [m("E", 3), m("G", 3), m("C", 4)]],
  ["F", [m("F", 3), m("A", 3), m("C", 4)]],
  ["F", [m("F", 3), m("A", 3), m("C", 4)]],
  ["Bb", [m("D", 3), m("F", 3), m("Bb", 3)]],
  ["F", [m("F", 3), m("A", 3), m("C", 4)]],
];
const barStart = (k) => OFF + k * BAR;
const chordAt = (t) => CHORDS[Math.max(0, Math.min(CHORDS.length - 1, Math.floor((t - barStart(0)) / BAR)))];

CHORDS.forEach(([root, triad], k) => {
  const t0 = barStart(k);
  const last = k === CHORDS.length - 1;
  const len = last ? DUR - t0 : BAR + 0.4;
  // pad
  const p0 = k === 0 ? 0 : t0;
  add(p0, pad(triad.map((x) => hz(x + 12)), Math.min(len + t0 - p0, DUR - p0)), { gain: 0.085, send: 0.5 });
  // arpeggio: eighth notes, soft mallets, hushed in the intro
  const arp = [0, 1, 2, 1, 2, 0, 2, 1].map((i) => triad[i] + 24);
  const arp2 = [0, 2, 1, 2, 0, 1, 2, 1].map((i) => triad[i] + 24);
  const steps = last ? 1 : 8;
  for (let s = 0; s < steps; s++) {
    const t = t0 + s * BEAT / 2;
    if (t < 0.05 || t > DUR - 0.2) continue;
    // step 3 (the duck grid) gets its own melody, so the arpeggio drops out there
    if (t > 15.2 && t < 18.5) continue;
    const intro = t < 2.7;
    const note = (k % 2 ? arp2 : arp)[s];
    add(t, mallet(hz(note), 0.7, 0.8), { gain: (intro ? 0.075 : 0.11) * (s % 2 ? 0.75 : 1), pan: s % 2 ? 0.3 : -0.3, send: 0.35 });
  }
  if (last) add(t0, bell(hz(m("F", 5)), DUR - t0), { gain: 0.07, send: 0.6 });
  // bass and drums from the reveal on
  if (t0 >= 2.7) {
    const rootMidi = triad[0] % 12 === NOTE[root] % 12 ? triad[0] - 12 : m(root, 2);
    add(t0, bass(hz(rootMidi), last ? 3 : BEAT * 2.6), { gain: 0.24, send: 0.05 });
    if (!last) add(t0 + BEAT * 2.5, bass(hz(rootMidi), BEAT * 1.4), { gain: 0.16, send: 0.05 });
    for (let b = 0; b < (last ? 1 : 4); b++) {
      const t = t0 + b * BEAT;
      if (b % 2 === 0) add(t, kick(), { gain: 0.22, send: 0.02 });
      else add(t, snap(), { gain: 0.06, send: 0.35, pan: 0.05 });
      if (!last) add(t + BEAT / 2, noiseHit(0.06, { decay: 70 }), { gain: 0.035, pan: 0.35, send: 0.1 });
    }
  }
});

// ---------- effects, from the video's timeline ----------
const fx = (t, buf, o) => add(t, buf, { send: 0.25, ...o });
// pull-back from the wordmark, and the dive into the duck
fx(1.05, whoosh(1.75), { gain: 0.16, send: 0.4 });
fx(13.85, whoosh(0.85, false), { gain: 0.12, send: 0.4 });
// clicks
for (const t of [4.56, 6.82, 10.3, 12.18]) fx(t, click(), { gain: 0.13, pan: 0.15 });
// typing
for (let i = 0; i < 9; i++) fx(5.0 + i * 0.13, noiseHit(0.03, { hp: 0.5, decay: 160 }), { gain: 0.05 + (i % 3) * 0.008, pan: 0.2, send: 0.1 });
// each new duck
for (const t of [7.62, 10.32, 12.2]) {
  const [, triad] = chordAt(t);
  fx(t + 0.02, bloop(hz(triad[2] + 12)), { gain: 0.12, send: 0.35 });
}
// the duck grid: one rising note per duck, coldest to hottest, over an F chord
const SCALE = [0, 2, 4, 5, 7, 9, 11].map((d) => m("F", 3) + d);
for (let i = 0; i < 20; i++) {
  const note = SCALE[i % 7] + 12 * Math.floor(i / 7);
  fx(15.35 + i * 0.138, mallet(hz(note), 0.8, 1), { gain: 0.1, pan: -0.6 + 1.2 * (i / 19), send: 0.4 });
}
// the rain duck gets a little chord
for (const n of [m("F", 5), m("A", 5), m("C", 6)]) fx(15.35 + 20 * 0.138, bell(hz(n), 1.6), { gain: 0.045, send: 0.55 });
// outro
fx(20.35, bell(hz(m("C", 5)), 2.4), { gain: 0.06, send: 0.6 });
fx(21.62, bloop(hz(m("A", 5))), { gain: 0.08, send: 0.4 });

// ---------- one shared room ----------
function reverb(inp, delays, fb) {
  const out = new Float32Array(N);
  for (const d of delays) {
    const D = Math.round(d * SR);
    const buf = new Float32Array(D);
    let p = 0, lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[p];
      lp += (y - lp) * 0.45; // darken the tail
      buf[p] = inp[i] + lp * fb;
      out[i] += y;
      p = (p + 1) % D;
    }
  }
  return out;
}
const wetL = reverb(sendL, [0.0297, 0.0371, 0.0411, 0.0437], 0.78);
const wetR = reverb(sendR, [0.0301, 0.0359, 0.0423, 0.0449], 0.78);

// ---------- mix down ----------
const out = Buffer.alloc(44 + N * 4);
let peak = 0;
const mixL = new Float32Array(N), mixR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.08) * Math.min(1, (DUR - t) / 1.2);
  mixL[i] = Math.tanh((L[i] + wetL[i] * 0.09) * 1.15) * fade;
  mixR[i] = Math.tanh((R[i] + wetR[i] * 0.09) * 1.15) * fade;
  peak = Math.max(peak, Math.abs(mixL[i]), Math.abs(mixR[i]));
}
const norm = 0.89 / peak;
out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVE", 8);
out.write("fmt ", 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
out.write("data", 36); out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  out.writeInt16LE(Math.round(mixL[i] * norm * 32767), 44 + i * 4);
  out.writeInt16LE(Math.round(mixR[i] * norm * 32767), 46 + i * 4);
}
fs.writeFileSync("soundtrack.wav", out);
console.log("peak before normalize", peak.toFixed(3));
