# prismwake

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/saifulsidik801-ship-it/prismwake/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/saifulsidik801-ship-it/prismwake/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**PRISMWAKE — split the dawn through prisms, mix the colours, and burn the shades.** The last lantern of the waking world stands at the foot of a dark hill. Every night the shades climb out of the murk, and each one can only be burned by the exact colour of light it fears. You place prisms in the dawn's path, rotate them, and bend white light into red, green and blue — then overlap the beams to mix yellow, magenta, cyan and white, and set the hill alight in the shade's own weakness. Nine nights, four realms, a draft of new glass after every night, and the Pale King waiting on night nine.

## Run it

```sh
node tools/serve.cjs
```

Then open http://localhost:8080 — no build step, no network, no dependencies. Click a prism in your hand, click a cell to place it, click a placed prism to rotate it, right-click to sell it. Press SPACE (or Start Night) to open the gate. Between nights, draft 1 of 3 new pieces of glass. Survive all 9 nights to wake the dawn; lose the lantern and the dark keeps the hill.

- **The twist, everywhere:** every system is colour. Prisms split, bend, filter and focus light; shades carry a hue weakness; beams that cross mix into new hues; the boss absorbs one colour per phase; the draft, the HUD, the results chart and the almanac all count in colour.
- **Depth:** 9 nights across 4 realms (Murkwood, Emberfields, Glassmere, the Pale Court), 7 prism types with 3 upgrade levels, 12 relics, 8 shade kinds plus the Pale King boss, 3 difficulties, GLEAM combo scoring (burns chained within 1.5 s, up to x5), per-night results charts, feats, an almanac with real numbers, run history, and Eclipse endless mode after a win.
- **Feel:** procedural WebAudio — generative pentatonic dawn music that quickens every night, plus a sound for every placement, rotation, burn, breach and draft. Particles, floating burn numbers, screen shake, colour-blind hue patterns, and options for volume, speed and shake.
- **Proof:** the four screenshots are real renders of the game's own code, staged by a deterministic bot run (seed 2013) and truth-checked — every HUD number in them is rebuilt from a headless replay (`tools/truth.cjs`). The full loop is playtested with real clicks and keys (`tools/playtest.cjs`), 0 console errors.

---

<sub>Entered on [make.fun](https://make.fun/?ref=59gqp20q&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
