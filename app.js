const DEFAULT_PLACE = { lat: 40.7282, lon: -73.7949, city: "New York", area: "Queens" };
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const $ = (id) => document.getElementById(id);

const store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode etc. */ }
  },
};

const state = {
  unit: store.get("dw.unit") === "C" ? "C" : "F",
  place: store.get("dw.place") || DEFAULT_PLACE,
  weather: null,
  aqi: null,
  aqiHourly: null,
  day: 0, // which forecast day is shown (0 = today, live)
  duckKey: null,
};

/* ---------- icons ---------- */

const ICONS = {
  sun: `<circle cx="16" cy="16" r="6" fill="var(--sun)" stroke="none"/><g stroke="var(--sun)"><path d="M16 3v3M16 26v3M3 16h3M26 16h3M6.8 6.8l2.1 2.1M23.1 23.1l2.1 2.1M6.8 25.2l2.1-2.1M23.1 8.9l2.1-2.1"/></g>`,
  moon: `<path d="M21 22.5A9 9 0 0 1 13.5 8a9 9 0 1 0 12.5 12 9 9 0 0 1-5 2.5z" fill="var(--sun)" stroke="none" opacity=".85"/>`,
  cloud: `<path d="M9.5 24h13a5 5 0 0 0 .6-10A7 7 0 0 0 9.8 15.6 4.2 4.2 0 0 0 9.5 24z" fill="var(--cloud)" stroke="none" opacity=".75"/>`,
  partly: `<circle cx="12" cy="12" r="5" fill="var(--sun)" stroke="none"/><g stroke="var(--sun)"><path d="M12 3v1.5M3 12h1.5M5.6 5.6l1 1M18.4 5.6l-1 1"/></g><path d="M11.5 26h11.5a4.5 4.5 0 0 0 .5-9A6.3 6.3 0 0 0 11.8 18.5 3.8 3.8 0 0 0 11.5 26z" fill="var(--cloud)" stroke="var(--surface)" stroke-width="1.5"/>`,
  "partly-night": `<path d="M15 14a6 6 0 0 1-6.5-8.5 6.5 6.5 0 1 0 8 8.2z" fill="var(--sun)" stroke="none" opacity=".85"/><path d="M11.5 26h11.5a4.5 4.5 0 0 0 .5-9A6.3 6.3 0 0 0 11.8 18.5 3.8 3.8 0 0 0 11.5 26z" fill="var(--cloud)" stroke="var(--surface)" stroke-width="1.5"/>`,
  fog: `<g stroke="var(--cloud)"><path d="M5 11h22M8 16h19M5 21h17M10 26h14"/></g>`,
  drizzle: `<path d="M9.5 19h13a5 5 0 0 0 .6-10A7 7 0 0 0 9.8 10.6 4.2 4.2 0 0 0 9.5 19z" fill="var(--cloud)" stroke="none" opacity=".75"/><g stroke="var(--rain)"><path d="M12 23v1.5M17 25v1.5M22 23v1.5"/></g>`,
  rain: `<path d="M9.5 18h13a5 5 0 0 0 .6-10A7 7 0 0 0 9.8 9.6 4.2 4.2 0 0 0 9.5 18z" fill="var(--cloud)" stroke="none" opacity=".75"/><g stroke="var(--rain)"><path d="M12 21l-1.5 5M17 21l-1.5 5M22 21l-1.5 5"/></g>`,
  snow: `<path d="M9.5 18h13a5 5 0 0 0 .6-10A7 7 0 0 0 9.8 9.6 4.2 4.2 0 0 0 9.5 18z" fill="var(--cloud)" stroke="none" opacity=".75"/><g fill="var(--rain)" stroke="none"><circle cx="11" cy="23" r="1.4"/><circle cx="16" cy="26" r="1.4"/><circle cx="21" cy="23" r="1.4"/></g>`,
  storm: `<path d="M9.5 18h13a5 5 0 0 0 .6-10A7 7 0 0 0 9.8 9.6 4.2 4.2 0 0 0 9.5 18z" fill="var(--cloud)" stroke="none" opacity=".85"/><path d="M17 19l-3.5 5h4l-2.5 5" stroke="var(--sun)"/>`,
  umbrella: `<path d="M4 16a12 12 0 0 1 24 0z" fill="var(--rain)" stroke="none" opacity=".8"/><path d="M16 16v8a2.5 2.5 0 0 1-5 0" stroke="var(--ink-2)"/>`,
  wind: `<g stroke="var(--cloud)"><path d="M4 12h14a3.5 3.5 0 1 0-3.5-3.5M4 17h19a3.5 3.5 0 1 1-3.5 3.5M4 22h9"/></g>`,
  swing: `<path d="M6 24l7-9 5 5 8-11" stroke="var(--accent)"/>`,
  leaf: `<path d="M8 24C8 13 15 7 26 6c0 11-6 18-17 18z" fill="#9bb07a" stroke="none"/><path d="M8 24l10-10" stroke="var(--surface)"/>`,
  smoke: `<g stroke="var(--cloud)"><path d="M6 22c4-4 8 4 12 0s6-3 8-1M8 14c3-3 6 3 9 0s5-2 7-1"/></g>`,
};

function icon(kind, cls = "ico") {
  return `<svg class="${cls}" viewBox="0 0 32 32" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[kind] || ICONS.cloud}</svg>`;
}

function describeCode(code, isDay = true) {
  if (code === 0) return { icon: isDay ? "sun" : "moon", text: "clear skies" };
  if (code === 1) return { icon: isDay ? "sun" : "moon", text: "mostly clear" };
  if (code === 2) return { icon: isDay ? "partly" : "partly-night", text: "partly cloudy" };
  if (code === 3) return { icon: "cloud", text: "overcast" };
  if (code === 45 || code === 48) return { icon: "fog", text: "foggy" };
  if (code >= 51 && code <= 57) return { icon: "drizzle", text: "drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { icon: "rain", text: code >= 80 ? "rain showers" : "rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: "snow", text: "snow" };
  if (code >= 95) return { icon: "storm", text: "thunderstorms" };
  return { icon: "cloud", text: "cloudy" };
}

function feelWord(tempF) {
  if (tempF < 20) return "frigid";
  if (tempF < 33) return "freezing";
  if (tempF < 45) return "cold";
  if (tempF < 62) return "chilly";
  if (tempF < 72) return "mild";
  if (tempF < 82) return "warm";
  if (tempF < 92) return "hot";
  return "scorching";
}

/* ---------- units & formatting ---------- */

const toUnit = (f) => Math.round(state.unit === "F" ? f : ((f - 32) * 5) / 9);

// Open-Meteo returns local times like "2026-09-24T14:00" — parse without timezone shifts.
function parseLocal(iso) {
  const [d, t = "00:00"] = iso.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [h, min] = t.split(":").map(Number);
  return { y, m, day, h, min, weekday: new Date(y, m - 1, day).getDay() };
}

function hourLabel(h) {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function compass(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function aqiLabel(v) {
  if (v <= 50) return "good — breathe easy";
  if (v <= 100) return "moderate";
  if (v <= 150) return "unhealthy for sensitive groups";
  if (v <= 200) return "unhealthy";
  if (v <= 300) return "very unhealthy";
  return "hazardous";
}

function uvLabel(v) {
  if (v < 3) return "low";
  if (v < 6) return "moderate — sunscreen helps";
  if (v < 8) return "high — wear sunscreen";
  if (v < 11) return "very high — seek shade";
  return "extreme";
}

/* ---------- data ---------- */

async function fetchWeather({ lat, lon }) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day",
    hourly: "temperature_2m,uv_index",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset,wind_speed_10m_max,wind_direction_10m_dominant",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "ms",
    timezone: "auto",
    forecast_days: "6",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`forecast ${res.status}`);
  return res.json();
}

async function fetchAirQuality({ lat, lon }) {
  const params = new URLSearchParams({ latitude: lat, longitude: lon, current: "us_aqi", hourly: "us_aqi", forecast_days: "6", timezone: "auto" });
  const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`);
  if (!res.ok) throw new Error(`air quality ${res.status}`);
  const data = await res.json();
  return { now: data.current?.us_aqi ?? null, hourly: data.hourly ?? null };
}

async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({ latitude: lat, longitude: lon, localityLanguage: "en" });
  const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`);
  if (!res.ok) throw new Error(`geocode ${res.status}`);
  const d = await res.json();
  const city = d.city || d.locality || d.principalSubdivision || "Somewhere";
  const area = d.locality && d.locality !== city ? d.locality : d.principalSubdivision || d.countryName || "";
  return { city, area };
}

async function load() {
  document.body.classList.add("loading");
  setStatus("fetching the forecast…");
  try {
    const [weather, aqi] = await Promise.all([
      fetchWeather(state.place),
      fetchAirQuality(state.place).catch(() => null),
    ]);
    state.weather = weather;
    state.aqi = aqi?.now ?? null;
    state.aqiHourly = aqi?.hourly ?? null;
    render();
    setStatus(`updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · weather by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>`);
  } catch (err) {
    console.error(err);
    setStatus(`couldn't reach the weather service. <a href="#" id="retry">try again</a>`);
    $("retry")?.addEventListener("click", (e) => { e.preventDefault(); load(); });
    $("feel").textContent = "no signal";
  } finally {
    document.body.classList.remove("loading");
  }
}

function setStatus(html) {
  $("status").innerHTML = html;
}

/* ---------- render ---------- */

function currentHourIndex(w) {
  const hourKey = w.current.time.slice(0, 13) + ":00";
  const i = w.hourly.time.indexOf(hourKey);
  return i === -1 ? 0 : i;
}

function render() {
  const w = state.weather;
  if (!w) return;
  const { current, daily, hourly } = w;
  // the hero and cards show the picked day; day 0 is the live "right now" view
  const day = Math.min(state.day, daily.time.length - 1);
  const live = day === 0;
  const idx = currentHourIndex(w);
  const date = parseLocal(daily.time[day]);

  $("city").textContent = state.place.city;
  $("area").textContent = state.place.area;
  document.title = `${Math.round(toUnit(current.temperature_2m))}° ${state.place.city} · duckweather`;

  // hero: right now for today, the forecast high for other days
  const temp = live ? current.temperature_2m : daily.temperature_2m_max[day];
  const code = live ? current.weather_code : daily.weather_code[day];
  const cond = describeCode(code, live ? current.is_day === 1 : true);
  $("temp").textContent = toUnit(temp);
  $("cond-icon").innerHTML = icon(cond.icon, "");
  $("feel").textContent = feelWord(temp);
  $("cond").textContent = cond.text;
  $("hi").textContent = toUnit(daily.temperature_2m_max[day]);
  $("lo").textContent = toUnit(daily.temperature_2m_min[day]);
  $("day-name").textContent = live ? "today" : WEEKDAYS[date.weekday];
  $("date").textContent = `${MONTHS[date.m - 1]} ${date.day}`;
  updateDayNight(w);
  renderDuck(temp, code);

  // cards
  renderDays(daily, day);
  if (live) renderChart(hourly.time.slice(0, 24), hourly.temperature_2m.slice(0, 24), idx < 24 ? idx : -1, "today");
  else renderChart(hourly.time.slice(day * 24, day * 24 + 24), hourly.temperature_2m.slice(day * 24, day * 24 + 24), -1, `on ${WEEKDAYS[date.weekday]}`);

  const uv = (live ? hourly.uv_index[idx] : daily.uv_index_max?.[day]) ?? 0;
  $("uv").textContent = Math.round(uv);
  $("uv-knob").style.left = `${Math.min(100, (uv / 11) * 100)}%`;
  $("uv-label").textContent = uvLabel(uv);

  const windSpeed = live ? current.wind_speed_10m : daily.wind_speed_10m_max?.[day] ?? 0;
  const windFrom = live ? current.wind_direction_10m : daily.wind_direction_10m_dominant?.[day] ?? 0;
  $("wind").textContent = windSpeed.toFixed(1);
  // wind_direction is where it blows FROM; the arrow points where it's going
  $("wind-arrow").style.transform = `rotate(${windFrom + 180}deg)`;
  $("wind-dir").textContent = `from the ${compass(windFrom)}`;

  const aqi = live ? state.aqi : dayAqi(daily.time[day]);
  if (aqi != null) {
    $("aqi").textContent = Math.round(aqi);
    $("aqi-knob").style.left = `${Math.min(100, (aqi / 300) * 100)}%`;
    $("aqi-label").textContent = aqiLabel(aqi) + (live ? "" : " at worst");
  } else {
    $("aqi").textContent = "--";
    $("aqi-label").textContent = "not available here";
  }

  renderAlerts();
}

// worst hourly air quality forecast on a given date (YYYY-MM-DD)
function dayAqi(date) {
  const h = state.aqiHourly;
  if (!h) return null;
  const vals = h.time.map((t, i) => (t.startsWith(date) ? h.us_aqi[i] : null)).filter((v) => v != null);
  return vals.length ? Math.max(...vals) : null;
}

function renderDuck(tempF, weatherCode) {
  const duck = pickDuck(tempF, weatherCode);
  const img = $("duck");
  img.alt = duck.key === "rain" ? "The weather duck under an umbrella" : `The weather duck, dressed for ${Math.round(tempF)}°F`;
  if (duck.key === state.duckKey) return;
  state.duckKey = duck.key;
  img.src = duck.img;
  buildBlink(duck);
  // replay the entrance animation
  const pop = $("duck-pop");
  pop.classList.remove("swap");
  void pop.offsetWidth;
  pop.classList.add("swap");
}

$("duck-pop").addEventListener("animationend", (e) => {
  if (e.animationName === "swap") e.currentTarget.classList.remove("swap");
});

/* ---------- blinking ---------- */

const DUCK_W = 900;
const DUCK_H = 1062;
const pct = (v, of) => `${(v / of) * 100}%`;

// For each eye: a lid (face-colored oval over the drawn eye) and, on top, a copy of the
// duck image clipped to just that eye. At rest the copy looks exactly like the drawing;
// a blink squashes it. Nothing is added until the copies have loaded, so the duck is
// never shown without eyes.
async function buildBlink(duck) {
  const box = $("blink");
  box.replaceChildren();
  const spec = BLINKS[duck.key];
  if (!spec) return;
  const parts = [];
  const eyes = [];
  for (const e of spec.eyes) {
    const lid = document.createElement("span");
    lid.className = "lid";
    Object.assign(lid.style, {
      left: pct(e.x, DUCK_W), top: pct(e.y, DUCK_H),
      width: pct(e.w, DUCK_W), height: pct(e.h, DUCK_H),
      background: spec.face,
    });
    const eye = document.createElement("img");
    eye.className = "eye";
    eye.src = duck.img;
    eye.alt = "";
    eye.style.clipPath = `inset(${pct(e.y, DUCK_H)} ${pct(DUCK_W - e.x - e.w, DUCK_W)} ${pct(DUCK_H - e.y - e.h, DUCK_H)} ${pct(e.x, DUCK_W)})`;
    eye.style.transformOrigin = `${pct(e.x + e.w / 2, DUCK_W)} ${pct(e.y + e.h / 2, DUCK_H)}`;
    parts.push(lid, eye);
    eyes.push(eye);
  }
  try {
    await Promise.all([$("duck"), ...eyes].map((img) => img.decode()));
  } catch {
    return;
  }
  if (state.duckKey === duck.key) box.replaceChildren(...parts);
}

// Same blink as the portfolio duck (a little more often: every 1.5–3.5s).
function blink() {
  for (const eye of $("blink").querySelectorAll(".eye")) {
    eye.animate(
      [{ transform: "scaleY(1)" }, { transform: "scaleY(0.08)", offset: 0.45 }, { transform: "scaleY(1)" }],
      { duration: 170, easing: "ease-in-out" }
    );
  }
}

function blinkLoop() {
  setTimeout(() => { blink(); blinkLoop(); }, 1500 + Math.random() * 2000);
}

function renderDays(daily, selected = 0) {
  const allMin = Math.min(...daily.temperature_2m_min);
  const allMax = Math.max(...daily.temperature_2m_max);
  const span = Math.max(1, allMax - allMin);
  $("days").innerHTML = daily.time
    .map((t, i) => {
      const d = parseLocal(t);
      const lo = daily.temperature_2m_min[i];
      const hi = daily.temperature_2m_max[i];
      const c = describeCode(daily.weather_code[i]);
      const left = ((lo - allMin) / span) * 100;
      const width = ((hi - lo) / span) * 100;
      const rain = daily.precipitation_probability_max?.[i];
      const name = i === 0 ? "today" : WEEKDAYS[d.weekday];
      return `<li><button type="button" class="day${i === selected ? " selected" : ""}" data-i="${i}" aria-pressed="${i === selected}" title="${c.text}" aria-label="${name}: ${c.text}, ${toUnit(lo)}° to ${toUnit(hi)}°">
        <span class="name">${name}</span>
        ${icon(c.icon)}
        <span class="lo">${toUnit(lo)}°</span>
        <span class="range"><span style="left:${left}%;width:${Math.max(width, 4)}%"></span></span>
        <span class="hi">${toUnit(hi)}°</span>
      </button></li>`;
    })
    .join("");
}

// pressing a day shows it up top; "today" goes back to the live view
$("days").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-i]");
  if (!btn) return;
  state.day = +btn.dataset.i;
  render();
  $("days").querySelector(`[data-i="${state.day}"]`)?.focus(); // the rows were redrawn
});

/* ---------- hourly chart ---------- */

let chartData = null;

function renderChart(times, temps, nowIdx, label = "today") {
  chartData = { times, temps, nowIdx, label };
  drawChart();
}

function drawChart() {
  if (!chartData) return;
  const el = $("chart");
  const { times, temps, nowIdx, label } = chartData;
  const W = el.clientWidth;
  const H = el.clientHeight;
  if (!W || !H) return;

  const pad = { t: 22, r: 10, b: 26, l: 34 };
  const vals = temps.map(toUnit);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const lo = min - 2;
  const hi = max + 2;
  const x = (i) => pad.l + (i / (vals.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const pts = vals.map((v, i) => [x(i), y(v)]);

  // Catmull-Rom -> cubic bezier for a soft line
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  const base = H - pad.b;
  const area = `${d} L${pts.at(-1)[0]},${base} L${pts[0][0]},${base} Z`;

  const ticks = [0, 6, 12, 18, 23];
  const yTicks = [min, Math.round((min + max) / 2), max].filter((v, i, a) => a.indexOf(v) === i);

  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Hourly temperature ${label}, from ${min}° to ${max}°">
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="var(--accent)" stop-opacity=".22"/>
          <stop offset="1" stop-color="var(--accent)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${yTicks.map((v) => `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}°</text>`).join("")}
      ${ticks.map((i) => `<text class="axis" x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === 23 ? "end" : "middle"}">${hourLabel(i)}</text>`).join("")}
      <path d="${area}" fill="url(#area-fill)"/>
      <path class="line" d="${d}"/>
      ${nowIdx >= 0 ? `<circle class="now-dot" cx="${pts[nowIdx][0]}" cy="${pts[nowIdx][1]}" r="5"/><text class="axis" x="${pts[nowIdx][0] + (nowIdx > 20 ? -10 : 0)}" y="${pts[nowIdx][1] + (nowIdx > 20 ? 18 : -10)}" text-anchor="${nowIdx > 20 ? "end" : nowIdx < 3 ? "start" : "middle"}">now</text>` : ""}
      <g class="hover" visibility="hidden">
        <line class="cross" y1="${pad.t}" y2="${base}"/>
        <circle class="hover-dot" r="5"/>
      </g>
      <rect x="${pad.l}" y="0" width="${W - pad.l - pad.r}" height="${H}" fill="transparent" class="hit"/>
    </svg>
    <div class="tip" hidden></div>`;

  const svg = el.querySelector("svg");
  const hover = svg.querySelector(".hover");
  const cross = hover.querySelector(".cross");
  const dot = hover.querySelector(".hover-dot");
  const tip = el.querySelector(".tip");

  const show = (evt) => {
    const rect = svg.getBoundingClientRect();
    const px = ((evt.clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(vals.length - 1, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (vals.length - 1))));
    const [cx, cy] = pts[i];
    hover.setAttribute("visibility", "visible");
    cross.setAttribute("x1", cx);
    cross.setAttribute("x2", cx);
    dot.setAttribute("cx", cx);
    dot.setAttribute("cy", cy);
    tip.hidden = false;
    tip.textContent = `${hourLabel(parseLocal(times[i]).h)} · ${vals[i]}°`;
    tip.style.left = `${(cx / W) * 100}%`;
    tip.style.top = `${(cy / H) * 100}%`;
  };
  const hide = () => {
    hover.setAttribute("visibility", "hidden");
    tip.hidden = true;
  };
  svg.addEventListener("pointermove", show);
  svg.addEventListener("pointerdown", show);
  svg.addEventListener("pointerleave", hide);
}

new ResizeObserver(() => drawChart()).observe($("chart"));

/* ---------- heads-up (bell) ---------- */

function buildAlerts() {
  const w = state.weather;
  if (!w) return [];
  const { daily, current } = w;
  const out = [];
  const rain = daily.precipitation_probability_max?.[0] ?? 0;
  if (rain >= 40) out.push({ icon: "umbrella", text: `<b>${rain}% chance of rain</b> today — bring an umbrella.` });
  const uvMax = daily.uv_index_max?.[0] ?? 0;
  if (uvMax >= 6) out.push({ icon: "sun", text: `<b>UV peaks at ${Math.round(uvMax)}</b> — sunscreen before you head out.` });
  const swing = daily.temperature_2m_max[0] - daily.temperature_2m_min[0];
  if (swing >= 18) out.push({ icon: "swing", text: `<b>Big temperature swing</b> (${Math.round(swing)}°F) — dress in layers.` });
  if (current.wind_speed_10m >= 9) out.push({ icon: "wind", text: `<b>Windy</b> at ${current.wind_speed_10m.toFixed(1)} m/s — hold onto your hat.` });
  if (state.aqi != null && state.aqi > 100) out.push({ icon: "smoke", text: `<b>Air quality is ${aqiLabel(state.aqi)}</b> — take it easy outside.` });
  const snowDay = daily.weather_code.findIndex((c, i) => i > 0 && ((c >= 71 && c <= 77) || c === 85 || c === 86));
  if (snowDay > 0) out.push({ icon: "snow", text: `<b>Snow</b> in the forecast on ${WEEKDAYS[parseLocal(daily.time[snowDay]).weekday]}.` });
  return out;
}

function renderAlerts() {
  const alerts = buildAlerts();
  $("bell-dot").hidden = alerts.length === 0;
  $("alerts-list").innerHTML = alerts.length
    ? alerts.map((a) => `<li>${icon(a.icon)}<span>${a.text}</span></li>`).join("")
    : `<li>${icon("leaf")}<span>All calm on the pond. Nothing to worry about today.</span></li>`;
}

function toggleAlerts(open) {
  const pop = $("alerts");
  const willOpen = open ?? pop.hidden;
  pop.hidden = !willOpen;
  $("bell-btn").setAttribute("aria-expanded", String(willOpen));
}

$("bell-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  togglePlaces(false);
  toggleAlerts();
});
document.addEventListener("click", (e) => {
  if (!$("alerts").hidden && !e.target.closest(".bell-wrap")) toggleAlerts(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") toggleAlerts(false);
});

/* ---------- units ---------- */

function syncUnitButton() {
  const btn = $("unit-btn");
  btn.textContent = `°${state.unit}`;
  btn.setAttribute("aria-label", `Switch to ${state.unit === "F" ? "Celsius" : "Fahrenheit"}`);
}

$("unit-btn").addEventListener("click", () => {
  state.unit = state.unit === "F" ? "C" : "F";
  store.set("dw.unit", state.unit);
  syncUnitButton();
  render();
});

/* ---------- day / night ---------- */

// The page is light while the sun is up at the place being shown and dark after it
// sets, switching right at sunrise and sunset (not just on the next refresh).
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let sunTimer;

// Sunrises and sunsets as [timestamp, theme], soonest first. The API gives them in the
// place's local time, so shift by its UTC offset to get real moments.
function sunEvents(w) {
  const at = (local) => Date.parse(`${local}Z`) - w.utc_offset_seconds * 1000;
  return [
    ...(w.daily.sunrise || []).map((t) => [at(t), "light"]),
    ...(w.daily.sunset || []).map((t) => [at(t), "dark"]),
  ].filter(([t]) => Number.isFinite(t)).sort((a, b) => a[0] - b[0]);
}

function themeAt(w, time) {
  const events = sunEvents(w);
  const past = events.filter(([t]) => t <= time);
  if (past.length) return past[past.length - 1][1];
  if (events.length) return events[0][1] === "light" ? "dark" : "light"; // before the first sunrise
  return w.current.is_day ? "light" : "dark"; // no sunrise/sunset (polar day or night)
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  const apply = () => {
    root.dataset.theme = theme;
    store.set("dw.theme", theme);
  };
  // fade the whole page over, unless this is the very first theme being set
  if (root.dataset.theme && document.startViewTransition && !reducedMotion.matches) document.startViewTransition(apply);
  else apply();
}

function updateDayNight(w) {
  applyTheme(themeAt(w, Date.now()));
  clearTimeout(sunTimer);
  const next = sunEvents(w).find(([t]) => t > Date.now());
  if (next) {
    sunTimer = setTimeout(() => {
      applyTheme(next[1]);
      updateDayNight(w);
    }, Math.min(next[0] - Date.now() + 1000, 2 ** 31 - 1));
  }
}

/* ---------- location ---------- */

// The location button opens a small "where to?" panel: search any city (Open-Meteo's
// geocoder), pick a recent place, or use the device's location.
const RECENTS_KEY = "dw.recent";
let searchTimer;
let searchSeq = 0;

function setPlace(place) {
  state.place = place;
  state.day = 0;
  store.set("dw.place", place);
  const recents = (store.get(RECENTS_KEY) || []).filter((p) => !(p.city === place.city && p.area === place.area));
  store.set(RECENTS_KEY, [place, ...recents].slice(0, 4));
  togglePlaces(false);
  load();
}

function togglePlaces(open) {
  const pop = $("places");
  const willOpen = open ?? pop.hidden;
  pop.hidden = !willOpen;
  $("locate-btn").setAttribute("aria-expanded", String(willOpen));
  if (willOpen) {
    toggleAlerts(false);
    $("place-q").value = "";
    showRecents();
    $("place-q").focus();
  }
}

// Recent places get a × to forget them.
function listPlaces(places, { recent = false } = {}) {
  $("place-results").innerHTML = places
    .map((p, i) => `<li>
      <button type="button" data-i="${i}"><span class="name">${escapeHtml(p.city)}</span><span class="where">${escapeHtml(p.area)}</span></button>
      ${recent ? `<button class="forget" type="button" data-forget="${i}" aria-label="Remove ${escapeHtml(p.city)} from recent" title="Remove">×</button>` : ""}
    </li>`)
    .join("");
  $("place-results").onclick = (e) => {
    e.stopPropagation(); // the list re-renders, so don't let the outside-click check see a detached button
    const forget = e.target.closest("button[data-forget]");
    if (forget) {
      store.set(RECENTS_KEY, places.filter((_, i) => i !== +forget.dataset.forget));
      showRecents();
      $("place-q").focus();
      return;
    }
    const btn = e.target.closest("button[data-i]");
    if (btn) setPlace(places[+btn.dataset.i]);
  };
}

function showRecents() {
  const recents = store.get(RECENTS_KEY) || [];
  $("place-label").hidden = recents.length === 0;
  listPlaces(recents, { recent: true });
}

function showNote(text) {
  $("place-label").hidden = true;
  $("place-results").innerHTML = `<li class="note">${text}</li>`;
}

async function searchPlaces(query) {
  const seq = ++searchSeq;
  const params = new URLSearchParams({ name: query, count: 6, language: "en", format: "json" });
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
    if (!res.ok) throw new Error(`search ${res.status}`);
    const { results = [] } = await res.json();
    if (seq !== searchSeq) return; // a newer search has started
    if (!results.length) return showNote("no places found — try another spelling?");
    $("place-label").hidden = true;
    listPlaces(results.map((r) => ({
      lat: +r.latitude.toFixed(4),
      lon: +r.longitude.toFixed(4),
      city: r.name,
      area: [r.admin1, r.country].filter((x, i, all) => x && all.indexOf(x) === i && x !== r.name).join(", "),
    })));
  } catch (err) {
    console.warn(err);
    if (seq === searchSeq) showNote("couldn't search right now.");
  }
}

function escapeHtml(text = "") {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

$("locate-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  togglePlaces();
});

$("place-q").addEventListener("input", () => {
  const q = $("place-q").value.trim();
  clearTimeout(searchTimer);
  if (q.length < 2) {
    searchSeq++;
    showRecents();
    return;
  }
  searchTimer = setTimeout(() => searchPlaces(q), 250);
});

$("place-clear").addEventListener("click", (e) => {
  e.stopPropagation();
  store.set(RECENTS_KEY, []);
  showRecents();
  $("place-q").focus();
});

// Enter picks the first result
$("place-q").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("place-results").querySelector("button")?.click();
});

$("place-here").addEventListener("click", () => {
  if (!("geolocation" in navigator)) {
    showNote("your browser can't share its location.");
    return;
  }
  const btn = $("locate-btn");
  btn.classList.add("busy");
  togglePlaces(false);
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = +pos.coords.latitude.toFixed(4);
      const lon = +pos.coords.longitude.toFixed(4);
      let names = { city: "Your spot", area: `${lat.toFixed(2)}, ${lon.toFixed(2)}` };
      try { names = await reverseGeocode(lat, lon); } catch (err) { console.warn(err); }
      btn.classList.remove("busy");
      setPlace({ lat, lon, ...names });
    },
    (err) => {
      btn.classList.remove("busy");
      setStatus(err.code === err.PERMISSION_DENIED ? "location permission was denied — showing the last place." : "couldn't find your location.");
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
  );
});

document.addEventListener("click", (e) => {
  if (!$("places").hidden && !e.target.closest("#places")) togglePlaces(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("places").hidden) {
    togglePlaces(false);
    $("locate-btn").focus();
  }
});

/* ---------- go ---------- */

syncUnitButton();
if (!reducedMotion.matches) blinkLoop();
load();
setInterval(load, 15 * 60 * 1000);
