// shades.js — the dark: 8 shade kinds plus the Pale King boss.
// Each shade walks straight down its lane toward the Lantern, and each one
// fears exactly one hue — the weakness printed on its body, in the HUD
// legend and in the almanac. Armour soaks the first points of every burn
// tick; speed is rows per second; bounty is the lumen paid for its burning.

import { weaknessOf } from './hues.js';
import { LANTERN_COL } from './config.js';

export const SHADE_KINDS = {
  mote: {
    id: 'mote', name: 'Mote', hp: 40, speed: 0.55, armour: 0, bounty: 6,
    color: '#8a7fd6', size: 13,
    blurb: 'A speck of dark. Burns RED — the first lesson of the dawn.',
  },
  creeper: {
    id: 'creeper', name: 'Creeper', hp: 70, speed: 0.42, armour: 0, bounty: 8,
    color: '#5a7d4a', size: 16,
    blurb: 'Slow and stubborn. Burns GREEN.',
  },
  wisp: {
    id: 'wisp', name: 'Wisp', hp: 55, speed: 0.85, armour: 0, bounty: 9,
    color: '#7fb8d6', size: 12,
    blurb: 'Fast and thin. Burns BLUE — catch it before it passes.',
  },
  ember: {
    id: 'ember', name: 'Ember', hp: 120, speed: 0.5, armour: 6, bounty: 14,
    color: '#d68a3a', size: 17,
    blurb: 'Armoured in cinders. Burns YELLOW: red and green must meet on it.',
  },
  shroud: {
    id: 'shroud', name: 'Shroud', hp: 150, speed: 0.45, armour: 10, bounty: 18,
    color: '#b45ad6', size: 18,
    blurb: 'Drinks the first colour it meets. Burns MAGENTA: red and blue together.',
  },
  mirror: {
    id: 'mirror', name: 'Mirror Shade', hp: 180, speed: 0.4, armour: 8, bounty: 22,
    color: '#4ad6c8', size: 18,
    blurb: 'Polished dark that throws light aside. Burns CYAN: green and blue together.',
  },
  gloom: {
    id: 'gloom', name: 'Gloom', hp: 320, speed: 0.3, armour: 14, bounty: 30,
    color: '#3a3f5a', size: 22,
    blurb: 'Heavy as a held breath. Burns WHITE only — all three colours at once.',
  },
  'pale-king': {
    id: 'pale-king', name: 'The Pale King', hp: 2600, speed: 0.22, armour: 20, bounty: 500,
    color: '#e8e4d8', size: 30,
    blurb: 'He eats one colour of the dawn per phase. Burn him with the other two.',
    boss: true,
  },
};
export const SHADE_IDS = Object.keys(SHADE_KINDS);

let shadeUid = 1;

// A live shade on the hill: lane column, fractional row, health, and the
// phase it is in (boss only). y is in rows; the shade breaches at row 6.
export function makeShade(kindId, col, hpMul, speedMul) {
  const def = SHADE_KINDS[kindId];
  if (!def) throw new Error('Unknown shade kind: ' + kindId);
  return {
    uid: shadeUid++,
    kindId,
    weakness: weaknessOf(kindId),
    col,
    x: col, // fractional column: shades drift toward the lantern as they walk
    y: -0.5, // spawns half a row above the gate, walks in
    hp: Math.round(def.hp * hpMul),
    maxHp: Math.round(def.hp * hpMul),
    speed: def.speed * speedMul,
    armour: def.armour,
    bounty: def.bounty,
    boss: !!def.boss,
    phase: 0,
    burning: false,
    flash: 0,
  };
}

// Move a shade down its lane for dt seconds, drifting toward the lantern
// column as it walks — the dark converges on the light, so the beams near
// the lantern matter most. Returns true if it reached the lantern row.
export function stepShade(shade, dt) {
  shade.y += shade.speed * dt;
  const drift = Math.max(-1, Math.min(1, LANTERN_COL - shade.x)) * 0.35 * dt;
  shade.x += drift;
  shade.col = Math.max(0, Math.min(9, Math.floor(shade.x)));
  return shade.y >= 6.0;
}

// Apply one burn tick: damage after armour, scaled by beam power and the
// GLEAM multiplier. Returns the damage actually dealt.
export function burnShade(shade, dps, dt) {
  const raw = dps * dt;
  const dealt = Math.max(0, raw - shade.armour * dt * 0.5);
  shade.hp -= dealt;
  shade.burning = true;
  shade.flash = 0.12;
  return dealt;
}

export function shadeDead(shade) {
  return shade.hp <= 0;
}

// Boss phase from remaining health fraction: phases change at 66% and 33%.
export function bossPhase(shade) {
  if (!shade.boss) return 0;
  const frac = shade.hp / shade.maxHp;
  if (frac <= 0.33) return 2;
  if (frac <= 0.66) return 1;
  return 0;
}
