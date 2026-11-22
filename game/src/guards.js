// NIGHTMAIL — guard AI. One job: patrol, get suspicious, investigate,
// chase, search, and give up again. A guard never knows where the player
// is unless it sees or hears something.

import {
  GUARD_PATROL,
  GUARD_INVESTIGATE,
  GUARD_CHASE,
  DETECT_BASE_NEAR,
  DETECT_BASE_FAR,
  DETECT_LIT_MULT,
  DETECT_SHADOW_MULT,
  DETECT_SNEAK_MULT,
  DETECT_SPRINT_MULT,
  DETECT_DRAIN,
  SUSPICIOUS_AT,
  SPOTTED_AT,
  CHASE_MEMORY,
  SEARCH_TIME,
  INVESTIGATE_LOOK,
  CATCH_DIST,
  CONE_RANGE,
} from './config.js';
import { clamp, dist } from './random.js';
import { moveEntity, tileCenter } from './collision.js';
import { inCone, lightAt } from './vision.js';
import { isSolidTile } from './levels.js';
import { GUARD_LOOKS } from './config.js';

export function makeGuard(def, index) {
  const [sx, sy] = def.waypoints[0];
  const start = tileCenter(sx, sy);
  const [nx, ny] = def.waypoints[1 % def.waypoints.length];
  const next = tileCenter(nx, ny);
  // "CON-1 BRAM" -> short name BRAM; the look is that guard's identity.
  const shortName = def.name.split(' ').pop();
  return {
    name: def.name,
    shortName,
    look: GUARD_LOOKS[shortName] || GUARD_LOOKS.BRAM,
    index,
    x: start.x,
    y: start.y,
    dir: Math.atan2(next.y - start.y, next.x - start.x),
    waypoints: def.waypoints,
    wpIndex: 1 % def.waypoints.length,
    state: 'patrol', // patrol | investigate | chase | search | return
    suspicion: 0,
    pauseTimer: 0,
    lookTimer: 0,
    unseenTimer: 0,
    searchTimer: 0,
    searchTarget: null,
    stimulus: null,
    lastSeen: null,
    stepTimer: 0,
    walkPhase: index * 1.7, // staggered mid-stride pose per guard
  };
}

function headToward(world, guard, tx, ty, speed, dt) {
  const d = dist(guard.x, guard.y, tx, ty);
  if (d < 3) return true;
  const vx = ((tx - guard.x) / d) * speed * dt;
  const vy = ((ty - guard.y) / d) * speed * dt;
  guard.dir = Math.atan2(vy, vx);
  moveEntity(world, guard, vx, vy, 12);
  return dist(guard.x, guard.y, tx, ty) < 5;
}

function nearestWalkable(world, cx, cy, rng, radiusTiles) {
  for (let tries = 0; tries < 12; tries++) {
    const tx = Math.round(cx + (rng() * 2 - 1) * radiusTiles);
    const ty = Math.round(cy + (rng() * 2 - 1) * radiusTiles);
    if (ty < 0 || ty >= world.grid.length) continue;
    if (tx < 0 || tx >= world.grid[ty].length) continue;
    if (!isSolidTile(world.grid[ty][tx])) return tileCenter(tx, ty);
  }
  return tileCenter(cx, cy);
}

export function updateGuard(world, guard, dt) {
  const player = world.player;
  const ox = guard.x;
  const oy = guard.y;

  // --- perception: can this guard see the player right now? ---
  let sees = false;
  if (player && !player.hidden && world.state === 'play') {
    sees = inCone(world, guard, player.x, player.y, player.sneak);
  }
  if (sees) {
    const d = dist(guard.x, guard.y, player.x, player.y);
    const near = 1 - d / CONE_RANGE;
    let rate = DETECT_BASE_FAR + (DETECT_BASE_NEAR - DETECT_BASE_FAR) * near;
    rate *= lightAt(world, player.x, player.y) === 'lit' ? DETECT_LIT_MULT : DETECT_SHADOW_MULT;
    if (player.sneak) rate *= DETECT_SNEAK_MULT;
    if (player.sprint) rate *= DETECT_SPRINT_MULT;
    guard.suspicion = clamp(guard.suspicion + rate * dt, 0, 100);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.unseenTimer = 0;
  } else {
    guard.suspicion = clamp(guard.suspicion - DETECT_DRAIN * dt, 0, 100);
    guard.unseenTimer += dt;
  }

  // --- suspicion thresholds drive the state machine ---
  if (guard.suspicion >= SPOTTED_AT && guard.state !== 'chase') {
    guard.state = 'chase';
    world.onSpotted(guard);
  } else if (guard.suspicion >= SUSPICIOUS_AT && guard.state === 'patrol') {
    guard.state = 'investigate';
    guard.stimulus = guard.lastSeen ? { ...guard.lastSeen } : { x: player.x, y: player.y };
    guard.lookTimer = 0;
  }

  // --- movement per state ---
  if (guard.state === 'patrol') {
    if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
    } else {
      const [wx, wy] = guard.waypoints[guard.wpIndex];
      const target = tileCenter(wx, wy);
      if (headToward(world, guard, target.x, target.y, GUARD_PATROL, dt)) {
        guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = 1.2;
      }
    }
  } else if (guard.state === 'investigate') {
    if (guard.stimulus) {
      if (headToward(world, guard, guard.stimulus.x, guard.stimulus.y, GUARD_INVESTIGATE, dt)) {
        guard.lookTimer += dt;
        guard.dir += dt * 1.4;
        if (guard.lookTimer >= INVESTIGATE_LOOK) {
          guard.state = 'return';
          guard.stimulus = null;
        }
      }
    } else {
      guard.state = 'return';
    }
  } else if (guard.state === 'chase') {
    const target = guard.lastSeen || { x: player.x, y: player.y };
    headToward(world, guard, target.x, target.y, GUARD_CHASE, dt);
    if (dist(guard.x, guard.y, player.x, player.y) < CATCH_DIST && world.state === 'play') {
      world.onCaught(guard);
    }
    if (guard.unseenTimer > CHASE_MEMORY) {
      guard.state = 'search';
      guard.searchTimer = 0;
      guard.searchTarget = null;
    }
  } else if (guard.state === 'search') {
    guard.searchTimer += dt;
    if (!guard.searchTarget) {
      const base = guard.lastSeen || { x: guard.x, y: guard.y };
      const btx = Math.floor(base.x / 32);
      const bty = Math.floor((base.y - 16) / 32);
      guard.searchTarget = nearestWalkable(world, btx, bty, world.rng, 3);
    }
    if (guard.searchTarget) {
      if (headToward(world, guard, guard.searchTarget.x, guard.searchTarget.y, GUARD_INVESTIGATE, dt)) {
        guard.searchTarget = null;
      }
    }
    if (guard.searchTimer >= SEARCH_TIME) {
      guard.state = 'return';
    }
  } else if (guard.state === 'return') {
    // Walk back to the nearest waypoint, then resume the patrol.
    let best = 0;
    let bestD = Infinity;
    guard.waypoints.forEach(([wx, wy], i) => {
      const pt = tileCenter(wx, wy);
      const d = dist(guard.x, guard.y, pt.x, pt.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    const [wx, wy] = guard.waypoints[best];
    const target = tileCenter(wx, wy);
    if (headToward(world, guard, target.x, target.y, GUARD_PATROL, dt)) {
      guard.wpIndex = (best + 1) % guard.waypoints.length;
      guard.state = 'patrol';
    }
  }

  // Walk cycle: the stride swings only while the guard actually moves.
  if (Math.hypot(guard.x - ox, guard.y - oy) > 0.05) {
    guard.walkPhase += dt * (guard.state === 'chase' ? 11 : 8);
  }

  // Footstep sound when a guard walks close enough to hear.
  guard.stepTimer -= dt;
  if (guard.stepTimer <= 0 && (guard.state === 'patrol' || guard.state === 'chase')) {
    guard.stepTimer = guard.state === 'chase' ? 0.34 : 0.5;
    const d = player ? dist(guard.x, guard.y, player.x, player.y) : 9999;
    if (d < 260) world.audio.guardStep(guard.x, player ? player.x : guard.x);
  }
}

// A noise somewhere pulls the nearest guards to look at it.
export function investigateNoise(world, x, y) {
  for (const guard of world.guards) {
    if (guard.state === 'chase') continue;
    if (dist(guard.x, guard.y, x, y) < 260) {
      guard.state = 'investigate';
      guard.stimulus = { x, y };
      guard.lookTimer = 0;
      if (guard.suspicion < SUSPICIOUS_AT) guard.suspicion = SUSPICIOUS_AT;
    }
  }
}
