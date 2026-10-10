# duckweather

Weather, as told by a duck. The duck changes outfit every 5°F (0–100°F).

## Run

```sh
python3 -m http.server 8642
```

Then open http://localhost:8642. Use a local server rather than opening the file directly, because the browser only allows location access on `localhost` or HTTPS.

## Adding ducks

Each 5°F band has its own duck: `assets/ducks/duck-55.png` shows for 55–59.9°F. Bands without a drawing yet borrow the nearest duck below them.

1. Export the duck as a transparent PNG on the same 1640×2360 canvas as the others.
2. Crop and resize it to match the existing ducks (originals in `~/Downloads/duckweather NEW/`, named like `70-75.png`):
   ```sh
   python3 -c "from PIL import Image; Image.open('70-75.png').convert('RGBA').crop((140,263,1427,1783)).resize((900,1063), Image.LANCZOS).save('assets/ducks/duck-70.png', optimize=True)"
   ```
3. In `ducks.js`, change that band's `img: null` to `img: duck(70)`. You can also change its speech-bubble `advice` there.

Data comes from [Open-Meteo](https://open-meteo.com/) (forecast and air quality, no API key needed) and BigDataCloud (place names for "use my location").
