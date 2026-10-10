// One duck per 5°F band, 0°F through 100°F. Each band covers its starting
// degree up to (not including) the next one: 55 means 55–59.9°F.
// Below 0 uses the 0 duck; 100 and above uses the 100 duck.
//
// `img: null` means that band hasn't been drawn yet. It borrows the nearest
// drawn duck below it. To add one, save a transparent PNG as
// assets/ducks/duck-<band>.png and set its `img`.

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
  70:  { img: null, advice: "t-shirt weather :)" },
  75:  { img: null, advice: "perfect day for a walk" },
  80:  { img: null, advice: "shorts & sunnies!" },
  85:  { img: null, advice: "sunscreen, friend" },
  90:  { img: null, advice: "drink lots of water!" },
  95:  { img: null, advice: "find some shade" },
  100: { img: null, advice: "too hot. pond time." },
};

function duckForTemp(tempF) {
  const band = Math.min(100, Math.max(0, Math.floor(tempF / 5) * 5));
  let drawn = band;
  while (drawn > 0 && !DUCKS[drawn].img) drawn -= 5;
  return { band, advice: DUCKS[band].advice, img: DUCKS[drawn].img };
}
