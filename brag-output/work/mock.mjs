// Deterministic, fictional weather for the video (Open-Meteo response shapes).
const DAYS = ["2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"];
const iso = (ms) => new Date(ms).toISOString().slice(0, 16);

function forecast({ now, code, isDay = 1, wind, windDir, days }) {
  const times = [], temps = [], uv = [];
  days.forEach((d, i) => {
    for (let h = 0; h < 24; h++) {
      times.push(`${DAYS[i]}T${String(h).padStart(2, "0")}:00`);
      // coolest near 6am, warmest near 3pm
      const k = (1 - Math.cos(((h - 5) / 24) * 2 * Math.PI)) / 2;
      const w = h >= 5 && h <= 15 ? Math.sin(((h - 5) / 10) * (Math.PI / 2)) : h > 15 ? 1 - (h - 15) / 14 : 0.05 * h;
      temps.push(+(d.lo + (d.hi - d.lo) * Math.max(0, Math.min(1, w * 0.9 + k * 0.1))).toFixed(1));
      uv.push(h > 7 && h < 18 ? +(d.uv * Math.sin(((h - 7) / 11) * Math.PI)).toFixed(1) : 0);
    }
  });
  // daytime at render time, whenever the video is rendered (utc offset 0)
  const t0 = Date.now();
  return {
    utc_offset_seconds: 0,
    current: { time: `${DAYS[0]}T14:00`, temperature_2m: now, weather_code: code, wind_speed_10m: wind, wind_direction_10m: windDir, is_day: isDay },
    hourly: { time: times, temperature_2m: temps, uv_index: uv },
    daily: {
      time: DAYS,
      weather_code: days.map((d) => d.code),
      temperature_2m_max: days.map((d) => d.hi),
      temperature_2m_min: days.map((d) => d.lo),
      precipitation_probability_max: days.map((d) => d.rain),
      uv_index_max: days.map((d) => d.uv),
      sunrise: days.map((_, i) => iso(t0 - 5 * 3600e3 + i * 864e5)),
      sunset: days.map((_, i) => iso(t0 + 6 * 3600e3 + i * 864e5)),
      wind_speed_10m_max: days.map((d) => d.wind),
      wind_direction_10m_dominant: days.map(() => windDir),
    },
  };
}

export const PLACES = {
  nyc: {
    weather: forecast({ now: 47, code: 2, wind: 3.8, windDir: 300, days: [
      { hi: 52, lo: 41, code: 2, rain: 10, uv: 3, wind: 4 },
      { hi: 55, lo: 44, code: 1, rain: 5, uv: 3, wind: 3 },
      { hi: 50, lo: 42, code: 3, rain: 20, uv: 2, wind: 5 },
      { hi: 48, lo: 40, code: 61, rain: 70, uv: 1, wind: 6 },
      { hi: 53, lo: 43, code: 2, rain: 10, uv: 3, wind: 4 },
      { hi: 56, lo: 45, code: 0, rain: 0, uv: 3, wind: 3 },
    ] }),
    aqi: 38,
  },
  denver: {
    weather: forecast({ now: 37, code: 1, wind: 4.1, windDir: 340, days: [
      { hi: 44, lo: 29, code: 1, rain: 5, uv: 3, wind: 5 },
      { hi: 42, lo: 33, code: 63, rain: 80, uv: 2, wind: 6 },
      { hi: 48, lo: 31, code: 2, rain: 10, uv: 3, wind: 4 },
      { hi: 33, lo: 24, code: 73, rain: 65, uv: 1, wind: 7 },
      { hi: 55, lo: 32, code: 0, rain: 0, uv: 4, wind: 3 },
      { hi: 58, lo: 35, code: 0, rain: 0, uv: 4, wind: 3 },
    ] }),
    aqi: 31,
  },
};

export const GEOCODE = [
  { name: "Denver", latitude: 39.7392, longitude: -104.9847, admin1: "Colorado", country: "United States" },
  { name: "Denver City", latitude: 32.9645, longitude: -102.8291, admin1: "Texas", country: "United States" },
];

// New York sits at 40.73°N; Denver at 39.74°N
export const isDenver = (lat) => Number(lat) < 40.2;
export function placeFor(lat) {
  return isDenver(lat) ? PLACES.denver : PLACES.nyc;
}

export function airQuality(p) {
  const n = p.weather.hourly.time.length;
  return { current: { us_aqi: p.aqi }, hourly: { time: p.weather.hourly.time, us_aqi: Array.from({ length: n }, (_, i) => p.aqi + Math.round(6 * Math.sin(i / 5))) } };
}
