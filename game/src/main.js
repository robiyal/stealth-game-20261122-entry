// NIGHTMAIL — boot, the frame loop, and the state machine. One job: own
// the world object, step the simulation, and decide what the player sees
// (title, play, pause, caught, car complete, campaign complete).

import { VIEW_W, VIEW_H, SPOTTED_AT, TILE, PLAY_Y } from './config.js';
import { LEVELS, parseLevel } from './levels.js';
import { mulberry32 } from './random.js';
import { makeInput } from './input.js';
import { makeAudio } from './audio.js';
import { makeGuard, updateGuard } from './guards.js';
import { makePlayer, updatePlayer } from './player.js';
import { drawPlayfield } from './render.js';
import { drawHud, drawBanner, drawHint, drawTitle, drawPaused, drawBusted, drawLevelComplete, drawCampaign } from './hud.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const SHOT = params.get('shot');
const SEED = Number(params.get('seed') || '1');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const input = makeInput(canvas);
const audio = makeAudio();

let world = null;

function buildWorld(levelIndex, carriedScore = 0) {
  const def = LEVELS[levelIndex];
  const parsed = parseLevel(def);
  const rng = mulberry32(SEED * 1000 + levelIndex * 77 + 13);
  const w = {
    def,
    grid: parsed.grid,
    loot: parsed.loot,
    lamps: parsed.lamps,
    hides: parsed.hides,
    exit: parsed.exit,
    levelIndex,
    rng,
    input,
    audio,
    time: 0,
    score: carriedScore,
    scoreAtLevelStart: carriedScore,
    lootGot: 0,
    spottedCount: 0,
    state: 'play',
    alarm: 'QUIET',
    noiseLoud: false,
    noiseLoudTimer: 0,
    noiseFlash: null,
    coins: [],
    banner: null,
    hint: '',
    hintTimer: 0,
    caughtBy: null,
    endStats: null,
    campaign: world && world.campaign ? world.campaign : { score: 0, time: 0, spotted: 0, levels: [] },
    shot: null,
    annotations: [],
    fieldNotes: null,
    titleButtons: [],
  };
  w.player = makePlayer(parsed.playerStart);
  w.guards = def.guards.map((g, i) => makeGuard(g, i));
  w.onSpotted = (guard) => {
    const alreadyHunting = w.guards.some((g) => g !== guard && g.state === 'chase');
    if (alreadyHunting) return;
    w.spottedCount++;
    w.banner = { text: 'SPOTTED!', sub: 'Break line of sight and hide', color: '#ff5a4e', ttl: 2.2 };
    audio.alert();
  };
  w.onCaught = (guard) => {
    if (w.state !== 'play') return;
    input.consumeAny = false;
    w.state = 'busted';
    w.caughtBy = guard.name;
    audio.caught();
  };
  w.onLevelComplete = () => {
    if (w.state !== 'play') return;
    // Clear any stale "any key" press so the results screen is not
    // skipped by a key the player pressed before the car ended.
    input.consumeAny = false;
    const timeBonus = Math.max(0, Math.round((def.parTime - w.time) * 5));
    const ghostBonus = w.spottedCount === 0 ? 500 : 0;
    w.score += timeBonus + ghostBonus;
    w.endStats = {
      time: Math.round(w.time),
      loot: w.lootGot,
      lootTotal: w.loot.length,
      spotted: w.spottedCount,
      score: w.score,
    };
    w.campaign.levels.push({ name: def.name, time: Math.round(w.time), loot: w.lootGot, lootTotal: w.loot.length, spotted: w.spottedCount });
    w.campaign.score = w.score;
    w.campaign.time += Math.round(w.time);
    w.campaign.spotted += w.spottedCount;
    w.state = 'levelComplete';
    audio.win();
  };
  w.flashNoise = (x, y, radius) => {
    w.noiseFlash = { x, y, radius, age: 0, ttl: 0.9 };
    w.noiseLoudTimer = 1.0;
  };
  return w;
}

function deriveAlarm(w) {
  if (w.guards.some((g) => g.state === 'chase')) return 'ALARM';
  if (w.guards.some((g) => g.state === 'search')) return 'SEARCHING';
  if (w.guards.some((g) => g.state === 'investigate' || g.suspicion >= SPOTTED_AT / 2)) return 'SUSPICIOUS';
  return 'QUIET';
}

function startLevel(index, carriedScore = 0) {
  world = buildWorld(index, carriedScore);
  if (SHOT) stageShot(world, SHOT);
}

function update(dt) {
  if (!world) return;
  if (world.state === 'play') {
    world.time += dt;
    if (world.noiseLoudTimer > 0) world.noiseLoudTimer -= dt;
    world.noiseLoud = world.noiseLoudTimer > 0 || (world.player && world.player.sprint);
    updatePlayer(world, dt);
    for (const guard of world.guards) updateGuard(world, guard, dt);
    world.alarm = deriveAlarm(world);
    if (world.banner) {
      world.banner.ttl -= dt;
      if (world.banner.ttl <= 0) world.banner = null;
    }
    if (world.hintTimer > 0) world.hintTimer -= dt;
    if (world.noiseFlash) {
      world.noiseFlash.age += dt;
      if (world.noiseFlash.age >= world.noiseFlash.ttl) world.noiseFlash = null;
    }
    for (const coin of world.coins) coin.ttl -= dt;
    world.coins = world.coins.filter((c) => c.ttl > 0);
  }

  // ESC pauses and resumes. R retries the car from anywhere.
  // Read as edges: a tap that lands between two frames still counts.
  if (input.wasPressed('Escape')) {
    if (world.state === 'play') world.state = 'paused';
    else if (world.state === 'paused') world.state = 'play';
  }
  if (input.wasPressed('KeyR')) {
    if (world.state === 'busted' || world.state === 'play' || world.state === 'paused') {
      // Retry the car: the score rolls back to what it was when the car began.
      startLevel(world.levelIndex, world.scoreAtLevelStart);
    } else if (world.state === 'campaign') {
      startLevel(0, 0);
      world.campaign = { score: 0, time: 0, spotted: 0, levels: [] };
    }
  }
  input.justPressed.clear();

  if (world.state === 'title' && input.consumeClick) {
    const click = input.consumeClick;
    input.consumeClick = null;
    for (const b of world.titleButtons) {
      if (click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) {
        startLevel(b.level);
        break;
      }
    }
  }
  if (world.state === 'levelComplete' && input.consumeAny) {
    input.consumeAny = false;
    if (world.levelIndex + 1 < LEVELS.length) {
      startLevel(world.levelIndex + 1, world.score);
    } else {
      world.state = 'campaign';
    }
  }
}

function render(now) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (!world) return;
  if (world.state === 'title') {
    drawTitle(ctx, world);
    return;
  }
  drawPlayfield(ctx, world, now);
  drawHud(ctx, world);
  drawBanner(ctx, world);
  drawHint(ctx, world);
  if (world.state === 'paused') drawPaused(ctx);
  else if (world.state === 'busted') drawBusted(ctx, world);
  else if (world.state === 'levelComplete') drawLevelComplete(ctx, world);
  else if (world.state === 'campaign') drawCampaign(ctx, world);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // Staged screenshots freeze the simulation: only the visuals breathe.
  if (!SHOT) update(dt);
  render(now);
  requestAnimationFrame(frame);
}

// Boot: a staged shot loads the Dining Car frozen; otherwise the title screen.
if (SHOT) {
  startLevel(1);
  // The ghost shot stages its own end state; the others play from 'play'.
  if (SHOT !== 'ghost') world.state = 'play';
} else {
  world = buildWorld(0);
  world.state = 'title';
}

// Smoke-test hook: the headless probe reads the live world through this.
window.__nightmail = {
  get world() {
    return world;
  },
  startLevel,
  levels: LEVELS,
};

requestAnimationFrame(frame);
