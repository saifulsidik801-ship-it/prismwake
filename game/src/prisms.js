// prisms.js — the glass: 7 prism types, 3 levels each, with real numbers.
// A prism is the player's only tool. Each type bends white dawn light in
// exactly one way, and every type's numbers are printed here, in the
// almanac, and on its draft card — never three different values.
// Rotation cycles 0..3 (quarter turns) and steers the outgoing beams.

import { ECONOMY } from './config.js';

export const PRISM_TYPES = {
  splitter: {
    id: 'splitter', name: 'Splitter', cost: 30,
    blurb: 'Splits white light into RED and BLUE, fanning left and right — and a dim white core carries on straight.',
    hueOut: ['red', 'blue'], power: 1.0, levelBonus: 0.15,
    shape: 'split', color: '#9db8ff',
  },
  bender: {
    id: 'bender', name: 'Bender', cost: 25,
    blurb: 'Turns a beam 90 degrees. Aim the dawn around a corner.',
    hueOut: ['white'], power: 1.0, levelBonus: 0.10,
    shape: 'bend', color: '#ffd166',
  },
  filter: {
    id: 'filter', name: 'Filter', cost: 35,
    blurb: 'Strains white light into a single pure hue. Pick the hue you need.',
    hueOut: ['red'], power: 1.15, levelBonus: 0.15,
    shape: 'filter', color: '#ff5a5a',
  },
  lens: {
    id: 'lens', name: 'Lens', cost: 40,
    blurb: 'Focuses a beam: +50% burn power in every cell it crosses after.',
    hueOut: ['white'], power: 1.5, levelBonus: 0.2,
    shape: 'lens', color: '#4de8ff',
  },
  mirror: {
    id: 'mirror', name: 'Mirror', cost: 45,
    blurb: 'Throws a beam back up the hill at a diagonal, to catch high shades.',
    hueOut: ['white'], power: 1.0, levelBonus: 0.1,
    shape: 'mirror', color: '#e8ecff',
  },
  dawn: {
    id: 'dawn', name: 'Dawn Prism', cost: 90,
    blurb: 'The rare glass: splits white into RED, GREEN and BLUE at once — and a dim white core carries on straight.',
    hueOut: ['red', 'green', 'blue'], power: 0.9, levelBonus: 0.15,
    shape: 'dawn', color: '#ffffff',
    rare: true,
  },
  veil: {
    id: 'veil', name: 'Veil Prism', cost: 70,
    blurb: 'Weaves MAGENTA and CYAN from white — the mixed hues, ready-made — and a dim white core carries on straight.',
    hueOut: ['magenta', 'cyan'], power: 0.95, levelBonus: 0.15,
    shape: 'veil', color: '#ff5ad0',
    rare: true,
  },
};
export const PRISM_IDS = Object.keys(PRISM_TYPES);

// Filter prisms are born tuned to one hue; rotating a filter cycles its
// hue red -> green -> blue instead of turning the beam.
export const FILTER_HUES = ['red', 'green', 'blue'];

let uidCounter = 1;

export function makePrism(typeId, level = 1) {
  const def = PRISM_TYPES[typeId];
  if (!def) throw new Error('Unknown prism type: ' + typeId);
  return {
    uid: uidCounter++,
    typeId,
    level: Math.max(1, Math.min(3, level)),
    rotation: 0,
    filterHue: 'red',
  };
}

// Burn power of a prism at its level: base power + level bonus per level
// above 1. Level 3 is roughly +30% over level 1 for most glass.
export function prismPower(prism) {
  const def = PRISM_TYPES[prism.typeId];
  return def.power * (1 + def.levelBonus * (prism.level - 1));
}

// Cost to upgrade a prism from its current level to the next.
export function upgradeCost(prism) {
  if (prism.level >= 3) return null;
  return ECONOMY.upgradeCost[prism.level];
}

// Sell value: 70% of everything sunk into the glass (buy + upgrades).
export function sellValue(prism) {
  const def = PRISM_TYPES[prism.typeId];
  let sunk = def.cost;
  for (let l = 1; l < prism.level; l++) sunk += ECONOMY.upgradeCost[l];
  return Math.floor(sunk * ECONOMY.sellRefund);
}

// Rotating a prism: benders, splitters, mirrors and dawn glass turn the
// outgoing beams a quarter-turn; a filter cycles its hue instead.
export function rotatePrism(prism) {
  if (prism.typeId === 'filter') {
    const i = FILTER_HUES.indexOf(prism.filterHue);
    prism.filterHue = FILTER_HUES[(i + 1) % FILTER_HUES.length];
  } else {
    prism.rotation = (prism.rotation + 1) % 4;
  }
  return prism;
}

// The hues this prism throws, given its rotation and filter tuning.
export function prismOutHues(prism) {
  if (prism.typeId === 'filter') return [prism.filterHue];
  return PRISM_TYPES[prism.typeId].hueOut.slice();
}

// Draft weighting: common glass appears often, rare glass (dawn, veil)
// appears rarely, and never before night 3.
export function draftWeight(typeId, night) {
  const def = PRISM_TYPES[typeId];
  if (def.rare && night < 3) return 0;
  return def.rare ? 1 : 3;
}
