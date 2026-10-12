# duckweather

Weather, as told by a duck. The duck changes outfit every 5°F (0–100°F).

## Run

```sh
python3 -m http.server 8642
```

Then open http://localhost:8642. Use a local server rather than opening the file directly, because the browser only allows location access on `localhost` or HTTPS.

## Ducks

Each 5°F band has its own duck: `assets/ducks/duck-55.png` shows for 55–59.9°F. When it's raining, `duck-rain.png` shows instead. Speech-bubble text for each duck is in `ducks.js`.

The full-size source art lives in `assets/bbs/` (named like `55-60.png` and `rain.png`, all on the same 1640×2360 canvas). It's kept out of git. To regenerate the web copies after changing a drawing:

```sh
python3 -c "
from PIL import Image
for b in range(0, 100, 5):
    Image.open(f'assets/bbs/{b}-{b+5}.png').convert('RGBA').crop((140,263,1461,1822)).resize((900,1062), Image.LANCZOS).save(f'assets/ducks/duck-{b}.png', optimize=True)
Image.open('assets/bbs/rain.png').convert('RGBA').crop((140,263,1461,1822)).resize((900,1062), Image.LANCZOS).save('assets/ducks/duck-rain.png', optimize=True)
"
```

Data comes from [Open-Meteo](https://open-meteo.com/) (forecast and air quality, no API key needed) and BigDataCloud (place names for "use my location").
