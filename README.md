# Emberkeep — Keep the Last Lantern Lit

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/Dhaniels033/makefun-best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/Dhaniels033/makefun-best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

> **Note:** `Dhaniels033/makefun-best-game-01` in the rank/reward badge URLs above is a
> placeholder — this entry has not been pushed to GitHub yet. Replace it with the
> real owner and repository name after the public repo is created.

An entry for [make.fun's best-game-01 bounty](https://make.fun/bounty/best-game-01):
a complete original arcade game, built in vanilla HTML/CSS/JS with no libraries
and no network requests. It plays offline in desktop Chrome.

## The game

The last lantern is lit, and the night wants it out. You are its keeper — a
small green wisp with an ember thrower. Guard the lantern through **10 waves**
of foes and beat the **Ember King** to win. Lose if the lantern burns out or
the keeper falls.

- **Foes:** Cinders (chasers), Moths (fast zig-zag flyers), Spitters (ranged),
  Brutes (slow tanks), and the Ember King boss on wave 10, who charges and
  spawns Cinders.
- **Combat:** aim with the mouse, hold click to shoot ember bolts; **Shift**
  (or right-click) dashes through danger; bolts, kills and hits are scored
  with a combo multiplier.
- **Shards & shop:** foes drop gold shards. Between waves the shop opens —
  spend shards on fire rate, damage, speed, max HP, lantern repair and
  piercing bolts (keys **1–6** or click a row), then press **Enter** for the
  next wave.
- **Feedback:** HUD with score, best, wave, foes left, combo, shards, keeper
  HP and lantern HP; particles, screen shake, floating score text, hit blink,
  and synthesised WebAudio effects plus a quiet music loop (**M** mutes).
- **Screens:** title (with a live backdrop), play, shop, pause (**P**),
  victory with stats, and game over with stats — all with start/restart.
  Best score is kept in `localStorage`.

## Controls

| Input | Action |
|---|---|
| WASD / arrow keys | Move |
| Mouse | Aim |
| Hold left click | Shoot embers |
| Shift / right-click | Dash |
| P / Esc | Pause |
| M | Mute |
| 1–6 / click (in shop) | Buy upgrade |
| Enter / Space (in shop) | Next wave |
| Space / click (title & end screens) | Start / restart |

## Play it

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

or serve `game/` with any static server and open `index.html`. No build step,
no dependencies, no network.

## Screenshots

`screenshots/` holds four real renders of the game taken in a headless browser
from the game's own `?shot=` scenes (`shots.json`): title, play, shop and
victory. Reproduce them with any headless Chromium, e.g.:

```sh
node serve.ts --port 8080 &
# for each entry in shots.json: open http://localhost:8080/?shot=...&seed=7
# and screenshot at 1280x720 once window.__shotReady is true
```

## Files

- `main.ts` — copies `game/` + `screenshots/` to `/output` and writes
  `/output/dossier.json` via `vendor/makefun-game.ts` (Node 22, stdlib only).
- `game/index.html`, `game/src/config.js`, `random.js`, `audio.js`,
  `world.js`, `render.js`, `input.js`, `shots.js`, `main.js` — the game.
- `screenshots/` — 4 JPEG screenshots (1280×720, ≤256 KiB each).
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `LICENSE` — MIT.

## License

MIT — see [LICENSE](LICENSE).
