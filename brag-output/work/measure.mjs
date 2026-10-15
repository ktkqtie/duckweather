import { open } from "./browser.mjs";
const { srv, browser, page, frame, appHeight } = await open();
await page.waitForTimeout(400);
const r = await frame.evaluate(() => {
  const q = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)].join(","); };
  return Object.fromEntries(["#locate-btn", ".wordmark", "#city", ".duck-rig", ".now", ".temp", ".forecast", "#days li:nth-child(2)", "#days li:nth-child(4)", ".hourly", ".foot"].map((s) => [s, q(s)]));
});
console.log({ appHeight, ...r });
await page.screenshot({ path: "still-0.png" });
await browser.close(); srv.close();
