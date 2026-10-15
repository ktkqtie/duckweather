// Every visual on this page is a pure function of t (seconds). The driver (render.mjs)
// calls seek(t) once per frame, then performs the real mouse/keyboard events listed in
// EVENTS against the live app inside the iframe.
const DURATION = 24;
const IFRAME_Y = 46; // the window's title bar
const $ = (id) => document.getElementById(id);
const app = () => $("app").contentDocument;

// ---------- easing ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const easeIO = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const easeOut = (u) => 1 - Math.pow(1 - u, 3);
const easeOutBack = (u) => { const c = 1.6; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
const prog = (t, a, b) => clamp((t - a) / (b - a));

// ---------- where things are in the app (world coords) ----------
function rectOf(sel) {
  const el = app().querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y + IFRAME_Y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + IFRAME_Y + r.height / 2 };
}
const at = (sel, dx = 0, dy = 0) => () => { const r = rectOf(sel); return r ? { x: r.cx + dx, y: r.cy + dy } : null; };
const fixed = (x, y) => () => ({ x, y });

// ---------- camera ----------
// s = zoom, (x, y) = world point at the center of the frame
const CAM = [
  { t: 0.0, s: 4.7, x: 210, y: 100 },
  { t: 1.1, s: 6.2, x: 210, y: 94 },   // push in on the wordmark
  { t: 2.75, s: 0.79, x: 640, y: 662 },  // pull back to the whole site
  { t: 3.85, s: 0.82, x: 640, y: 650 },
  { t: 4.7, s: 1.72, x: 960, y: 290 },   // the place picker
  { t: 6.95, s: 1.76, x: 958, y: 292 },
  { t: 7.95, s: 1.42, x: 655, y: 400 },  // hero: duck + temperature
  { t: 9.15, s: 1.46, x: 652, y: 402 },
  { t: 10.1, s: 1.08, x: 612, y: 690 },   // duck + forecast together
  { t: 13.0, s: 1.11, x: 606, y: 684 },
  { t: 14.2, s: 2.2, x: 386, y: 440 },   // into the duck
  { t: 24, s: 2.2, x: 386, y: 440 },
];

const LOOP_RESET = 20.6; // the outro fully covers the app from here
function camera(t) {
  if (t >= LOOP_RESET) t = 0;
  let i = CAM.findIndex((k) => k.t > t) - 1;
  if (i < 0) i = t < CAM[0].t ? 0 : CAM.length - 2;
  const A = CAM[i], B = CAM[i + 1];
  const u = easeIO(prog(t, A.t, B.t));
  // translate: screen = s * world + T, T = center - s * focus
  const TA = { x: 960 - A.s * A.x, y: 540 - A.s * A.y };
  const TB = { x: 960 - B.s * B.x, y: 540 - B.s * B.y };
  const s = Math.exp(lerp(Math.log(A.s), Math.log(B.s), u));
  if (Math.abs(Math.log(A.s / B.s)) > 0.05) {
    // zoom about the one point both views agree on, so the move is one smooth arc
    const P = { x: (TB.x - TA.x) / (A.s - B.s), y: (TB.y - TA.y) / (A.s - B.s) };
    const Q = { x: A.s * P.x + TA.x, y: A.s * P.y + TA.y };
    return { s, tx: Q.x - s * P.x, ty: Q.y - s * P.y };
  }
  return { s, tx: lerp(TA.x, TB.x, u), ty: lerp(TA.y, TB.y, u) };
}
const toScreen = (cam, p) => ({ x: cam.tx + cam.s * p.x, y: cam.ty + cam.s * p.y });

// ---------- cursor ----------
// waypoints: hold at `to` from `t` (arriving over `dur`)
const PATH = [
  { t: 2.9, to: fixed(1010, 640), dur: 0 },
  { t: 3.95, to: fixed(990, 600), dur: 0.9 },
  { t: 4.5, to: at("#locate-btn", 2, 3), dur: 0.62 },
  { t: 5.05, to: at("#locate-btn", 92, 38), dur: 0.5 },
  { t: 6.72, to: at("#place-results li:first-child button", -40, 2), dur: 0.62 },
  { t: 8.0, to: fixed(930, 640), dur: 0.95 },
  { t: 10.22, to: at('#days button[data-i="1"]', -70, 4), dur: 0.95 },
  { t: 12.1, to: at('#days button[data-i="3"]', -70, 4), dur: 0.82 },
  { t: 13.3, to: at('#days button[data-i="3"]', 60, 60), dur: 0.7 },
];
const CURSOR_ON = [2.9, 13.7];

// cursor position is resolved once per waypoint (targets can move when the app re-renders)
const resolved = new Map();
function cursorWorld(t) {
  let pos = null;
  for (let i = 0; i < PATH.length; i++) {
    const w = PATH[i];
    const start = w.t - w.dur;
    if (t < start) break;
    if (!resolved.has(i) || t < w.t) resolved.set(i, w.to() || resolved.get(i));
    const target = resolved.get(i);
    if (!pos || w.dur === 0 || t >= w.t) { pos = target; continue; }
    const u = easeIO(prog(t, start, w.t));
    // a gentle arc, like a hand moving a mouse
    const dx = target.x - pos.x, dy = target.y - pos.y;
    const bow = Math.sin(u * Math.PI) * 0.12;
    pos = { x: lerp(pos.x, target.x, u) - dy * bow, y: lerp(pos.y, target.y, u) + dx * bow };
  }
  return pos;
}

// ---------- events the driver performs on the real app ----------
const EVENTS = [
  { t: 3.35, type: "blink" },
  { t: 4.56, type: "down" }, { t: 4.66, type: "up" },
  ...[..."Denver"].map((ch, i) => ({ t: 5.0 + i * 0.13, type: "key", ch })),
  { t: 6.82, type: "down" }, { t: 6.92, type: "up" },
  { t: 7.62, type: "release" }, // the forecast for the new place "arrives"
  { t: 8.75, type: "blink" },
  { t: 10.3, type: "down" }, { t: 10.4, type: "up" },
  { t: 11.35, type: "blink" },
  { t: 12.18, type: "down" }, { t: 12.28, type: "up" },
  { t: 13.25, type: "blink" },
];
const CLICKS = EVENTS.filter((e) => e.type === "down").map((e) => e.t);

// ---------- captions ----------
const CAPTIONS = []; // no step captions: the cursor tells the story

function drawCaption(t) {
  const el = $("caption");
  const c = CAPTIONS.find((c) => t >= c.a - 0.05 && t <= c.b + 0.35);
  if (!c) { el.style.opacity = 0; return; }
  const inU = easeOutBack(prog(t, c.a, c.a + 0.42));
  const outU = easeIO(prog(t, c.b, c.b + 0.3));
  if (el.dataset.key !== c.html) {
    el.dataset.key = c.html;
    el.querySelector(".n").innerHTML = c.n;
    el.querySelector(".n").classList.toggle("ico", !!c.ico);
    el.querySelector(".t").innerHTML = c.html;
  }
  el.style.opacity = clamp(prog(t, c.a, c.a + 0.25)) * (1 - outU);
  el.style.transform = `translate(${(1 - inU) * -60 - outU * 30}px, 0) scale(${0.94 + 0.06 * clamp(inU, 0, 1.2)})`;
}

// ---------- all the ducks ----------
const BANDS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, "rain"];
const GRID = { cols: 7, cw: 220, gap: 20, top: 214, pitch: 272 };
const cellPos = (i) => ({
  x: (1920 - (GRID.cols * GRID.cw + (GRID.cols - 1) * GRID.gap)) / 2 + (i % GRID.cols) * (GRID.cw + GRID.gap),
  y: GRID.top + Math.floor(i / GRID.cols) * GRID.pitch,
});
const DUCK_W = 170, DUCK_H = 200; // 900×1062 art
function tempColor(i) {
  const stops = [[111, 143, 166], [120, 160, 170], [226, 161, 58], [207, 106, 64]];
  const u = i / 19 * (stops.length - 1);
  const k = Math.min(stops.length - 2, Math.floor(u)), f = u - k;
  const c = stops[k].map((v, j) => Math.round(lerp(v, stops[k + 1][j], f)));
  return `rgb(${c})`;
}

function buildDucks() {
  const box = $("ducks");
  box.querySelector("h2").innerHTML = "A new duck for every <em>5°F</em>";
  $("therm").remove();
  BANDS.forEach((b, i) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    const p = cellPos(i);
    Object.assign(cell.style, { left: p.x + "px", top: p.y + "px", width: GRID.cw + "px", height: "250px" });
    cell.innerHTML = `<img src="/app/assets/ducks/duck-${b}.png" style="left:${(GRID.cw - DUCK_W) / 2}px;width:${DUCK_W}px;height:${DUCK_H}px"><b style="top:${DUCK_H + 6}px;color:${b === "rain" ? "#6f8fa6" : tempColor(i)}">${b === "rain" ? "☂ rain" : `${b}<small>°F</small>`}</b>`;
    box.appendChild(cell);
  });
  $("flyduck").src = "/app/assets/ducks/duck-30.png";
}

const FLY_INDEX = BANDS.indexOf(30);
const SCAN = { a: 15.35, step: 0.138 };
const GRID_IN = [14.45, 15.05];

function drawDucks(t, cam) {
  const box = $("ducks");
  const fly = $("flyduck");
  const wash = prog(t, 13.95, 14.5);
  box.style.opacity = wash > 0 ? 1 : 0;
  box.querySelector(".wash").style.opacity = easeIO(wash);
  // after the outro covers everything there's nothing to draw
  if (t > 20.9) { box.style.opacity = 0; fly.style.opacity = 0; return; }

  const h2 = box.querySelector("h2");
  const hu = easeOutBack(prog(t, 14.75, 15.25));
  h2.style.opacity = clamp(prog(t, 14.75, 15.0));
  h2.style.transform = `translateY(${(1 - hu) * 30}px)`;

  // leaving: everything sinks and fades just before the outro wipes in
  const leave = easeIO(prog(t, 19.55, 20.15));
  const cells = box.querySelectorAll(".cell");
  cells.forEach((cell, i) => {
    const ghost = easeOut(prog(t, GRID_IN[0] + (i % 7) * 0.035 + Math.floor(i / 7) * 0.05, GRID_IN[1]));
    const lit = i === FLY_INDEX ? (t >= 15.2 ? 1 : 0) : easeOut(prog(t, SCAN.a + i * SCAN.step, SCAN.a + i * SCAN.step + 0.18));
    const bumpU = prog(t, SCAN.a + i * SCAN.step, SCAN.a + i * SCAN.step + 0.42);
    const bump = bumpU > 0 && bumpU < 1 ? Math.sin(bumpU * Math.PI) * 0.16 * (1 - bumpU * 0.4) : 0;
    // after the scan, every duck breathes a little, slightly out of step
    const breathe = t > SCAN.a + 21 * SCAN.step ? Math.sin((t - 15) * 3.4 + i * 0.7) * 0.012 : 0;
    const img = cell.querySelector("img"), lab = cell.querySelector("b");
    cell.style.opacity = (ghost * (1 - leave)).toFixed(3);
    cell.style.transform = `translateY(${(1 - ghost) * 26 + leave * 40}px) scale(${1 - leave * 0.06})`;
    img.style.opacity = (i === FLY_INDEX && t < 15.2) ? 0 : (0.22 + 0.78 * lit).toFixed(3);
    img.style.filter = `grayscale(${(1 - lit).toFixed(3)}) drop-shadow(0 8px 8px rgba(80,55,35,${(0.16 * lit).toFixed(3)}))`;
    img.style.transform = `translateY(${-bump * 60}px) scale(${1 + bump + breathe}, ${1 + bump - breathe})`;
    lab.style.opacity = (0.3 + 0.7 * lit).toFixed(3);
    lab.style.transform = `scale(${1 + bump * 0.8})`;
  });
  h2.style.opacity = (parseFloat(h2.style.opacity) * (1 - leave)).toFixed(3);

  // the app's duck flies into its slot
  if (t < 13.95 || t >= 15.2) { fly.style.opacity = 0; return; }
  if (!drawDucks.from) {
    const r = rectOf("#duck");
    drawDucks.from = r;
  }
  const r = drawDucks.from;
  const fromS = toScreen(cam, { x: r.x, y: r.y });
  const fromW = r.w * cam.s;
  const p = cellPos(FLY_INDEX);
  const toX = p.x + (GRID.cw - DUCK_W) / 2, toY = p.y;
  const u = easeIO(prog(t, 14.25, 15.15));
  const arc = Math.sin(u * Math.PI) * -60;
  const w = Math.exp(lerp(Math.log(fromW), Math.log(DUCK_W), u));
  fly.style.opacity = 1;
  fly.style.width = w + "px";
  fly.style.height = w * (1062 / 900) + "px";
  fly.style.transform = `translate(${lerp(fromS.x, toX, u)}px, ${lerp(fromS.y, toY, u) + arc}px)`;
}

// ---------- outro ----------
// Holds the lockup, then the wordmark glides to exactly where the opening shot shows it
// and the outro dissolves into that shot, so the last frame flows into the first.
function drawOutro(t) {
  const el = $("outro");
  const u = prog(t, 20.0, 20.55);
  el.style.opacity = u > 0 ? 1 : 0;
  const end = $("endmark");
  if (u <= 0) { end.style.opacity = 0; return; }
  const bg = el.querySelector(".bg");
  const lock = el.querySelector(".lock");
  const wm = el.querySelector(".wm");
  const lu = easeOutBack(prog(t, 20.2, 20.9));
  const out = easeIO(prog(t, 22.55, 22.95)); // duck and tagline leave
  lock.style.opacity = clamp(prog(t, 20.2, 20.5));
  lock.style.transform = `translateY(${(1 - lu) * 50}px) scale(${0.96 + 0.04 * lu})`;
  lock.style.scale = 1 + 0.03 * easeIO(prog(t, 21.0, 22.6));
  const img = el.querySelector("img");
  const tag = el.querySelector("p");
  tag.style.opacity = clamp(prog(t, 20.7, 21.1)) * (1 - out);
  tag.style.transform = `translateY(${(1 - easeOut(prog(t, 20.7, 21.2))) * 16 + out * 14}px)`;
  const hop = prog(t, 21.6, 22.15);
  const hopY = hop > 0 && hop < 1 ? -Math.sin(hop * Math.PI) * 36 : 0;
  const squash = hop > 0 && hop < 1 ? Math.sin(hop * Math.PI * 2) * 0.03 : 0;
  const breathe = Math.sin((t - 20) * 3.5) * 0.008;
  img.style.opacity = 1 - out;
  img.style.transform = `translateY(${hopY + out * 30}px) scale(${(1 - squash - breathe) * (1 - out * 0.08)}, ${(1 + squash + breathe) * (1 - out * 0.08)})`;

  // sky: the outro's gradient, dissolving into the opening shot at the very end
  const dissolve = easeIO(prog(t, 23.15, 23.75));
  bg.style.opacity = easeIO(u) * (1 - dissolve);

  // the gliding wordmark: starts exactly on top of the lockup's, ends on the app's own
  const g = easeIO(prog(t, 22.7, 23.6));
  if (t < 22.7) { wm.style.opacity = 1; end.style.opacity = 0; return; }
  wm.style.opacity = 0;
  const from = wm.getBoundingClientRect();
  const nat = drawOutro.nat ??= (() => { end.style.transform = "none"; const r = end.getBoundingClientRect(); return { w: r.width, h: r.height }; })();
  const cam0 = camera(0);
  const target = rectOf(".wordmark");
  const to = toScreen(cam0, { x: target.x, y: target.y });
  const k = Math.exp(lerp(Math.log(from.width / nat.w), Math.log(cam0.s * target.w / nat.w), g));
  const x = lerp(from.x, to.x, g), y = lerp(from.y + (from.height - nat.h * from.width / nat.w) / 2, to.y, g);
  end.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
  // the app's own wordmark sits underneath in the same spot, so it can simply fade
  end.style.opacity = 1 - easeIO(prog(t, 23.62, 23.95));
}

// ---------- seek ----------
let built = false;
function seek(t) {
  if (!built) { buildDucks(); built = true; }
  const cam = camera(t);
  // opening on the wordmark: the title bar reads as more sky until the pull-back
  const ch = t >= LOOP_RESET ? 0 : easeIO(prog(t, 1.45, 2.3));
  const chrome = $("chrome");
  chrome.style.background = `rgb(${[179, 209, 234].map((a, i) => Math.round(lerp(a, [239, 229, 214][i], ch)))})`;
  chrome.style.borderBottomColor = `rgba(230, 217, 199, ${ch})`;
  for (const c of chrome.children) c.style.opacity = ch;
  const win = $("win");
  win.style.background = ch < 1 ? "#b3d1ea" : "";
  win.style.boxShadow = `0 2px 0 rgba(80,55,35,${0.05 * ch}), 0 40px 90px -30px rgba(60,40,25,${0.45 * ch}), 0 0 0 1px rgba(80,55,35,${0.1 * ch})`;
  $("world").style.transform = `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})`;
  // backdrop drifts a little with the camera for depth
  const par = (v) => clamp(v * 0.05, -60, 60);
  $("backdrop").style.transform = `translate(${par(cam.tx - 960 + 640 * cam.s)}px, ${par(cam.ty - 540 + 660 * cam.s)}px)`;

  // cursor
  const cur = $("cursor");
  const w = cursorWorld(t);
  const vis = clamp(prog(t, CURSOR_ON[0], CURSOR_ON[0] + 0.3)) * (1 - prog(t, CURSOR_ON[1] - 0.3, CURSOR_ON[1]));
  let screen = { x: -100, y: -100 };
  if (w && vis > 0) {
    screen = toScreen(cam, w);
    const down = CLICKS.some((c) => t >= c && t < c + 0.12);
    const press = CLICKS.reduce((m, c) => { const u = prog(t, c - 0.04, c + 0.2); return u > 0 && u < 1 ? Math.max(m, Math.sin(u * Math.PI)) : m; }, 0);
    const size = 1.1 * Math.pow(cam.s, 0.35);
    cur.style.opacity = vis;
    cur.style.transform = `translate(${screen.x}px, ${screen.y}px)`;
    cur.querySelector("svg").style.transform = `scale(${size * (1 - press * 0.16)})`;
    cur.querySelector(".halo").style.transform = `scale(${size * (1 + press * 0.5)})`;
    cur.querySelector(".halo").style.opacity = 0.75 + press * 0.25;
    cur.dataset.down = down ? "1" : "";
  } else cur.style.opacity = 0;

  // click ripples, pinned to where the click happened
  const rip = $("ripples");
  rip.innerHTML = "";
  for (const c of CLICKS) {
    const u = prog(t, c, c + 0.55);
    if (u <= 0 || u >= 1) continue;
    const p = toScreen(cam, cursorWorld(c));
    const r = 8 + easeOut(u) * 46 * Math.pow(cam.s, 0.35);
    const ring = document.createElement("div");
    ring.className = "ripple";
    ring.style.transform = `translate(${p.x}px, ${p.y}px)`;
    ring.innerHTML = `<i style="left:${-r}px;top:${-r}px;width:${2 * r}px;height:${2 * r}px;opacity:${(1 - u) * 0.9};border-width:${3 * (1 - u) + 1}px"></i>`;
    rip.appendChild(ring);
  }

  // the flying copy takes over from the app's own duck
  const pop = app().getElementById("duck-pop");
  if (pop) pop.style.visibility = t >= 13.95 ? "hidden" : "";

  drawCaption(t);
  drawDucks(t, cam);
  drawOutro(t);
  return { mouse: screen, visible: vis > 0 };
}

window.seek = seek;
window.EVENTS = EVENTS;
window.DURATION = DURATION;
