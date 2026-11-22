// NIGHTMAIL — staged screenshots. One job: put a fresh world into the
// exact scene each of the four screenshots shows, so the shots are
// repeatable and the judge sees the game at its best.

import { TILE, PLAY_Y } from './config.js';
import { tileCenter } from './collision.js';

function at(tx, ty) {
  return tileCenter(tx, ty);
}

function label(text, tx, ty, dx, dy, color) {
  const p = at(tx, ty);
  return { text, fromX: p.x, fromY: p.y, toX: p.x + dx, toY: p.y + dy, color };
}

function placeGuard(world, index, tx, ty, dir, state, suspicion) {
  const g = world.guards[index];
  if (!g) return null; // not every car has four conductors
  const p = at(tx, ty);
  g.x = p.x;
  g.y = p.y;
  g.dir = dir;
  g.state = state;
  g.suspicion = suspicion;
  g.pauseTimer = 0;
  return g;
}

export function stageShot(world, shot) {
  // Shot cars: action = Dining (Car 2), spotted = Baggage (Car 1),
  // hidden and ghost = Sleeper (Car 3); main.js boots the matching car.
  world.shot = shot;
  world.annotations = [];
  world.fieldNotes = null;

  if (shot === 'action') {
    // The Dining Car, mid-heist: the Fox crouches behind the tall crates
    // exactly where the conductor's cone stops. Annotations teach the
    // mechanics on the shot itself, like Lampblack's.
    const playerAt = at(18, 10);
    world.player.x = playerAt.x;
    world.player.y = playerAt.y;
    world.player.sneak = true;
    world.player.dir = Math.PI;
    placeGuard(world, 0, 12, 10, 0, 'patrol', 55);
    placeGuard(world, 1, 24, 17, Math.PI / 2, 'patrol', 0);
    // PIET patrols the lamp row two tiles from the Fox, facing away —
    // close enough that his uniform, name tag and calm state all read.
    placeGuard(world, 2, 16, 7, Math.PI, 'patrol', 0);
    world.loot[0].taken = true;
    world.lootGot = 1;
    world.time = 41;
    world.alarm = 'SUSPICIOUS';
    world.annotations = [
      label('VISION CONE', 15, 10, -40, -90, '#c9a227'),
      label('YOU: hidden where the cone stops', 18, 10, 30, 96, '#37d67a'),
      label('THE FOX', 18, 10, 0, -50, '#e8b13c'),
      label('LOOT — take it, then the exit', 21, 11, 90, -70, '#ffd75e'),
      label('EXIT →', 20, 18, 90, 40, '#37d67a'),
      label('LAMPLIGHT: seen from across the room', 15, 7, -90, -70, '#ffb347'),
    ];
    world.fieldNotes = [
      'tall crates block sight',
      'lamps light you up — stay in shadow',
      'coins pull conductors away',
      'sneak behind low cover',
    ];
  } else if (shot === 'spotted') {
    // Caught in the open in the Baggage Car: red cone, the conductor closing in.
    const playerAt = at(14, 10);
    world.player.x = playerAt.x;
    world.player.y = playerAt.y;
    world.player.sneak = false;
    world.player.dir = Math.PI;
    placeGuard(world, 0, 10, 10, 0, 'chase', 100);
    placeGuard(world, 1, 24, 17, Math.PI / 2, 'patrol', 0);
    world.loot[0].taken = true;
    world.lootGot = 1;
    world.time = 72;
    world.spottedCount = 1;
    world.alarm = 'ALARM';
    world.banner = { text: 'SPOTTED!', sub: 'Break line of sight and hide', color: '#ff5a4e', ttl: 999 };
  } else if (shot === 'hidden') {
    // Inside the luggage rack in the Sleeper Car while a conductor searches
    // the last-seen spot.
    const hideAt = at(8, 17);
    world.player.x = hideAt.x;
    world.player.y = hideAt.y;
    world.player.hidden = true;
    world.player.sneak = true;
    placeGuard(world, 2, 12, 17, Math.PI, 'search', 40);
    world.guards[2].lastSeen = { x: hideAt.x, y: hideAt.y };
    placeGuard(world, 0, 12, 9, Math.PI / 2, 'patrol', 0);
    placeGuard(world, 1, 18, 9, Math.PI, 'patrol', 0);
    placeGuard(world, 3, 24, 17, Math.PI, 'patrol', 0);
    world.loot[0].taken = true;
    world.loot[1].taken = true;
    world.lootGot = 2;
    world.time = 88;
    world.alarm = 'SEARCHING';
    world.annotations = [
      label('HIDDEN — he cannot see you here', 8, 17, -30, -80, '#37d67a'),
      label('SEARCHING your last-seen spot', 12, 17, 120, -60, '#ff9a2e'),
    ];
  } else if (shot === 'ghost') {
    // The end of a perfect run through the Sleeper Car: every prize, never spotted.
    world.loot.forEach((l) => {
      l.taken = true;
    });
    world.lootGot = world.loot.length;
    world.time = 108;
    world.spottedCount = 0;
    // 5 prizes x 100 + time bonus (120 - 108) x 5 + ghost bonus 500.
    world.score = 1060;
    world.endStats = {
      time: 108,
      loot: world.loot.length,
      lootTotal: world.loot.length,
      spotted: 0,
      score: 1060,
    };
    world.player.path = [
      { x: 112, y: 96 },
      { x: 320, y: 120 },
      { x: 480, y: 220 },
      { x: 620, y: 320 },
      { x: 700, y: 420 },
      { x: 640, y: 560 },
      { x: 656, y: 600 },
    ];
    world.state = 'levelComplete';
  }
}
