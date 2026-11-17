// hues.js — PRISMWAKE's colour model, the heart of the game.
// Light is three components: red, green, blue. A beam carries a set of
// components; when two beams cross in a cell their components UNION, so
// red + green makes yellow, red + blue makes magenta, green + blue makes
// cyan, and all three make white. A shade burns when the cell it stands
// in holds every component of its weakness hue: a yellow shade burns in
// yellow light — or in white light, which holds every colour. Raw white
// dawn light is strong but narrow (five lanes); the player's glass spreads
// it, bends it and mixes it into the hues the dark fears. That single
// rule is the whole puzzle. (The Pale King is the exception: he fears
// only one mixed hue per phase, and white never burns him.)

export const COMPONENTS = ['red', 'green', 'blue'];

// Every hue: its components, its canvas colour, its dark variant, and the
// colour-blind pattern drawn over it (shape, not just colour).
export const HUES = {
  red:     { id: 'red',     components: ['red'],               color: '#ff5a5a', dark: '#a83232', pattern: 'slash',  label: 'RED',     glyph: 'R' },
  green:   { id: 'green',   components: ['green'],             color: '#5aff8a', dark: '#2fae5c', pattern: 'dots',   label: 'GREEN',   glyph: 'G' },
  blue:    { id: 'blue',    components: ['blue'],              color: '#5aa8ff', dark: '#2f6fc4', pattern: 'rings',  label: 'BLUE',    glyph: 'B' },
  yellow:  { id: 'yellow',  components: ['red', 'green'],      color: '#ffe14d', dark: '#b89a1e', pattern: 'cross',  label: 'YELLOW',  glyph: 'Y' },
  magenta: { id: 'magenta', components: ['red', 'blue'],       color: '#ff5ad0', dark: '#b02a8c', pattern: 'tri',    label: 'MAGENTA', glyph: 'M' },
  cyan:    { id: 'cyan',    components: ['green', 'blue'],     color: '#4de8ff', dark: '#1d9ab5', pattern: 'waves',  label: 'CYAN',    glyph: 'C' },
  white:   { id: 'white',   components: ['red', 'green', 'blue'], color: '#ffffff', dark: '#c9c9c9', pattern: 'star', label: 'WHITE', glyph: 'W' },
};
export const HUE_IDS = ['red', 'green', 'blue', 'yellow', 'magenta', 'cyan', 'white'];
export const PRIMARY_IDS = ['red', 'green', 'blue'];

// Union two component sets into the hue they make. ['red'] + ['green']
// is yellow; ['red','green'] + ['blue'] is white. Order-free.
export function mixComponents(a, b) {
  const set = new Set([...(a || []), ...(b || [])]);
  for (const hue of HUE_IDS) {
    const comps = HUES[hue].components;
    if (comps.length === set.size && comps.every((c) => set.has(c))) return hue;
  }
  return 'white';
}

// Does the light in a cell burn a shade weak to `weakness`? The cell
// must hold every component of the weakness hue. White light holds them
// all, so it burns every shade but a pale one — and pale shades need
// white itself. Mixed hues need a real mix on the cell.
export function hueBurns(cellHue, weakness) {
  if (!cellHue || !weakness) return false;
  const have = new Set(HUES[cellHue].components);
  return HUES[weakness].components.every((c) => have.has(c));
}

// The hue a shade fears, from its kind id. Used by the HUD legend, the
// almanac and the burn check — one source of truth, never re-typed.
export function weaknessOf(kindId) {
  return SHADE_WEAKNESS[kindId] || 'red';
}

export const SHADE_WEAKNESS = {
  mote: 'red',
  creeper: 'green',
  wisp: 'blue',
  ember: 'yellow',
  shroud: 'magenta',
  mirror: 'cyan',
  gloom: 'white',
  'pale-king': 'white',
};

// What a prism does to a beam, by prism type. Splitter: white in, red
// left-diagonal and blue right-diagonal out. Filter: white in, one hue
// out. Bender: turns the beam 90 degrees. Lens: same hue, more power.
// Mirror: turns the beam back up the way it came, at a diagonal.
// Dawn prism: white in, red + green + blue fanning out.
export const PRISM_BEAM_RULES = {
  splitter: { in: 'white', out: ['red', 'blue'], turns: [-1, 1] },
  filter: { in: 'white', out: ['red'], turns: [0] },
  bender: { in: 'white', out: ['white'], turns: [1] },
  lens: { in: 'white', out: ['white'], turns: [0] },
  mirror: { in: 'white', out: ['white'], turns: [-2] },
  dawn: { in: 'white', out: ['red', 'green', 'blue'], turns: [-1, 0, 1] },
  veil: { in: 'white', out: ['magenta', 'cyan'], turns: [-1, 1] },
};

// Human-readable colour recipes shown in the almanac and draft cards.
export function recipeText(hueId) {
  const parts = { red: 'RED', green: 'GREEN', blue: 'BLUE' };
  return HUES[hueId].components.map((c) => parts[c]).join(' + ');
}
