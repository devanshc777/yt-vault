# Assets — references + image prompts

Everything you need to make yt-vault's visuals yours: the **landing hero orb** and the
**reading-room backgrounds**. Each section has free reference sources (to grab or to inspire) and
ready-to-paste prompts for GPT's image model (or Midjourney / Flux / SDXL).

## Where files go (drop-in, auto-detected)

| Asset | Path | Notes |
|---|---|---|
| Landing hero | `web/assets/orb.png` (or `.webp` / `.jpg`) | Square. Transparent PNG ideal; a black background also works. Replaces the CSS orb automatically. |
| Rooms | `web/rooms/<id>.jpg` | 16:9. `library, cafe, rain, lofi, garden, dusk, paper`. "Your room" (Blank) = upload in-app. |

Keep each file under ~600 KB so it loads instantly. Reload after dropping a file in.

## Universal prompt tips

- State the **aspect ratio**: orb = `1:1, 2000×2000`; rooms = `16:9, 1920×1080`.
- Always add **"no people, no text, no watermark."**
- For rooms: **"keep the centre calm and uncluttered, push detail to the edges"** (the reading panel sits centre).
- For the orb: **"centered subject on a pure black background"** (or "transparent background" if your tool supports it), **"studio render, ultra detailed, soft depth of field."**
- Ask for **3–4 variations** each time so you can pick.

## Free, commercial-OK sources (verify the per-asset license)

- [Unsplash](https://unsplash.com) — free for commercial use, no attribution required.
- [Pexels](https://pexels.com) — same.
- [Pixabay](https://pixabay.com) — same.
- [Poly Haven](https://polyhaven.com) — CC0 HDRIs / textures (great for iridescent + room HDRIs).
- [ambientCG](https://ambientcg.com) — CC0 textures.
- [Rawpixel public domain](https://www.rawpixel.com/public-domain) — CC0 abstract / holographic.

---

# Part 1 — Landing hero (the orb)

A single mesmerizing object on black, lots of negative space (the cabbi.bo feel). Pick ONE direction
and generate variants. Transparent PNG centered, or a black-background square.

**Reference searches:** Unsplash [iridescent](https://unsplash.com/s/photos/iridescent) ·
[oil slick](https://unsplash.com/s/photos/oil-slick) · [opal](https://unsplash.com/s/photos/opal) ·
[holographic](https://unsplash.com/s/photos/holographic-texture) · [soap bubble macro](https://unsplash.com/s/photos/soap-bubble) ·
Poly Haven [iridescent / lapa materials](https://polyhaven.com/textures).

### Prompts (8 variants)

1. **Opal hexagon (current direction, upgraded)** — "A faceted hexagonal gem floating on pure black, filled with swirling opal iridescence, cyan to magenta to gold oil-slick sheen, soft internal glow, a faint ring of tiny iridescent dashes orbiting it, studio render, ultra detailed, soft depth of field, 1:1, no people, no text."
2. **Liquid chrome blob** — "A slowly morphing blob of liquid chrome on pure black, mirror surface catching faint rainbow reflections, smooth and heavy like mercury, single soft key light, cinematic, ultra detailed, 1:1, no text."
3. **Soap-bubble sphere** — "Extreme macro of a single soap bubble sphere on black, thin-film interference swirling in teal, violet and amber, delicate and translucent, tiny highlights, shallow depth of field, 1:1, no people, no text."
4. **Holographic crystal shard** — "A floating prismatic crystal shard on black, dispersing light into a soft spectrum, frosted edges, gentle inner glow, weightless, studio product render, 1:1, no text."
5. **Molten glass torus** — "A glowing torus of molten glass on pure black, iridescent oil-film surface, warm core light bleeding through, smooth caustics, cinematic, 1:1, no text."
6. **Aurora gas cloud** — "A contained sphere of swirling aurora-like gas on black, soft volumetric teal-magenta-gold light, nebula texture, glowing from within, dreamy, 1:1, no people, no text."
7. **Pearl in dark water** — "A single luminous pearl resting in still black water, iridescent surface, faint concentric ripples catching colored light, minimal, moody, 1:1, no text."
8. **Dispersed prism orb** — "A glass sphere on black refracting a thin rainbow band across its equator, mostly dark with one bright iridescent arc, elegant and restrained, studio render, 1:1, no text."

> Want a moving hero instead of a still? Export a 4–8s seamless loop (webm/mp4) of any of the above
> and tell me — I'll wire a `<video>` orb the same way as the image.

---

# Part 2 — Reading-room backgrounds

7 lived-in rooms, each `16:9`, no people, warm and a little imperfect, centre kept calm.

**Reference searches (Unsplash):** [cozy library](https://unsplash.com/s/photos/cozy-library) ·
[coffee shop interior](https://unsplash.com/s/photos/coffee-shop-interior) ·
[rainy window](https://unsplash.com/s/photos/rainy-window) ·
[desk setup night](https://unsplash.com/s/photos/desk-setup) ·
[garden nook](https://unsplash.com/s/photos/garden) ·
[city dusk skyline](https://unsplash.com/s/photos/city-dusk) ·
[sunlit desk](https://unsplash.com/s/photos/sunlit-desk).

### Prompts

**library** → `web/rooms/library.jpg`
- "A cozy old reading library at golden hour, tall walnut shelves of worn books, a brass desk lamp glowing, dust drifting in a shaft of warm window light, deep amber tones, soft focus, edges darker than the centre, no people, no text, cinematic, 16:9."
- *Variant:* "small private study, leather armchair, fireplace glow, rain outside the window, warm and quiet."

**cafe** → `web/rooms/cafe.jpg`
- "A quiet corner cafe in late afternoon, half-finished latte and an open notebook on a worn wood table by a rain-flecked window, warm amber lamplight, plants, soft bokeh, lived-in, no people, no text, 16:9."
- *Variant:* "scandinavian coffee bar, morning light, steam rising, pale wood and ceramic."

**rain** → `web/rooms/rain.jpg`
- "Looking out a foggy apartment window at a rainy blue-grey city dusk, raindrops streaking the glass, a windowsill with a mug and a small plant, cool moody tones with one warm interior glow, no people, no text, cinematic, 16:9."
- *Variant:* "tokyo street at night through a wet train window, neon bokeh, calm."

**lofi** → `web/rooms/lofi.jpg`
- "A nighttime desk lit by one warm lamp and the soft glow of a monitor, headphones, a small plant, scattered notes, deep indigo room with amber pools of light, calm lofi mood, no people, no text, 16:9."
- *Variant:* "bedroom desk, fairy lights, vinyl player, purple-amber ambient glow."

**garden** → `web/rooms/garden.jpg`
- "A shaded garden reading nook in soft morning light, a worn bench under green leaves, dappled sun, ferns and stone, fresh calm green tones, soft focus, no people, no text, 16:9."
- *Variant:* "greenhouse interior, hanging plants, misty light, wicker chair."

**dusk** → `web/rooms/dusk.jpg`
- "A wide quiet view of a city skyline at dusk from a high window, violet sky melting into warm orange on the horizon, lights beginning to glow, calm and spacious, no people, no text, cinematic, 16:9."
- *Variant:* "rooftop at blue hour, string lights, distant city, soft gradient sky."

**paper** → `web/rooms/paper.jpg` (light room)
- "A bright airy desk by a sunlit window, cream walls, linen, an open book and a ceramic cup, soft natural daylight, minimal and warm, no people, no text, 16:9."
- *Variant:* "minimalist study, white oak, plant shadow on the wall, gentle morning sun."

---

## Bundled defaults

The repo ships with curated **free photos from [Unsplash](https://unsplash.com)** so it looks good on
first run — 7 rooms + an iridescent macro for the landing hero (the orb texture is masked into a sphere
in CSS, kept inside the orbiting dash-ring). The [Unsplash License](https://unsplash.com/license) permits
bundling in a free app. To make a room yours, overwrite the file at `web/rooms/<id>.jpg`
(or `web/assets/orb.png`) and reload — your file wins. Anything else you drop in is gitignored.

## After you generate / replace

Drop the files in the paths above and reload. If you'd rather wire a **video** hero, add more
room slots, or retune the orb's glow color to match a room, open an issue.
