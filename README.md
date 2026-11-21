# NIGHTMAIL — a heist aboard the midnight express

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/robiyal/stealth-game-20261122-entry/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/robiyal/stealth-game-20261122-entry/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

An entry for [Make the best stealth game](https://make.fun/bounty/best-stealth-game-20261121-1759) on make.fun.

NIGHTMAIL is a 2D top-down stealth game set aboard the midnight express. You are the Fox, slipping through three train cars — Baggage, Dining, Sleeper — stealing every prize and reaching the green exit unseen. Conductors patrol with lantern vision cones; tall crates block their sight, lamplight gives you away, and a thrown coin pulls a conductor off his route. Get spotted and the hunt is on; hide in a luggage rack and wait for the search to pass. Finish a car without ever being spotted and you earn the Ghost rank.

## How to play

- **WASD** move · **SHIFT** sneak (slow, quiet, hard to see) · **SPACE** sprint (fast, loud)
- **Click** throw a coin — the nearest conductor investigates the clink
- **E** hide in a luggage rack when you stand on one
- **ESC** pause · **R** retry the car
- Steal every prize, then reach the green exit. The detection meter, alarm state, visibility, noise, loot, and each conductor's state are all on the right-hand panel, with a named guard list so you can learn the patrols.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies, no network: plain Canvas 2D, procedural art, and Web Audio footsteps that tell you where a conductor is. `game/index.html` loads `game/src/main.js`; the four screenshots in `screenshots/` are staged with `?shot=action|spotted|hidden|ghost`.

## Structure

- `game/src/config.js` — constants and the palette
- `game/src/levels.js` — the three cars as tile maps
- `game/src/vision.js` — line of sight, cones, lamplight
- `game/src/guards.js` — patrol / investigate / chase / search
- `game/src/player.js` — movement, sneaking, coins, hiding, loot
- `game/src/render.js` — the playfield, cones, annotations
- `game/src/hud.js` — the side panel, title, results
- `game/src/audio.js` — Web Audio footsteps, coin, alarm
- `game/src/shots.js` — the staged screenshot scenes
- `game/src/main.js` — boot, loop, state machine
- `main.ts` — builds the submission dossier (`node main.ts`)

Referral code: `9msm2jv2`
