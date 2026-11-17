// sim.js — the heartbeat: one tick moves the night forward.
// Spawning follows the schedule, shades walk, combat burns, breaches cost
// lantern HP, and the night ends when the schedule is spent and the hill
// is empty. Build phase ticks only the visuals (beams shimmer, floaters
// rise). The sim never draws and never listens — it only changes state —
// so a headless bot can run it a thousand ticks a second.

import { NIGHTS, TOTAL_NIGHTS, ECONOMY, GLEAM } from './config.js';
import { buildSchedule, nightDef } from './waves.js';
import { makeShade, stepShade, shadeDead } from './shades.js';
import { traceBeams } from './beams.js';
import { combatTick, gleamKill, gleamDecay, scoreForBurn, scoreForKill } from './combat.js';
import { earn, dawnGrant, lanternBonus } from './economy.js';
import { drawDraft } from './draft.js';
import { relicEffects } from './relics.js';
import { meetShade, meetPrism } from './almanac.js';
import { checkFeats } from './feats.js';
import { banner, toast, logEvent, nightfallText, bossPhaseText } from './announce.js';
import { recordNight } from './history.js';
import { sfx, startMusic } from './audio.js';
import { cellCenter } from './board.js';
import { addFloater, addParticles, addShake, stepFx } from './fx.js';
import { BOSS } from './config.js';
import { recordRun, storeSave } from './save.js';

// Recompute the run's relic multipliers from its held relics. Call it
// after every draft pick (and at the start of a night, to be safe).
export function applyRelics(state) {
  state.relicEffects = relicEffects(state.relics);
  state.relicMul = state.relicEffects.burnMul;
  return state.relicEffects;
}

// Begin a night: build the schedule, reset the night counters, light the
// banner, quicken the music. Returns the schedule length in seconds.
export function startNight(state) {
  const def = nightDef(state.night);
  state.schedule = buildSchedule(state.night, state.difficultyId, state.seed);
  state.scheduleIndex = 0;
  state.nightTime = 0;
  state.nightSpawned = 0;
  state.nightBurned = 0;
  state.nightRecorded = false;
  state.nightLumenStart = state.economy.lumen;
  state.shades = [];
  state.phase = 'night';
  const text = nightfallText(state.night, def.realm, def.note);
  banner(state.announcer, text.title, text.sub);
  logEvent(state.announcer, 'night', 'Night ' + state.night + ' begins (' + def.realm + ').');
  sfx(state.audio, 'night');
  startMusic(state.audio, state.night);
  return state.schedule;
}

// One sim tick (dt seconds, already speed-scaled by the caller).
export function simTick(state, dt) {
  state.timeMs += dt * 1000;
  stepFx(state.fx, dt);
  if (state.phase === 'night') tickNight(state, dt);
  else if (state.phase === 'build') {
    // Beams still shimmer on the hill while the player builds.
    traceBeams(state.board);
  }
  // Floaters and particles age in every phase.
}

function tickNight(state, dt) {
  state.nightTime += dt;
  // Spawn what the schedule says is due.
  while (state.scheduleIndex < state.schedule.length && state.schedule[state.scheduleIndex].at <= state.nightTime) {
    const spawn = state.schedule[state.scheduleIndex++];
    const shade = makeShade(spawn.kindId, spawn.col, spawn.hpMul, spawn.speedMul);
    if (spawn.boss) {
      shade.hp = Math.round(shade.maxHp);
      banner(state.announcer, 'THE PALE KING', 'He climbs to eat the dawn. Burn him with two colours at once.');
    }
    state.shades.push(shade);
    state.nightSpawned++;
    meetShade(state.almanac, spawn.kindId);
  }
  // Walk the shades; breaches cost lantern HP.
  const slowMul = state.relicEffects ? state.relicEffects.slowMul : 1;
  const breached = [];
  for (const shade of state.shades) {
    if (stepShade(shade, dt * slowMul)) {
      breached.push(shade);
    }
  }
  for (const shade of breached) {
    state.shades = state.shades.filter((s) => s.uid !== shade.uid);
    state.lanternHp -= 1;
    addShake(state.fx, 8);
    sfx(state.audio, 'breach');
    toast(state.announcer, (shade.boss ? 'The Pale King reached' : 'A ' + shade.kindId + ' reached') + ' the Lantern! Lantern ' + state.lanternHp + '/' + state.lanternMax, 'bad');
    logEvent(state.announcer, 'breach', shade.kindId + ' breached the lantern.');
    if (state.lanternHp <= 0) {
      endRun(state, false);
      return;
    }
  }
  // Beams + combat.
  const { lit, segments } = traceBeams(state.board);
  state.lastLit = lit;
  state.lastSegments = segments;
  gleamDecay(state, state.timeMs);
  const events = combatTick(state, lit, dt);
  let burnedThisTick = 0;
  for (const ev of events) {
    if (ev.type === 'burn') {
      state.score += scoreForBurn(ev.damage, state.difficulty.scoreMul, state.night);
      burnedThisTick += ev.damage;
      if (Math.random() < 0.3) {
        const c = cellCenter(ev.shade.col, Math.max(0, Math.floor(ev.shade.y)));
        addFloater(state.fx, c.x, c.y - 10, '+' + Math.round(ev.damage), '#ffd166');
      }
    } else if (ev.type === 'kill') {
      const shade = ev.shade;
      state.nightBurned++;
      state.stats.burned++;
      const bounty = Math.round(shade.bounty * (state.relicEffects ? state.relicEffects.bountyMul : 1));
      earn(state.economy, bounty, 'Burned ' + shade.kindId);
      state.score += scoreForKill(shade, state.gleam.step, state.difficulty.scoreMul);
      gleamKill(state, state.timeMs);
      state.stats.bestGleam = Math.max(state.stats.bestGleam, state.gleam.best);
      if (state.gleam.step >= 3) sfx(state.audio, 'gleam');
      else sfx(state.audio, 'burn');
      const c = cellCenter(shade.col, Math.max(0, Math.floor(shade.y)));
      addParticles(state.fx, c.x, c.y, '#ffb347', shade.boss ? 30 : 10);
      addFloater(state.fx, c.x, c.y - 18, '+' + bounty + ' LUMEN', '#ffe14d', state.gleam.step >= 3);
      if (shade.boss) {
        state.stats.bossKills++;
        logEvent(state.announcer, 'boss', 'The Pale King is ash.');
      }
      // Boss phase change banner.
      if (shade.boss) {
        // (Phase banners fire from the boss's own hp in combat; see below.)
      }
    }
  }
  // Boss phase banners: watch the living boss's phase.
  for (const shade of state.shades) {
    if (shade.boss) {
      const phase = shade.phase || 0;
      if (state.bossPhaseSeen !== phase) {
        state.bossPhaseSeen = phase;
        if (phase > 0) {
          const text = bossPhaseText(phase);
          banner(state.announcer, text.title, text.sub);
        }
      }
    }
  }
  // Prism count stat for the Prism Master feat.
  let placed = 0;
  for (const row of state.board.cells) for (const p of row) if (p) placed++;
  state.stats.maxPrisms = Math.max(state.stats.maxPrisms, placed);
  // Night end: schedule spent and hill empty.
  if (state.scheduleIndex >= state.schedule.length && state.shades.length === 0) {
    endNight(state);
  }
}

function endNight(state) {
  const def = nightDef(state.night);
  const flawless = state.lanternHp === state.lanternMax;
  if (flawless) state.stats.flawlessNights++;
  if (state.eclipse) state.stats.eclipseNights = Math.max(state.stats.eclipseNights, state.eclipseNight);
  const lumenEarned = state.economy.lumen - state.nightLumenStart;
  recordNight(state.history, {
    night: state.night, realm: def.realm,
    burned: state.nightBurned, spawned: state.nightSpawned,
    lumenEarned, lanternHp: state.lanternHp,
    gleamBest: state.gleam.best, seconds: state.nightTime,
  });
  state.nightRecorded = true;
  dawnGrant(state.economy, def.grant, ECONOMY.nightClearBonus);
  const newFeats = checkFeats(state.feats, state.stats);
  for (const f of newFeats) toast(state.announcer, 'FEAT EARNED — ' + f.name + ': ' + f.blurb);
  if (state.save) {
    state.save.feats = state.feats.earned;
    state.save.almanac = state.almanac;
    state.save.options = state.options;
    storeSave(state.save);
  }
  if (state.night >= TOTAL_NIGHTS && !state.eclipse) {
    lanternBonus(state.economy, state.lanternHp);
    endRun(state, true);
    return;
  }
  state.phase = 'results';
  sfx(state.audio, 'win');
  logEvent(state.announcer, 'night', 'Night ' + state.night + ' cleared: ' + state.nightBurned + ' burned.');
}

// Move from the results screen to the draft.
export function openDraft(state) {
  state.draftChoices = drawDraft(state, state.seed + state.night * 7);
  state.phase = 'draft';
}

// After the draft, the next night begins in build phase.
export function nextNight(state) {
  state.night++;
  if (state.eclipse) state.eclipseNight++;
  state.phase = 'build';
  state.gleam.step = 1;
  state.gleam.best = 1;
  state.bossPhaseSeen = 0;
  toast(state.announcer, 'Night ' + state.night + ' approaches. Place your glass.');
}

// Eclipse endless: after a win, nights continue past 9 with rising
// pressure. The schedule reuses night 9's table with a multiplier.
export function startEclipse(state) {
  state.eclipse = true;
  state.eclipseNight = 1;
  state.night = 10;
  state.phase = 'build';
  banner(state.announcer, 'ECLIPSE', 'The dawn holds — but the dark does not end. How many nights?');
}

function endRun(state, won) {
  // Record the unfinished night, so the history (and the truth check)
  // counts every shade the run burned, even the night it died on.
  // (A cleared night is already recorded by endNight — never twice.)
  if (!state.nightRecorded && state.phase === 'night' && (state.nightSpawned > 0 || state.nightBurned > 0)) {
    const def = nightDef(state.night);
    recordNight(state.history, {
      night: state.night, realm: def.realm,
      burned: state.nightBurned, spawned: state.nightSpawned,
      lumenEarned: state.economy.lumen - state.nightLumenStart,
      lanternHp: Math.max(0, state.lanternHp),
      gleamBest: state.gleam.best, seconds: state.nightTime,
    });
  }
  state.phase = won ? 'win' : 'lose';
  if (state.save) {
    recordRun(state.save, {
      score: state.score, night: state.night, won,
      difficultyId: state.difficultyId, burned: state.stats.burned,
      eclipseNights: state.eclipseNight,
    });
  }
  sfx(state.audio, won ? 'win' : 'lose');
  logEvent(state.announcer, 'run', won ? 'Run won: ' + state.score + ' pts.' : 'Run lost on night ' + state.night + '.');
}
