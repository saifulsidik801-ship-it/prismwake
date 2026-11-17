// combat.js — the burning: every tick, every shade standing in light
// takes burn damage if the light holds its weakness hue. Damage scales
// with beam power, the GLEAM combo, relics, and the boss's absorbed hue.
// Combat returns an event list the sim turns into lumen, floaters, sound
// and the run log — the numbers the truth check rebuilds.

import { BEAM, GLEAM, BOSS } from './config.js';
import { hueBurns } from './hues.js';
import { burnShade, shadeDead, bossPhase } from './shades.js';
import { lightAt } from './beams.js';

// One combat tick over all live shades. `relicMul` is the product of the
// run's relic burn multipliers. Returns events:
//   { type: 'burn', shade, damage, gleam } | { type: 'kill', shade, bounty }
export function combatTick(state, litMap, dt) {
  const events = [];
  const gleamMul = 1 + GLEAM.stepBonus * (state.gleam.step - 1);
  for (const shade of state.shades) {
    shade.burning = false;
    const row = Math.floor(shade.y);
    const cell = lightAt(litMap, shade.col, row);
    if (!cell) continue;
    // The Pale King fears a different mixed hue in each phase: cyan,
    // then magenta, then yellow — and ONLY that exact hue. White light
    // never burns him: he is pale already, and he drinks the colour it
    // holds. Other shades burn when the cell holds their weakness hue.
    let weakness = shade.weakness;
    if (shade.boss) {
      const phase = bossPhase(shade);
      shade.phase = phase;
      weakness = BOSS.phases[phase].weakness;
      if (cell.hue !== weakness) continue;
    } else if (!hueBurns(cell.hue, weakness)) continue;
    const dps = BEAM.burnDps * cell.power * gleamMul * state.relicMul;
    const dealt = burnShade(shade, dps, dt);
    events.push({ type: 'burn', shade, damage: dealt, gleam: state.gleam.step });
    if (shadeDead(shade)) {
      events.push({ type: 'kill', shade, bounty: shade.bounty });
    }
  }
  // Remove the dead (after the loop, so no shade is skipped).
  if (events.some((e) => e.type === 'kill')) {
    const dead = new Set(events.filter((e) => e.type === 'kill').map((e) => e.shade.uid));
    state.shades = state.shades.filter((s) => !dead.has(s.uid));
  }
  return events;
}

// GLEAM combo: each kill refreshes the chain window and raises the step
// (up to x5). The step decays when the window lapses with no kill.
export function gleamKill(state, nowMs) {
  if (nowMs - state.gleam.lastKillMs <= GLEAM.windowMs) {
    state.gleam.step = Math.min(GLEAM.maxStep, state.gleam.step + 1);
  } else {
    state.gleam.step = 2;
  }
  state.gleam.lastKillMs = nowMs;
  state.gleam.best = Math.max(state.gleam.best, state.gleam.step);
}

export function gleamDecay(state, nowMs) {
  if (state.gleam.step > 1 && nowMs - state.gleam.lastKillMs > GLEAM.decayMs) {
    state.gleam.step = 1;
  }
}

// Score for a burn: damage dealt, scaled by difficulty and night.
export function scoreForBurn(damage, difficultyMul, night) {
  return Math.round(damage * difficultyMul * (1 + night * 0.05));
}

// Score for a kill: bounty times ten, times the GLEAM step at the kill.
export function scoreForKill(shade, gleamStep, difficultyMul) {
  return Math.round(shade.bounty * 10 * gleamStep * difficultyMul);
}
