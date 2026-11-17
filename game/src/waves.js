// waves.js — the nights: what climbs the hill, and when.
// Each night is a spawn schedule built from its table in config.js: shades
// are dealt across the 10 lanes in a seeded order, with gaps that tighten
// as the night deepens, and the boss (night 9) walks down the middle lane
// after the escort. The schedule is pure data — the sim just reads it —
// so a replay can rebuild the exact same night from its seed.

import { NIGHTS, COLS, LANTERN_COL, BOSS } from './config.js';
import { makeRng, hashSeed } from './random.js';
import { makeShade } from './shades.js';

export function nightDef(night) {
  if (night <= NIGHTS.length) return NIGHTS[night - 1];
  // Eclipse endless (night 10+): the Pale Court again, heavier each night,
  // no second King — the King stays dead.
  const extra = night - NIGHTS.length;
  const base = NIGHTS[NIGHTS.length - 1];
  return {
    ...base, night,
    shades: base.shades + extra * 4,
    hpMul: base.hpMul + extra * 0.25,
    speedMul: base.speedMul + extra * 0.03,
    grant: base.grant + extra * 10,
    boss: undefined,
    note: 'Eclipse night ' + extra + ': the dark returns, heavier than before.',
  };
}

// Build the spawn schedule for a night on a difficulty.
// Returns [{ at (seconds), kindId, col, hpMul, speedMul, boss }].
// Gaps start at 1.6 s and shrink to 0.7 s; the boss arrives at the end.
export function buildSchedule(night, difficultyId, seed) {
  const def = nightDef(night);
  const rng = makeRng(hashSeed('night-' + night + '-' + difficultyId + '-' + seed));
  const diff = { dusk: { hp: 0.8, sp: 0.9 }, ember: { hp: 1, sp: 1 }, dawn: { hp: 1.3, sp: 1.12 } }[difficultyId];
  const hpMul = def.hpMul * diff.hp;
  const speedMul = def.speedMul * diff.sp;
  const schedule = [];
  const kinds = def.kinds;
  let t = 1.0;
  const lanes = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (let i = 0; i < def.shades; i++) {
    const kindId = kinds[i % kinds.length];
    // Heavier kinds drift to later in the night.
    const heavy = kindId === 'gloom' || kindId === 'mirror';
    const col = lanes[i % COLS];
    schedule.push({
      at: t, kindId, col, hpMul, speedMul, boss: false,
    });
    t += rng.range(0.7, 1.6) * (heavy ? 1.35 : 1.0);
  }
  if (def.boss) {
    schedule.push({
      at: t + 4, kindId: def.boss, col: LANTERN_COL + 1, hpMul: diff.hp, speedMul: diff.sp, boss: true,
    });
  }
  return schedule;
}

// How long the night's spawning lasts (seconds), for the HUD countdown.
export function scheduleLength(schedule) {
  if (!schedule.length) return 0;
  return schedule[schedule.length - 1].at;
}

// The boss's health, scaled by difficulty (the boss ignores night hpMul:
// it is always the same King, only faster or slower).
export function bossStats(difficultyId) {
  const mul = { dusk: 0.8, ember: 1, dawn: 1.3 }[difficultyId] || 1;
  return { hp: Math.round(BOSS.hp * mul), speed: BOSS.speed };
}
