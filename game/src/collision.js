// NIGHTMAIL — tile collision. One job: answer "can this circle stand
// here" and move an entity without letting it through walls.

import { TILE, PLAY_Y } from './config.js';
import { isSolidTile } from './levels.js';

export function tileAtPixel(world, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor((py - PLAY_Y) / TILE);
  return { tx, ty };
}

export function tileChar(world, tx, ty) {
  if (ty < 0 || ty >= world.grid.length) return '#';
  const row = world.grid[ty];
  if (tx < 0 || tx >= row.length) return '#';
  return row[tx];
}

export function walkablePx(world, px, py) {
  const { tx, ty } = tileAtPixel(world, px, py);
  return !isSolidTile(tileChar(world, tx, ty));
}

// A circle of radius r can stand at (px, py) when its four edge points
// are all on walkable tiles.
export function canStand(world, px, py, r) {
  return (
    walkablePx(world, px - r, py - r) &&
    walkablePx(world, px + r, py - r) &&
    walkablePx(world, px - r, py + r) &&
    walkablePx(world, px + r, py + r)
  );
}

// Move axis by axis so the entity slides along walls instead of sticking.
export function moveEntity(world, ent, dx, dy, r) {
  if (dx !== 0 && canStand(world, ent.x + dx, ent.y, r)) ent.x += dx;
  if (dy !== 0 && canStand(world, ent.x, ent.y + dy, r)) ent.y += dy;
}

export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: PLAY_Y + ty * TILE + TILE / 2 };
}
