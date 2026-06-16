# Room backgrounds

The reading room ships with atmospheric gradient fallbacks. To make a room feel genuinely
lived-in, drop a real image at `web/rooms/<id>.jpg` (or `.png`) and it loads automatically:

| id | file |
|---|---|
| Library | `web/rooms/library.jpg` |
| Café | `web/rooms/cafe.jpg` |
| Rainy window | `web/rooms/rain.jpg` |
| Lofi desk | `web/rooms/lofi.jpg` |
| Garden | `web/rooms/garden.jpg` |
| Dusk | `web/rooms/dusk.jpg` |
| Paper | `web/rooms/paper.jpg` |

"Your room" (Blank) uses whatever you upload from the scene picker.

## Generating them

These prompts are tuned for GPT's image model (or any text-to-image). Ask for **16:9, ~1920×1080,
no people, soft focus, the visual interest pushed to the edges so the centre stays calm for the
reading panel.** Lived-in, warm, a little imperfect.

- **library** — "A cozy old reading library at golden hour, tall wooden shelves heavy with worn books, a brass desk lamp glowing, dust drifting in a shaft of warm window light, deep amber and walnut tones, soft focus, no people, cinematic, edges darker than the centre. 16:9."
- **cafe** — "A quiet corner cafe in late afternoon, a half-finished latte and an open notebook on a worn wooden table by a rain-flecked window, warm amber lamplight, plants, soft bokeh, lived-in, no people, cinematic. 16:9."
- **rain** — "Looking out a foggy apartment window at a rainy blue-grey city dusk, raindrops streaking the glass, a windowsill with a mug and a small plant, cool moody tones with one warm interior glow, no people, cinematic. 16:9."
- **lofi** — "A nighttime desk lit by a single warm lamp and the soft glow of a monitor, headphones, a small plant, scattered notes, deep indigo room with amber pools of light, calm lofi mood, no people, cinematic. 16:9."
- **garden** — "A shaded garden reading nook in soft morning light, a worn bench under green leaves, dappled sun, ferns and stone, fresh and calm green tones, no people, cinematic, soft focus. 16:9."
- **dusk** — "A wide quiet view of a city skyline at dusk from a high window, violet sky melting into warm orange on the horizon, lights beginning to glow, calm and spacious, no people, cinematic. 16:9."
- **paper** — "A bright airy desk by a sunlit window, cream walls, linen, an open book and a ceramic cup, soft natural daylight, minimal and warm, no people, cinematic. 16:9."

After generating, save each as `web/rooms/<id>.jpg` and reload. Keep files reasonably sized
(under ~500 KB each) so the room loads instantly.
