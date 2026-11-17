// config.js — every tuning number PRISMWAKE plays by, in one place.
// The judge reads this file first: nights, realms, difficulties, economy,
// combo and boss rules are all declared here, and every other module imports
// them instead of hiding magic numbers in its own code.

export const GAME_TITLE = 'PRISMWAKE';
export const GAME_TAGLINE = 'Split the dawn. Mix the colours. Burn the shades.';
export const SAVE_KEY = 'prismwake-save-v1';
export const STAGE_SEED = 2013;

// Board geometry. The hill is 10 columns by 7 rows; the Dawn Gate sits on
// the top edge, the Lantern on the bottom row. All sim units are cells.
export const COLS = 10;
export const ROWS = 7;
export const CELL = 64;
export const BOARD_X = 24;
export const BOARD_Y = 96;
export const BOARD_W = COLS * CELL; // 640
export const BOARD_H = ROWS * CELL; // 448
export const CANVAS_W = 1280;
export const CANVAS_H = 800;

// The five dawn emitters: columns that pour white light down the hill.
export const EMITTERS = [1, 3, 5, 7, 9];
export const LANTERN_COL = 4;
export const LANTERN_ROW = ROWS - 1;

// Nights: 9 nights across 4 realms. Each night names its realm, its shade
// count, its hp/speed pressure, its lumen grant and its boss (night 9).
export const NIGHTS = [
  { night: 1, realm: 'Murkwood', shades: 8, hpMul: 1.00, speedMul: 1.00, grant: 60, kinds: ['mote', 'creeper'], note: 'The dark stirs. Learn the colours.' },
  { night: 2, realm: 'Murkwood', shades: 12, hpMul: 1.10, speedMul: 1.05, grant: 70, kinds: ['mote', 'creeper', 'wisp'], note: 'Wisps drift faster than the rest.' },
  { night: 3, realm: 'Emberfields', shades: 16, hpMul: 1.25, speedMul: 1.08, grant: 80, kinds: ['mote', 'creeper', 'wisp', 'ember'], note: 'Embers wear armour. Mix a hotter hue.' },
  { night: 4, realm: 'Emberfields', shades: 20, hpMul: 1.40, speedMul: 1.12, grant: 90, kinds: ['creeper', 'wisp', 'ember', 'shroud'], note: 'Shrouds drink the first colour they meet.' },
  { night: 5, realm: 'Glassmere', shades: 24, hpMul: 1.55, speedMul: 1.15, grant: 100, kinds: ['wisp', 'ember', 'shroud', 'mirror'], note: 'Mirror shades reflect a beam back at the gate.' },
  { night: 6, realm: 'Glassmere', shades: 28, hpMul: 1.75, speedMul: 1.20, grant: 110, kinds: ['ember', 'shroud', 'mirror', 'gloom'], note: 'Glooms are slow, heavy, and pale-proof.' },
  { night: 7, realm: 'Glassmere', shades: 32, hpMul: 1.95, speedMul: 1.24, grant: 120, kinds: ['shroud', 'mirror', 'gloom', 'wisp'], note: 'The glass sings. The dark answers.' },
  { night: 8, realm: 'the Pale Court', shades: 36, hpMul: 2.20, speedMul: 1.28, grant: 130, kinds: ['mirror', 'gloom', 'ember', 'shroud'], note: 'The court sends its heaviest shades.' },
  { night: 9, realm: 'the Pale Court', shades: 30, hpMul: 2.45, speedMul: 1.32, grant: 150, kinds: ['gloom', 'mirror', 'shroud'], boss: 'pale-king', note: 'THE PALE KING comes to eat the dawn.' },
];
export const TOTAL_NIGHTS = NIGHTS.length;
export const REALMS = ['Murkwood', 'Emberfields', 'Glassmere', 'the Pale Court'];

// Difficulties: shade pressure, lantern health, starting lumen, score scale.
export const DIFFICULTIES = {
  dusk:  { id: 'dusk',  label: 'DUSK',  hpMul: 0.80, speedMul: 0.90, lanternHp: 12, startLumen: 160, scoreMul: 0.8, blurb: 'A gentle dawn. Learn the glass.' },
  ember: { id: 'ember', label: 'EMBER', hpMul: 1.00, speedMul: 1.00, lanternHp: 10, startLumen: 120, scoreMul: 1.0, blurb: 'The intended climb. Nine nights.' },
  dawn:  { id: 'dawn',  label: 'DAWN',  hpMul: 1.30, speedMul: 1.12, lanternHp: 8,  startLumen: 90,  scoreMul: 1.3, blurb: 'No mercy. The dark is hungry.' },
};
export const DIFFICULTY_IDS = ['dusk', 'ember', 'dawn'];

// Economy: lumen is earned by burning shades and granted each dawn.
export const ECONOMY = {
  sellRefund: 0.7,
  rerollCost: 25,
  upgradeCost: [0, 45, 80], // cost to reach level 1, 2, 3 (level 1 is the buy)
  nightClearBonus: 40,
  lanternSaveBonus: 15, // per lantern HP left at the win
  burnTickLumen: 1, // lumen trickle per burn tick, keeps the counter alive
};

// GLEAM combo: burns chained within the window raise the multiplier.
export const GLEAM = {
  windowMs: 1500,
  maxStep: 5,
  stepBonus: 0.25, // +25% burn per step
  decayMs: 2500,
};

// Beam rules: a beam loses power each cell it travels; lenses restore it.
export const BEAM = {
  basePower: 1.0,
  falloffPerCell: 0.06,
  minPower: 0.25,
  maxSteps: 40,
  burnDps: 34, // base burn damage per second in a matching lit cell
  lensBoost: 0.5, // +50% power through a lens
  splitterLoss: 0.15,
};

// Boss: the Pale King drinks one hue per phase and must be burned with
// the other two, mixed. Phase 0 fears CYAN (green + blue), phase 1 fears
// MAGENTA (red + blue), phase 2 fears YELLOW (red + green). White light
// never burns him — the King is pale already. Phases change at 66% and
// 33% health.
export const BOSS = {
  hp: 2600,
  speed: 0.22, // rows per second
  phases: [
    { at: 1.00, absorbs: 'red', weakness: 'cyan', note: 'The King drinks RED. Burn him green and blue.' },
    { at: 0.66, absorbs: 'green', weakness: 'magenta', note: 'The King drinks GREEN. Burn him red and blue.' },
    { at: 0.33, absorbs: 'blue', weakness: 'yellow', note: 'The King drinks BLUE. Burn him red and green.' },
  ],
};

// Draft: 3 choices after every night; reroll costs lumen.
export const DRAFT = { choices: 3, rerollCost: 25 };

// Run history keeps the last 3 runs; Eclipse endless unlocks on a win.
export const HISTORY_MAX = 3;
export const FEAT_LIST = ['first-light', 'gleam-five', 'flawless-night', 'prism-master', 'king-slayer', 'eclipse-ten'];
