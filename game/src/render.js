// NIGHTMAIL — the train car itself. One job: draw the playfield — floor,
// walls, cover, lamps, cones, loot, exit, guards and the Fox — plus the
// annotation labels the action screenshot teaches with.

import {
  TILE,
  PLAY_W,
  PLAY_H,
  PLAY_Y,
  COLORS,
  LAMP_RADIUS,
} from './config.js';
import { conePolygon } from './vision.js';
import { tileCenter } from './collision.js';

// A stable per-tile hash, so floor wear never flickers between frames.
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

function drawFloor(ctx, world) {
  const floor = world.def.floor;
  for (let y = 0; y < world.grid.length; y++) {
    for (let x = 0; x < world.grid[y].length; x++) {
      const ch = world.grid[y][x];
      const px = x * TILE;
      const py = PLAY_Y + y * TILE;
      if (ch === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, TILE, TILE);
        continue;
      }
      const worn = hash2(x, y);
      if (floor === 'carpet' || ch === ',') {
        ctx.fillStyle = worn > 0.85 ? COLORS.carpetDark : COLORS.carpet;
      } else if (floor === 'sleeper') {
        // Blue-grey floor tiles, checker shade, grout lines.
        ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.steel : COLORS.steelLight;
      } else {
        // Wood planks: three tones so the floor reads as boards, not flat.
        ctx.fillStyle = worn > 0.9 ? '#5a3d28' : worn > 0.75 ? COLORS.woodDark : COLORS.wood;
      }
      ctx.fillRect(px, py, TILE, TILE);
      // Tile grout / plank seams.
      ctx.strokeStyle = COLORS.floorLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, TILE, TILE);
      if (floor === 'wood') {
        // Staggered plank joints: the seam lands left or right by row.
        const joint = hash2(x, y + 100) > 0.5 ? 10 : 22;
        ctx.beginPath();
        ctx.moveTo(px + joint, py);
        ctx.lineTo(px + joint, py + TILE);
        ctx.stroke();
        if (ch === '.' || ch === 'P' || ch === 'E' || ch === '*' || ch === 'L' || ch === 'h') {
          ctx.beginPath();
          ctx.moveTo(px, py + TILE / 2);
          ctx.lineTo(px + TILE, py + TILE / 2);
          ctx.stroke();
        }
      } else if (floor === 'carpet' || ch === ',') {
        // Woven diamond on some carpet tiles.
        if (worn > 0.72 && worn < 0.9) {
          ctx.strokeStyle = 'rgba(201, 162, 39, 0.25)';
          ctx.beginPath();
          ctx.moveTo(px + TILE / 2, py + 7);
          ctx.lineTo(px + TILE - 7, py + TILE / 2);
          ctx.lineTo(px + TILE / 2, py + TILE - 7);
          ctx.lineTo(px + 7, py + TILE / 2);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
  }
  // The sleeper car gets a carpet runner down the middle aisle.
  if (floor === 'sleeper') {
    ctx.fillStyle = '#4a1c26';
    ctx.fillRect(14 * TILE, PLAY_Y, 2 * TILE, PLAY_H);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(14 * TILE, PLAY_Y, 2, PLAY_H);
    ctx.fillRect(16 * TILE - 2, PLAY_Y, 2, PLAY_H);
  }
  // The dining car gets a carpet runner down the central aisle (row 9 is
  // open floor all the way across).
  if (floor === 'carpet') {
    ctx.fillStyle = '#4a1c26';
    ctx.fillRect(TILE, PLAY_Y + 9 * TILE, 28 * TILE, TILE);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(TILE, PLAY_Y + 9 * TILE, 28 * TILE, 2);
    ctx.fillRect(TILE, PLAY_Y + 10 * TILE - 2, 28 * TILE, 2);
  }
  // Brass trim along the top and bottom walls.
  ctx.fillStyle = COLORS.brass;
  ctx.fillRect(0, PLAY_Y, PLAY_W, 2);
  ctx.fillRect(0, PLAY_Y + PLAY_H - 2, PLAY_W, 2);
}

// Small floor props, one flavour per car, scattered deterministically on
// open tiles the patrols never cross — the floor reads lived-in, not bare.
function drawFloorProps(ctx, world) {
  const floor = world.def.floor;
  const blocked = new Set();
  const key = (x, y) => x + ',' + y;
  const near = (tx, ty, d) => {
    for (let y = ty - d; y <= ty + d; y++)
      for (let x = tx - d; x <= tx + d; x++) blocked.add(key(x, y));
  };
  for (const l of world.loot) near(l.x, l.y, 1);
  for (const l of world.lamps) near(l.x, l.y, 1);
  for (const h of world.hides) near(h.x, h.y, 1);
  near(world.exit.x, world.exit.y, 1);
  for (let y = 0; y < world.grid.length; y++)
    for (let x = 0; x < world.grid[y].length; x++)
      if (world.grid[y][x] === 'P') near(x, y, 1);
  // Patrol legs: no prop where a conductor walks.
  for (const g of world.def.guards) {
    const wps = g.waypoints;
    for (let i = 0; i < wps.length; i++) {
      const [x1, y1] = wps[i];
      const [x2, y2] = wps[(i + 1) % wps.length];
      const dx = Math.sign(x2 - x1);
      const dy = Math.sign(y2 - y1);
      let x = x1;
      let y = y1;
      blocked.add(key(x, y));
      while (x !== x2 || y !== y2) {
        x += dx;
        y += dy;
        blocked.add(key(x, y));
      }
    }
  }
  for (let y = 0; y < world.grid.length; y++) {
    for (let x = 0; x < world.grid[y].length; x++) {
      const ch = world.grid[y][x];
      if (ch !== '.' && ch !== ',') continue;
      if (blocked.has(key(x, y))) continue;
      if (hash2(x, y) < 0.93) continue;
      const px = x * TILE + TILE / 2;
      const py = PLAY_Y + y * TILE + TILE / 2;
      const kind = hash2(x + 50, y + 50) > 0.5;
      if (floor === 'wood') {
        // Baggage: a small strapped crate, or a coiled rope.
        if (kind) {
          ctx.fillStyle = '#6b4a26';
          ctx.fillRect(px - 6, py - 6, 12, 12);
          ctx.strokeStyle = '#2e1d0e';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px - 6, py - 6, 12, 12);
          ctx.beginPath();
          ctx.moveTo(px, py - 6);
          ctx.lineTo(px, py + 6);
          ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(201, 162, 39, 0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (floor === 'carpet') {
        // Dining: a dropped plate, or a wine glass.
        if (kind) {
          ctx.fillStyle = '#e8e2d0';
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#c9a227';
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(120, 200, 210, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py - 2, 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(px, py + 2);
          ctx.lineTo(px, py + 6);
          ctx.stroke();
        }
      } else {
        // Sleeper: a folded blanket, or a book left on the floor.
        if (kind) {
          ctx.fillStyle = '#2f6f6a';
          ctx.fillRect(px - 7, py - 4, 14, 8);
          ctx.fillStyle = '#255954';
          ctx.fillRect(px - 7, py - 4, 14, 3);
        } else {
          ctx.fillStyle = '#c9a227';
          ctx.fillRect(px - 5, py - 3, 10, 6);
          ctx.fillStyle = '#8a6d3b';
          ctx.fillRect(px - 5, py - 3, 2, 6);
        }
      }
    }
  }
}

function drawLamps(ctx, world) {
  for (const lamp of world.lamps) {
    const at = tileCenter(lamp.x, lamp.y);
    // A wide warm halo first, so lit floor reads against the shadows.
    const halo = ctx.createRadialGradient(at.x, at.y, LAMP_RADIUS * 0.5, at.x, at.y, LAMP_RADIUS * 1.5);
    halo.addColorStop(0, 'rgba(255, 179, 71, 0.10)');
    halo.addColorStop(1, 'rgba(255, 179, 71, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(at.x, at.y, LAMP_RADIUS * 1.5, 0, Math.PI * 2);
    ctx.fill();
    const glow = ctx.createRadialGradient(at.x, at.y, 4, at.x, at.y, LAMP_RADIUS);
    glow.addColorStop(0, 'rgba(255, 179, 71, 0.5)');
    glow.addColorStop(0.55, 'rgba(255, 179, 71, 0.18)');
    glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(at.x, at.y, LAMP_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2118';
    ctx.beginPath();
    ctx.arc(at.x, at.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.lampGlow;
    ctx.beginPath();
    ctx.arc(at.x, at.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCover(ctx, world, now) {
  for (let y = 0; y < world.grid.length; y++) {
    for (let x = 0; x < world.grid[y].length; x++) {
      const ch = world.grid[y][x];
      const px = x * TILE;
      const py = PLAY_Y + y * TILE;
      if (ch === 'T') {
        // Luggage stack: two strapped cases.
        ctx.fillStyle = '#6b4a26';
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = '#54371c';
        ctx.fillRect(px + 2, py + 2, TILE - 4, 8);
        ctx.strokeStyle = '#2e1d0e';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2.5, py + 2.5, TILE - 5, TILE - 5);
        ctx.beginPath();
        ctx.moveTo(px + TILE / 2, py + 2);
        ctx.lineTo(px + TILE / 2, py + TILE - 2);
        ctx.stroke();
      } else if (ch === 'l') {
        // Seat (baggage/sleeper) or dining table (dining car).
        if (world.def.floor === 'carpet') {
          ctx.fillStyle = '#7a5c38';
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#e8e2d0';
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#c9a227';
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (world.def.floor === 'sleeper') {
          // Bunk: teal mattress, white pillow, brass rail.
          ctx.fillStyle = '#2f6f6a';
          ctx.fillRect(px + 3, py + 4, TILE - 6, TILE - 8);
          ctx.fillStyle = '#e8e2d0';
          ctx.fillRect(px + 5, py + 6, 8, TILE - 12);
          ctx.strokeStyle = '#c9a227';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 3.5, py + 4.5, TILE - 7, TILE - 9);
        } else {
          // Mail sack: tan bundle with a tied neck.
          ctx.fillStyle = '#a8845a';
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2 + 3, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#7a5c38';
          ctx.fillRect(px + TILE / 2 - 3, py + 3, 6, 8);
          ctx.strokeStyle = '#54371c';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2 + 3, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (ch === 'h') {
        // Hide spot: a luggage rack, dashed outline until used.
        ctx.strokeStyle = 'rgba(232, 226, 208, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(px + 4.5, py + 4.5, TILE - 9, TILE - 9);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(232, 226, 208, 0.75)';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('HIDE', px + TILE / 2, py + TILE - 6);
        ctx.textAlign = 'left';
      }
    }
  }
  void now;
}

function drawLootExit(ctx, world, now) {
  for (const loot of world.loot) {
    if (loot.taken) continue;
    const at = tileCenter(loot.x, loot.y);
    const pulse = 0.7 + 0.3 * Math.sin(now * 0.004 + loot.x);
    ctx.fillStyle = `rgba(255, 215, 94, ${0.25 * pulse})`;
    ctx.beginPath();
    ctx.arc(at.x, at.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.lootGold;
    ctx.beginPath();
    ctx.arc(at.x, at.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5c10';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('$', at.x, at.y + 3);
    ctx.textAlign = 'left';
  }
  const exitAt = tileCenter(world.exit.x, world.exit.y);
  const eg = ctx.createRadialGradient(exitAt.x, exitAt.y, 2, exitAt.x, exitAt.y, 40);
  eg.addColorStop(0, 'rgba(55, 214, 122, 0.5)');
  eg.addColorStop(1, 'rgba(55, 214, 122, 0)');
  ctx.fillStyle = eg;
  ctx.fillRect(exitAt.x - 40, exitAt.y - 40, 80, 80);
  ctx.fillStyle = '#0e3d24';
  ctx.fillRect(exitAt.x - 13, exitAt.y - 13, 26, 26);
  ctx.strokeStyle = COLORS.exitGreen;
  ctx.lineWidth = 2;
  ctx.strokeRect(exitAt.x - 13, exitAt.y - 13, 26, 26);
  ctx.fillStyle = COLORS.exitGreen;
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', exitAt.x, exitAt.y + 24);
  ctx.textAlign = 'left';
}

function drawCones(ctx, world) {
  for (const guard of world.guards) {
    const poly = conePolygon(world, guard);
    const color =
      guard.state === 'chase'
        ? COLORS.coneAlert
        : guard.state === 'investigate' || guard.state === 'search'
          ? COLORS.coneSuspicious
          : COLORS.coneCalm;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fill();
  }
}

// State mark for a guard's name tag: '!' when suspicious or hunting,
// '?' while investigating a noise, a magnifier while searching the
// last-seen spot. Calm patrol shows no mark — just the name.
function guardMark(guard) {
  if (guard.state === 'chase') return { type: 'bang', color: COLORS.danger };
  if (guard.state === 'search') return { type: 'search', color: '#ff9a2e' };
  if (guard.state === 'investigate') return { type: 'quest', color: '#ff9a2e' };
  if (guard.suspicion >= 50) return { type: 'bang', color: '#ff9a2e' };
  return { type: 'none', color: null };
}

// Name tag above a guard: dark pill bordered in the guard's uniform
// colour, state mark on the left, short name on the right. The pill is
// the only place a guard's name appears on the floor — it is what ties
// each figure to its line in the HUD's conductor list.
function drawGuardNameTag(ctx, guard) {
  const mark = guardMark(guard);
  const name = guard.shortName;
  ctx.font = 'bold 11px monospace';
  const nameW = ctx.measureText(name).width;
  const markW = mark.type === 'none' ? 0 : 12;
  const w = nameW + markW + 14;
  const x0 = guard.x - w / 2;
  const y0 = guard.y - 48;
  ctx.fillStyle = 'rgba(8, 10, 24, 0.88)';
  ctx.fillRect(x0, y0, w, 16);
  ctx.strokeStyle = guard.look.coat;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, 15);
  let tx = x0 + 7;
  ctx.textAlign = 'left';
  if (mark.type === 'bang' || mark.type === 'quest') {
    ctx.fillStyle = mark.color;
    ctx.fillText(mark.type === 'bang' ? '!' : '?', tx, y0 + 12);
    tx += 12;
  } else if (mark.type === 'search') {
    ctx.strokeStyle = mark.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx + 4, y0 + 8, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx + 6.5, y0 + 10.5);
    ctx.lineTo(tx + 9.5, y0 + 13.5);
    ctx.stroke();
    tx += 12;
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name, tx, y0 + 12);
}

function drawGuard(ctx, guard, now) {
  const look = guard.look;
  const r = 12 * look.scale;
  const swing = Math.sin(guard.walkPhase) * 4;
  const bob = Math.sin(now * 0.006 + guard.index * 2) * 1.2;
  ctx.save();
  ctx.translate(guard.x, guard.y + bob * 0.4);
  // Lantern glow — BRAM's lantern burns brightest.
  const glowR = look.feature === 'lantern' ? 34 : 28;
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, glowR);
  glow.addColorStop(0, 'rgba(255, 179, 71, 0.35)');
  glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(guard.dir);
  // Walking feet: dark shoes at the sides, swinging with the stride.
  ctx.fillStyle = '#10101c';
  ctx.beginPath();
  ctx.ellipse(swing, -(r + 1), 3.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-swing, r + 1, 3.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Shoulder nubs: the coat's silhouette widens at the arms.
  ctx.fillStyle = look.coat;
  ctx.beginPath();
  ctx.ellipse(-1, -(r + 0.5), 2.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-1, r + 0.5, 2.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // PIET's long coat: a skirt trailing behind the torso.
  if (look.feature === 'mustache') {
    ctx.fillStyle = look.coat;
    ctx.beginPath();
    ctx.ellipse(-r * 0.55, 0, r * 0.85, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Torso: the uniform coat, trim stripe down the front.
  ctx.fillStyle = look.coat;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = look.trim;
  ctx.fillRect(-2, -r, 4, r * 2);
  // Gold badge on the chest.
  ctx.fillStyle = COLORS.lootGold;
  ctx.beginPath();
  ctx.arc(r * 0.3, -r * 0.5, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Head: skin, facing the way the guard walks.
  const hx = r * 0.85;
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(hx, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  if (look.hat === 'peaked') {
    // Peaked cap: dark crown over the back of the head, brim forward.
    ctx.fillStyle = look.cap;
    ctx.beginPath();
    ctx.arc(hx, 0, 6, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    ctx.fillRect(hx + 3, -3, 5, 6);
  } else {
    // Hair: a dark arc over the head; ROSA wears hers in a bun.
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.arc(hx, 0, 6, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    if (look.feature === 'bun') {
      ctx.beginPath();
      ctx.arc(hx - 6, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (look.feature === 'mustache') {
    // PIET's mustache: a dark band across the front of the face.
    ctx.strokeStyle = '#2e1d0e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx + 4, -3);
    ctx.lineTo(hx + 4, 3);
    ctx.stroke();
  }
  // Lantern held at the side, a warm dot in the dark.
  ctx.fillStyle = COLORS.lampGlow;
  ctx.beginPath();
  ctx.arc(0, r + 2, look.feature === 'lantern' ? 3.5 : 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Suspicion pip above the head — bar only, the mark lives in the tag.
  if (guard.suspicion > 5) {
    const frac = guard.suspicion / 100;
    ctx.fillStyle = '#00000088';
    ctx.fillRect(guard.x - 12, guard.y - 26, 24, 5);
    ctx.fillStyle = guard.suspicion >= 100 ? COLORS.danger : guard.suspicion >= 50 ? '#ff9a2e' : '#ffd75e';
    ctx.fillRect(guard.x - 12, guard.y - 26, 24 * frac, 5);
  }
  drawGuardNameTag(ctx, guard);
}

function drawPlayer(ctx, world, now) {
  const p = world.player;
  if (!p) return;
  const swing = Math.sin(p.walkPhase) * 4;
  ctx.save();
  ctx.globalAlpha = p.hidden ? 0.45 : 1;
  ctx.translate(p.x, p.y);
  // A small warm glow so the Fox reads against the dark floor.
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
  glow.addColorStop(0, 'rgba(232, 177, 60, 0.28)');
  glow.addColorStop(1, 'rgba(232, 177, 60, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fill();
  // A light ring so the Fox pops against the floor at thumbnail size.
  ctx.strokeStyle = 'rgba(232, 177, 60, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 15.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(p.dir);
  // Crouch while sneaking: the Fox squashes along the way he moves.
  ctx.scale(p.sneak ? 0.82 : 1, 1);
  // Walking feet: dark shoes at the sides, swinging with the stride.
  ctx.fillStyle = '#0d0d18';
  ctx.beginPath();
  ctx.ellipse(swing, -13.5, 3.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-swing, 13.5, 3.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Satchel: the Fox's brown bag, slung at the back hip.
  ctx.fillStyle = '#6b4a26';
  ctx.fillRect(-13, 6, 8, 10);
  ctx.strokeStyle = '#2e1d0e';
  ctx.lineWidth = 1;
  ctx.strokeRect(-13, 6, 8, 10);
  // Cloak: dark, hooded, amber trim along the hem.
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.playerScarf;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 13, Math.PI * 0.6, Math.PI * 1.4);
  ctx.stroke();
  // Scarf: amber band across the neck.
  ctx.fillStyle = COLORS.playerScarf;
  ctx.fillRect(-3, -14, 6, 9);
  // Hooded head: dark hood ring around the pale face, mask band across it.
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.arc(9, 0, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8e2d0';
  ctx.beginPath();
  ctx.arc(10.5, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#10101c';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(11.5, -3.5);
  ctx.lineTo(11.5, 3.5);
  ctx.stroke();
  // Sprint: speed lines trail behind the Fox.
  if (p.sprint) {
    ctx.strokeStyle = 'rgba(232, 177, 60, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, -7);
    ctx.lineTo(-14, -7);
    ctx.moveTo(-22, 7);
    ctx.lineTo(-16, 7);
    ctx.stroke();
  }
  ctx.restore();
  if (p.sneak) {
    ctx.fillStyle = 'rgba(232, 226, 208, 0.8)';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAK', p.x, p.y - 22);
    ctx.textAlign = 'left';
  }
}

function drawCoins(ctx, world) {
  for (const coin of world.coins) {
    ctx.fillStyle = COLORS.lootGold;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 94, 0.7)';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (world.noiseFlash) {
    const f = world.noiseFlash;
    ctx.strokeStyle = `rgba(255, 215, 94, ${0.8 * (1 - f.age / f.ttl)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 10 + ((f.age / f.ttl) * f.radius), 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawAnnotations(ctx, world) {
  // Lampblack lesson: teach the mechanics on the action shot itself.
  const labels = world.annotations || [];
  ctx.font = 'bold 12px monospace';
  for (const a of labels) {
    ctx.strokeStyle = 'rgba(232, 226, 208, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a.fromX, a.fromY);
    ctx.lineTo(a.toX, a.toY);
    ctx.stroke();
    ctx.fillStyle = 'rgba(8, 10, 24, 0.88)';
    const w = ctx.measureText(a.text).width + 14;
    ctx.fillRect(a.toX - w / 2, a.toY - 11, w, 20);
    ctx.strokeStyle = a.color || COLORS.brass;
    ctx.strokeRect(a.toX - w / 2, a.toY - 11, w, 20);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(a.text, a.toX, a.toY + 3);
    ctx.textAlign = 'left';
  }
  if (world.fieldNotes) {
    ctx.fillStyle = 'rgba(8, 10, 24, 0.88)';
    ctx.fillRect(14, PLAY_Y + PLAY_H - 118, 250, 104);
    ctx.strokeStyle = COLORS.brass;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(14, PLAY_Y + PLAY_H - 118, 250, 104);
    ctx.fillStyle = COLORS.brass;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('FIELD NOTES', 26, PLAY_Y + PLAY_H - 96);
    ctx.fillStyle = COLORS.text;
    ctx.font = '11px monospace';
    world.fieldNotes.forEach((line, i) => {
      ctx.fillText(line, 26, PLAY_Y + PLAY_H - 76 + i * 16);
    });
  }
}

export function drawPlayfield(ctx, world, now) {
  drawFloor(ctx, world);
  drawFloorProps(ctx, world);
  drawLamps(ctx, world);
  drawCover(ctx, world, now);
  drawLootExit(ctx, world, now);
  drawCones(ctx, world);
  drawCoins(ctx, world);
  for (const guard of world.guards) drawGuard(ctx, guard, now);
  drawPlayer(ctx, world, now);
  if (world.annotations && world.annotations.length) drawAnnotations(ctx, world);
}
