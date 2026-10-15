# duckweather: brag plan

**What it is:** a weather site where a hand-drawn duck changes outfit with the temperature.
**For:** anyone checking what to wear. The duck answers that before you read a single number.
**What sets it apart:** 21 drawn ducks (every 5°F from 0–100°F, plus rain). The weather is shown as a drawing, not a chart.
**Angle:** a friendly tutorial for someone who's never seen the site: pick a city, tap a day, watch the duck change. Then reveal that every duck is tied to a temperature.
**Tone:** default (playful, clean), screen-studio style: cursor, click ripples, smooth camera; no captions, no sound. Made to loop silently at the top of a portfolio section.
**Identity:** the site's own palette (sky #b3d1ea, cream #f5ede1, accent #cf6a40), with Fraunces, Outfit and Caveat. The real app runs inside a browser-window frame.

## Storyboard (24s, 1920×1080, 30fps)
| Time | Scene |
|---|---|
| 0–1.1 | Hook: push in on the "duckweather" wordmark against the app's sky |
| 1.1–2.75 | Pull back to reveal the whole site (New York, 47°, beret + puffer duck) |
| 2.9 | The cursor appears |
| 4.4–9.0 | Pick a city: click the location button, type "Denver", pick Denver, Colorado; forecast loads; the duck changes to the white puffer + scarf (37°) |
| 9.2–13.6 | Tap days: Wed (rain) shows the umbrella duck, Fri (33°, snow) shows the fur-hood duck |
| 13.6–15.2 | Camera dives into the duck; it flies into its slot in a grid |
| 15.2–19.5 | "A new duck for every 5°F": all 21 ducks light up coldest to hottest, then rain, in order |
| 20.0–24 | Outro: 45° duck + wordmark + "Weather, as told by a duck."; the wordmark then glides back to the opening shot so the video loops seamlessly |

## Notes
- The weather data is **fictional** and mocked so the video is deterministic. The app, styles, fonts and duck art are the real project files, and every interaction is a real mouse or keyboard event on the live app.
- Silent: the final file has no audio track (`work/music.mjs` is left over from the first version and is not used).
- Re-render: `cd work && node render.mjs`, then `ffmpeg -i video.mp4 -an -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart ../brag.mp4`.
