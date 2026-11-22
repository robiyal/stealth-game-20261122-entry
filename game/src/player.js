// NIGHTMAIL — the player. One job: move, sneak, throw coins, hide, and
// pick up loot. The Fox slips through the train one car at a time.

import {
  TILE,
  PLAY_Y,
  PLAYER_WALK,
  PLAYER_SNEAK,
  PLAYER_SPRINT,
  COIN_RANGE_TILES,
  COIN_NOISE_RADIUS,
  SPRINT_NOISE_RADIUS,
} from './config.js';
import { dist } from './random.js';
import { moveEntity, tileAtPixel, tileCenter } from './collision.js';
import { investigateNoise } from './guards.js';

export function makePlayer(start) {
  const at = tileCenter(start.x, start.y);
  return {
    x: at.x,
    y: at.y,
    dir: 0,
    sneak: false,
    sprint: false,
    hidden: false,
    coins: 5,
    stepTimer: 0,
    walkPhase: 0,
    path: [{ x: at.x, y: at.y }],
    pathTimer: 0,
  };
}

export function updatePlayer(world, dt) {
  const player = world.player;
  const input = world.input;
  if (!player || world.state !== 'play') return;

  player.sneak = !!input.keys['ShiftLeft'] || !!input.keys['ShiftRight'];
  player.sprint = !player.sneak && (!!input.keys[' '] || !!input.keys['Space']);

  let mx = 0;
  let my = 0;
  if (input.keys['KeyW'] || input.keys['ArrowUp']) my -= 1;
  if (input.keys['KeyS'] || input.keys['ArrowDown']) my += 1;
  if (input.keys['KeyA'] || input.keys['ArrowLeft']) mx -= 1;
  if (input.keys['KeyD'] || input.keys['ArrowRight']) mx += 1;

  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    const speed = player.sneak ? PLAYER_SNEAK : player.sprint ? PLAYER_SPRINT : PLAYER_WALK;
    moveEntity(world, player, mx * speed * dt, my * speed * dt, 14);
    player.dir = Math.atan2(my, mx);
    player.hidden = false;
    player.walkPhase += dt * (player.sneak ? 5 : player.sprint ? 11 : 8);
    // Footsteps: sprinting is loud enough for nearby guards to hear.
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = player.sprint ? 0.26 : player.sneak ? 0.55 : 0.38;
      world.audio.playerStep(player.sprint ? 0.5 : player.sneak ? 0.08 : 0.2);
      if (player.sprint) {
        for (const guard of world.guards) {
          if (guard.state === 'patrol' && dist(guard.x, guard.y, player.x, player.y) < SPRINT_NOISE_RADIUS) {
            guard.state = 'investigate';
            guard.stimulus = { x: player.x, y: player.y };
            guard.lookTimer = 0;
          }
        }
      }
    }
    // Remember the route for the end-of-level map.
    player.pathTimer += dt;
    if (player.pathTimer > 0.5) {
      player.pathTimer = 0;
      player.path.push({ x: player.x, y: player.y });
    }
  }

  // Coin throw: click a floor tile within range; the clink pulls guards.
  if (input.consumeClick && player.coins > 0) {
    const click = input.consumeClick;
    input.consumeClick = null;
    const { tx, ty } = tileAtPixel(world, click.x, click.y);
    const dx = tx * TILE + TILE / 2;
    const dy = PLAY_Y + ty * TILE + TILE / 2;
    if (dist(player.x, player.y, dx, dy) <= COIN_RANGE_TILES * TILE) {
      player.coins--;
      world.coins.push({ x: dx, y: dy, ttl: 6 });
      world.audio.coin();
      investigateNoise(world, dx, dy);
      world.flashNoise(dx, dy, COIN_NOISE_RADIUS);
    }
  }

  // E: slip into a hide spot (luggage rack / under-seat nook) or step out.
  if (input.consumeHide) {
    input.consumeHide = false;
    const { tx, ty } = tileAtPixel(world, player.x, player.y);
    const nearHide = world.hides.some(
      (h) => Math.abs(h.x - tx) + Math.abs(h.y - ty) <= 1,
    );
    if (nearHide) {
      player.hidden = !player.hidden;
      world.audio.hide(player.hidden);
    }
  }

  // Loot: walk over it and it is yours.
  for (const loot of world.loot) {
    if (!loot.taken) {
      const at = tileCenter(loot.x, loot.y);
      if (dist(player.x, player.y, at.x, at.y) < 22) {
        loot.taken = true;
        world.lootGot++;
        world.score += 100;
        world.audio.pickup();
      }
    }
  }

  // Exit: only opens once every prize in the car is taken.
  const exitAt = tileCenter(world.exit.x, world.exit.y);
  if (dist(player.x, player.y, exitAt.x, exitAt.y) < 24) {
    if (world.lootGot >= world.loot.length) {
      world.onLevelComplete();
    } else {
      world.hint = `LOOT ${world.lootGot}/${world.loot.length} — find the rest first`;
      world.hintTimer = 1.6;
    }
  }
}
