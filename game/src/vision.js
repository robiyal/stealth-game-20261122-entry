// NIGHTMAIL — sight and light. One job: decide what a guard can see and
// whether a spot is lit or in shadow.

import { TILE, PLAY_Y, CONE_RANGE, CONE_HALF_ANGLE, CONE_RAYS, LAMP_RADIUS } from './config.js';
import { angleDiff, dist } from './random.js';
import { tileAtPixel, tileChar } from './collision.js';
import { blocksSightTile } from './levels.js';

// True when the straight line between two points crosses no sight-blocking
// tile. A sneaking player is also hidden by low cover ('l') along the ray.
export function losClear(world, x1, y1, x2, y2, sneaking) {
  const d = dist(x1, y1, x2, y2);
  const steps = Math.max(1, Math.ceil(d / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const { tx, ty } = tileAtPixel(world, x, y);
    const ch = tileChar(world, tx, ty);
    if (blocksSightTile(ch)) return false;
    if (sneaking && ch === 'l') return false;
  }
  return true;
}

export function inCone(world, guard, px, py, sneaking) {
  const d = dist(guard.x, guard.y, px, py);
  if (d > CONE_RANGE) return false;
  const ang = Math.atan2(py - guard.y, px - guard.x);
  if (Math.abs(angleDiff(ang, guard.dir)) > CONE_HALF_ANGLE) return false;
  return losClear(world, guard.x, guard.y, px, py, sneaking);
}

// 'lit' inside a lamp pool, 'shadow' everywhere else.
export function lightAt(world, px, py) {
  for (const lamp of world.lamps) {
    const lx = lamp.x * TILE + TILE / 2;
    const ly = PLAY_Y + lamp.y * TILE + TILE / 2;
    if (dist(px, py, lx, ly) < LAMP_RADIUS) return 'lit';
  }
  return 'shadow';
}

// The visible region of a guard's cone, as a polygon: cast rays across
// the cone and stop each one at the first sight-blocking tile.
export function conePolygon(world, guard) {
  const pts = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= CONE_RAYS; i++) {
    const a = guard.dir - CONE_HALF_ANGLE + ((CONE_HALF_ANGLE * 2 * i) / CONE_RAYS);
    let reach = CONE_RANGE;
    for (let d = 8; d <= CONE_RANGE; d += 8) {
      const x = guard.x + Math.cos(a) * d;
      const y = guard.y + Math.sin(a) * d;
      const { tx, ty } = tileAtPixel(world, x, y);
      if (blocksSightTile(tileChar(world, tx, ty))) {
        reach = d - 8;
        break;
      }
    }
    pts.push({ x: guard.x + Math.cos(a) * reach, y: guard.y + Math.sin(a) * reach });
  }
  return pts;
}
