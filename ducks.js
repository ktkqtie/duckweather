// One duck per 5°F band, 0°F through 100°F. Each band covers its starting
// degree up to (not including) the next one: 55 means 55–59.9°F.
// Below 0 uses the 0–5 duck; 95 and above uses the 95–100 duck.
//
// When it's raining, the rain duck shows instead, whatever the temperature.
//
// Source art lives in assets/bbs/ (named like 55-60.png); the files here in
// assets/ducks/ are the cropped, resized web copies (see README).

const duck = (band) => `assets/ducks/duck-${band}.png`;

const DUCKS = {
  0:   { img: duck(0), advice: "frozen solid. stay in!" },
  5:   { img: duck(5), advice: "trapper hat + big puffer" },
  10:  { img: duck(10), advice: "beanie, scarf & puffer!" },
  15:  { img: duck(15), advice: "pom-pom hat + scarf time" },
  20:  { img: duck(20), advice: "fur hood up, friend" },
  25:  { img: duck(25), advice: "hood up, scarf on" },
  30:  { img: duck(30), advice: "fuzzy hat + cozy coat" },
  35:  { img: duck(35), advice: "puffer + striped scarf" },
  40:  { img: duck(40), advice: "puffy coat & a beanie" },
  45:  { img: duck(45), advice: "beret + puffer jacket" },
  50:  { img: duck(50), advice: "cap + a warm jacket" },
  55:  { img: duck(55), advice: "beanie + a light scarf" },
  60:  { img: duck(60), advice: "trench coat weather" },
  65:  { img: duck(65), advice: "light jacket's plenty" },
  70:  { img: duck(70), advice: "cardigan + a cute bow" },
  75:  { img: duck(75), advice: "overalls + sunnies!" },
  80:  { img: duck(80), advice: "sun hat & breezy clothes" },
  85:  { img: duck(85), advice: "bandana + shorts!" },
  90:  { img: duck(90), advice: "tank top. hydrate!" },
  95:  { img: duck(95), advice: "too hot for a shirt!" },
};

const RAIN_DUCK = { img: "assets/ducks/duck-rain.png", advice: "grab an umbrella!" };

// Blinking. Each duck's open eyes (boxes in px on the 900×1062 image) and the face
// color around them: to blink, the real eyes are covered in that color while copies
// of them squash shut. The 0, 5 and 10 ducks already have their eyes closed.
const EYES = [{ x: 326, y: 349, w: 57, h: 51 }, { x: 500, y: 349, w: 57, h: 51 }];
const BLINKS = {
  15: { face: "#c3edff", eyes: [{ x: 334, y: 367, w: 57, h: 46 }, { x: 508, y: 367, w: 57, h: 46 }] },
  rain: { face: "#fae485", eyes: [{ x: 457, y: 472, w: 51, h: 46 }, { x: 608, y: 472, w: 52, h: 46 }] },
};
for (let band = 20; band <= 95; band += 5) {
  BLINKS[band] = { face: band < 70 ? "#ffec8a" : "#fae485", eyes: EYES };
}

// WMO weather codes: drizzle, rain (incl. freezing), rain showers, thunderstorms.
function isRaining(code) {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
}

function pickDuck(tempF, weatherCode) {
  if (isRaining(weatherCode)) return { key: "rain", ...RAIN_DUCK };
  const band = Math.min(95, Math.max(0, Math.floor(tempF / 5) * 5));
  return { key: band, ...DUCKS[band] };
}
