// NIGHTMAIL — the three cars of the midnight express.
// Tiles: '#' wall, '.' wood floor, ',' carpet, 'T' tall cover (blocks move
// and sight), 'l' low cover (blocks move; blocks sight only while the
// player sneaks), 'L' lamp (floor + light), 'h' hide spot, 'P' player
// start, 'E' exit, '*' loot. Every row is 30 tiles, every map 22 rows.
// Guard patrols are axis-aligned legs along open corridors — no leg ever
// crosses a solid tile (checked by tools/validate-levels.mjs).

export const LEVELS = [
  {
    name: 'CAR 1 — BAGGAGE',
    subtitle: 'The Baggage Car',
    objective: 'Steal 3 mail sacks, then reach the green exit unseen.',
    lootName: 'mail sacks',
    parTime: 75,
    floor: 'wood',
    map: [
      '##############################',
      '#.............TT.............#',
      '#..P..........TT......*......#',
      '#.............TT.............#',
      '#..ll.........TT.....ll......#',
      '#..ll.........TT.....ll......#',
      '#............................#',
      '#..TT..........L.............#',
      '#..TT........................#',
      '#............................#',
      '#......*........TT...........#',
      '#..............TT............#',
      '#..ll..........TT............#',
      '#..ll..........TT....ll......#',
      '#....................ll......#',
      '#..TT........................#',
      '#..TT.....L..........L.......#',
      '#.......h....................#',
      '#.....*.............E........#',
      '#............................#',
      '#.....h......................#',
      '##############################',
    ],
    guards: [
      { name: 'CON-1 BRAM', waypoints: [[6, 6], [24, 6], [24, 9], [6, 9]] },
      { name: 'CON-2 IDA', waypoints: [[8, 19], [24, 19], [24, 17], [8, 17]] },
    ],
  },
  {
    name: 'CAR 2 — DINING',
    subtitle: 'The Dining Car',
    objective: 'Steal 4 jewel cases, then reach the green exit unseen.',
    lootName: 'jewel cases',
    parTime: 100,
    floor: 'carpet',
    map: [
      '##############################',
      '#,,,,,,,,,,,,,TT,,,,,,,,,,,,,#',
      '#,,P,,,,,,,,,,TT,,,,,,*,,,,,,#',
      '#,,,,,,,,,,,,,TT,,,,,,,,,,,,,#',
      '#,,ll,,,,,,,,,TT,,,,,ll,,,,,,#',
      '#,,ll,,,,,,,,,TT,,,,,ll,,,,,,#',
      '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
      '#,,TT,,,,,,,,,,L,,,,,,,,,,,,,#',
      '#,,TT,,,,,,,,,,,,,,,,,,,,,,,,#',
      '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
      '#,,,,,,*,,,,,,,,TT,,,,,,,,,,,#',
      '#,,,,,,,,,,,,,,TT,,,,*,,,,,,,#',
      '#,,ll,,,,,,,,,,TT,,,,,,,,,,,,#',
      '#,,ll,,,,,,,,,,TT,,,,ll,,,,,,#',
      '#,,,,,,,,,,,,,,,,,,,,ll,,,,,,#',
      '#,,TT,,,,,,,,,,,,,,,,,,,,,,,,#',
      '#,,TT,,,,,L,,,,,,,,,,L,,,,,,,#',
      '#,,,,,,,h,,,,,,,,,,,,,,,,,,,,#',
      '#,,,,,*,,,,,,,,,,,,,E,,,,,,,,#',
      '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
      '#,,,,,h,,,,,,,,,,,,,,,,,,,,,,#',
      '##############################',
    ],
    guards: [
      { name: 'CON-1 BRAM', waypoints: [[6, 6], [24, 6], [24, 9], [6, 9]] },
      { name: 'CON-2 IDA', waypoints: [[8, 19], [24, 19], [24, 17], [8, 17]] },
      { name: 'CON-3 PIET', waypoints: [[10, 6], [10, 8], [16, 8], [16, 6]] },
    ],
  },
  {
    name: 'CAR 3 — SLEEPER',
    subtitle: 'The Sleeper Car',
    objective: 'Crack the mail safe, take 5 prizes, reach the exit unseen.',
    lootName: 'prizes',
    parTime: 120,
    floor: 'sleeper',
    map: [
      '##############################',
      '#.............TT.............#',
      '#..P....*.....TT.....*.......#',
      '#.............TT.............#',
      '#..ll....TT...TT.....ll......#',
      '#..ll....TT...TT.....ll......#',
      '#......TT..........TT........#',
      '#..TT..........L.....TT......#',
      '#..TT................TT......#',
      '#............TT..............#',
      '#......*........TT....*......#',
      '#..............TT............#',
      '#..ll..........TT....ll......#',
      '#..ll....TT...TT....ll.......#',
      '#....................ll......#',
      '#..TT..........TT............#',
      '#..TT.....L..........L.......#',
      '#.......h....................#',
      '#.....*.............E........#',
      '#............................#',
      '#.....h..............TT......#',
      '##############################',
    ],
    guards: [
      { name: 'CON-1 BRAM', waypoints: [[6, 2], [6, 9], [12, 9], [12, 2]] },
      { name: 'CON-2 IDA', waypoints: [[24, 3], [24, 9], [18, 9], [18, 3]] },
      { name: 'CON-3 PIET', waypoints: [[6, 12], [6, 19], [12, 19], [12, 12]] },
      { name: 'CON-4 ROSA', waypoints: [[24, 17], [24, 19], [18, 19], [18, 17]] },
    ],
  },
];

// Parse a level map into the pieces the game needs. Loot, lamps, hide
// spots, the player start and the exit are all read out of the strings,
// so the map is the single source of truth for the layout.
export function parseLevel(def) {
  const grid = def.map.map((row) => row.split(''));
  const loot = [];
  const lamps = [];
  const hides = [];
  let playerStart = null;
  let exit = null;
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const t = grid[y][x];
      if (t === 'P') playerStart = { x, y };
      else if (t === 'E') exit = { x, y };
      else if (t === '*') loot.push({ x, y, taken: false });
      else if (t === 'L') lamps.push({ x, y });
      else if (t === 'h') hides.push({ x, y });
    }
  }
  return { def, grid, loot, lamps, hides, playerStart, exit };
}

export function isSolidTile(ch) {
  return ch === '#' || ch === 'T' || ch === 'l';
}

export function blocksSightTile(ch) {
  return ch === '#' || ch === 'T';
}
