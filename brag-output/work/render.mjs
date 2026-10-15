// node render.mjs              -> full render to video.mp4 (no audio)
// node render.mjs 1.0,4.6,...  -> just save stills at those times (still-<t>.png)
import { spawn } from "node:child_process";
import { open } from "./browser.mjs";
const FFMPEG = "/private/tmp/claude-501/-Users-kt-Desktop-duckweather/80d22c14-0544-462e-bd82-e2eaf67f38bb/scratchpad/tools/node_modules/ffmpeg-static/ffmpeg";
const FPS = 30;
const stills = process.argv[2] ? process.argv[2].split(",").map(Number) : null;

let release;
const arrived = new Promise((r) => (release = r));
const { srv, browser, page, frame } = await open({ gate: () => arrived });

const FREEZE = () => {
  // pin every CSS/WAAPI animation to video time, counted from when it first appeared
  window.__born ??= new WeakMap();
  window.__freeze = (t) => {
    for (const a of document.getAnimations()) {
      if (!window.__born.has(a)) window.__born.set(a, t);
      a.pause();
      a.currentTime = Math.max(0, (t - window.__born.get(a)) * 1000);
    }
  };
};
await page.evaluate(FREEZE);
await frame.evaluate(FREEZE);
const events = await page.evaluate(() => window.EVENTS);
const duration = await page.evaluate(() => window.DURATION);
const total = Math.round(duration * FPS);

let ff;
if (!stills) {
  ff = spawn(FFMPEG, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "video.mp4"], { stdio: ["pipe", "inherit", "inherit"] });
}

const settle = () => frame.evaluate(async () => {
  await Promise.all([...document.images].filter((i) => i.src && !i.complete).map((i) => i.decode().catch(() => {})));
});

let prev = -1;
const t0 = Date.now();
for (let f = 0; f < total; f++) {
  const t = f / FPS;
  const { mouse } = await page.evaluate((t) => window.seek(t), t);
  await page.mouse.move(mouse.x, mouse.y);
  for (const e of events.filter((e) => e.t > prev && e.t <= t)) {
    if (e.type === "down") await page.mouse.down();
    else if (e.type === "up") await page.mouse.up();
    else if (e.type === "key") { await page.keyboard.type(e.ch); await page.waitForTimeout(320); }
    else if (e.type === "blink") await frame.evaluate(() => blink());
    else if (e.type === "release") {
      release();
      await frame.waitForFunction(() => document.getElementById("city").textContent === "Denver" && !document.body.classList.contains("loading"));
    }
    if (e.type === "up") await page.waitForTimeout(80);
  }
  prev = t;
  await settle();
  // re-run seek so anything that moved after the events (re-rendered rows) is tracked
  await page.evaluate((t) => window.seek(t), t);
  await frame.evaluate((t) => window.__freeze(t), t);
  await page.evaluate((t) => window.__freeze(t), t);
  if (stills) {
    if (stills.some((s) => Math.abs(s - t) < 0.5 / FPS)) await page.screenshot({ path: `still-${t.toFixed(2)}.png` });
    if (t > Math.max(...stills)) break;
  } else {
    const buf = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 60 === 0) console.log(`frame ${f}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}
if (ff) { ff.stdin.end(); await new Promise((r) => ff.on("close", r)); }
await browser.close();
srv.close();
