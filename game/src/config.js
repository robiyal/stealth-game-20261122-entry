// NIGHTMAIL — configuration: one place for every number the game tunes.
// A heist aboard the midnight express. Canvas 1280x720: playfield 960 wide
// (30 tiles of 32px) plus a 320px HUD panel on the right.

export const TILE = 32;
export const PLAY_W = 960;
export const PLAY_H = 704;
export const PLAY_Y = 16;
export const PANEL_X = 960;
export const VIEW_W = 1280;
export const VIEW_H = 720;

// Guard sight: how far a lantern cone reaches and how wide it opens.
export const CONE_RANGE = 176;
export const CONE_HALF_ANGLE = 0.61; // ~35 degrees each side
export const CONE_RAYS = 26;

// Movement speeds in pixels per second.
export const PLAYER_WALK = 104;
export const PLAYER_SNEAK = 52;
export const PLAYER_SPRINT = 142;
export const GUARD_PATROL = 52;
export const GUARD_INVESTIGATE = 72;
export const GUARD_CHASE = 92;

// Detection: suspicion fills 0..100 per guard. Rates per second.
export const DETECT_BASE_NEAR = 58;
export const DETECT_BASE_FAR = 12;
export const DETECT_LIT_MULT = 1.6;
export const DETECT_SHADOW_MULT = 0.5;
export const DETECT_SNEAK_MULT = 0.55;
export const DETECT_SPRINT_MULT = 1.3;
export const DETECT_DRAIN = 26;
export const SUSPICIOUS_AT = 50;
export const SPOTTED_AT = 100;

// How long a guard keeps hunting or searching before giving up (seconds).
export const CHASE_MEMORY = 4.0;
export const SEARCH_TIME = 4.5;
export const INVESTIGATE_LOOK = 2.0;

// Noise: coin throw and sprinting draw guards.
export const COIN_RANGE_TILES = 8;
export const COIN_NOISE_RADIUS = 148;
export const COIN_COUNT = 5;
export const SPRINT_NOISE_RADIUS = 82;

// Light: lamp pools and shadow.
export const LAMP_RADIUS = 132;

// Catching: a chasing guard this close to the player ends the level.
export const CATCH_DIST = 20;

// Guard personas: each conductor reads as a different person at a
// glance — own uniform colour, headgear, build and tell. The HUD swatch
// and the floor figure use the same coat colour per guard.
export const GUARD_LOOKS = {
  BRAM: { coat: '#1f2a5e', trim: '#d8b25c', cap: '#0e1430', hair: null, skin: '#e8b98a', scale: 1.15, hat: 'peaked', feature: 'lantern' },
  IDA: { coat: '#1e5e52', trim: '#e8e2d0', cap: null, hair: '#2e1d12', skin: '#f0c8a0', scale: 0.92, hat: 'hair', feature: null },
  PIET: { coat: '#5e3a1f', trim: '#d8b25c', cap: '#3a2410', hair: null, skin: '#e8b98a', scale: 1.1, hat: 'peaked', feature: 'mustache' },
  ROSA: { coat: '#6e2440', trim: '#ffd75e', cap: null, hair: '#1e1410', skin: '#d8a070', scale: 0.95, hat: 'hair', feature: 'bun' },
};

// Colours: warm amber lamps against deep blue night.
export const COLORS = {
  night: '#0b1026',
  panel: '#10162e',
  panelEdge: '#8a6d3b',
  brass: '#c9a227',
  wood: '#503722',
  woodDark: '#402a1a',
  carpet: '#6b2a38',
  carpetDark: '#55202c',
  steel: '#232a3d',
  steelLight: '#2e3752',
  wall: '#1a2033',
  floorLine: '#00000033',
  lampGlow: '#ffb347',
  coneCalm: 'rgba(255, 196, 66, 0.28)',
  coneSuspicious: 'rgba(255, 150, 40, 0.38)',
  coneAlert: 'rgba(255, 60, 50, 0.45)',
  exitGreen: '#37d67a',
  lootGold: '#ffd75e',
  playerCloak: '#2b2f4a',
  playerScarf: '#e8b13c',
  guardNavy: '#1f2a5e',
  guardTrim: '#d8b25c',
  text: '#e8e2d0',
  textDim: '#9a94a8',
  danger: '#ff5a4e',
  ok: '#37d67a',
};
