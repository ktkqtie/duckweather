import { chromium } from "/private/tmp/claude-501/-Users-kt-Desktop-duckweather/80d22c14-0544-462e-bd82-e2eaf67f38bb/scratchpad/tools/node_modules/playwright-core/index.mjs";
import { serve } from "./server.mjs";
import { placeFor, airQuality, GEOCODE, isDenver } from "./mock.mjs";

export async function open({ port = 8731, gate = null } = {}) {
  const srv = await serve(port);
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--force-color-profile=srgb", "--hide-scrollbars", "--font-render-hinting=none"] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "no-preference" });
  const json = (route, body) => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
  // the new place's forecast is held until the timeline says it "arrives"
  const held = async (r) => { const lat = new URL(r.request().url()).searchParams.get("latitude"); if (gate && isDenver(lat)) await gate(); return lat; };
  await ctx.route("https://api.open-meteo.com/**", async (r) => json(r, placeFor(await held(r)).weather));
  await ctx.route("https://air-quality-api.open-meteo.com/**", async (r) => json(r, airQuality(placeFor(await held(r)))));
  await ctx.route("https://geocoding-api.open-meteo.com/**", (r) => json(r, { results: GEOCODE }));
  await ctx.route("https://api.bigdatacloud.net/**", (r) => r.abort());
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("pageerror", e.message));
  await page.goto(`http://localhost:${port}/`);
  const frame = page.frames().find((f) => f.url().includes("/app/"));
  await frame.waitForFunction(() => document.getElementById("city")?.textContent && document.getElementById("temp").textContent !== "--" && document.getElementById("duck").complete && document.getElementById("duck").naturalWidth > 0);
  await page.evaluate(() => document.fonts.ready);
  await frame.evaluate(() => document.fonts.ready);
  // the window is as tall as the whole page, so nothing needs scrolling
  const h = await frame.evaluate(() => document.documentElement.scrollHeight);
  await page.evaluate((h) => { document.getElementById("app").style.height = h + "px"; }, h);
  // no random blinks; the timeline blinks on cue
  await frame.evaluate(() => { window.blinkLoop = () => {}; });
  return { srv, browser, page, frame, appHeight: h };
}
