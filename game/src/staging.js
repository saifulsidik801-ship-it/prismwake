// staging.js — honest screenshots: every shot is a real run.
// The staging planner picks the cover tick the way the top entries do: a
// deterministic bot run (seed 2013) plays, and the planner stops it at the
// tick with the most on screen — many shades, a GLEAM chain, bright beams.
// Title, draft and win are real states too (a real title, a real draft
// after night 1, a real win from a real bot run). Nothing is painted.
// ?shot=title|cover|draft|win&seed=2013 in the URL selects the shot.

import { STAGE_SEED } from './config.js';
import { createState, startRun } from './state.js';
import { loadSave } from './save.js';
import { botPlayUntil, botPlayRun, botPlayNight, botBuild } from './bot.js';
import { startNight, openDraft, applyRelics } from './sim.js';
import { traceBeams } from './beams.js';

export const SHOT_NAMES = ['title', 'cover', 'draft', 'win'];

// Transient banners and toasts are timed UI, not game state: a staged
// frame clears them so the shot shows the hill, not a banner mid-fade.
function clearTransient(state) {
  state.announcer.banner = null;
  state.announcer.toasts = [];
}

// Build the state for one shot. Returns { state, lit, segments, note }.
export function stageShot(kind, seed = STAGE_SEED) {
  if (kind === 'title') {
    const state = createState(null);
    state.phase = 'title';
    state.hint = null;
    return { state, ...lightFor(state), note: 'Title screen, dawn difficulty selected.' };
  }
  if (kind === 'draft') {
    const state = createState(loadSave());
    const res = botPlayUntil(state, 'ember', seed, (s) => s.phase === 'draft', 0.1);
    if (!res.reached) {
      // Fallback: play night 1 by hand and open the draft.
      botPlayNight(state, 0.1);
      if (state.phase === 'results') openDraft(state);
    }
    clearTransient(state);
    return { state, ...lightFor(state), note: 'Draft after night ' + state.night + ': ' + state.draftChoices.length + ' choices.' };
  }
  if (kind === 'win') {
    const state = createState(loadSave());
    // A real bot run on DUSK (the gentlest dawn) to a real win.
    const report = botPlayRun(state, 'dusk', seed, 0.1);
    if (report.phase !== 'win') {
      // The bot fell. Play again on dusk with a different seed; the win
      // shot must come from a real win, never a painting.
      const state2 = createState(loadSave());
      const report2 = botPlayRun(state2, 'dusk', seed + 41, 0.1);
      if (report2.phase === 'win') { clearTransient(state2); return { state: state2, ...lightFor(state2), note: 'Win on DUSK, seed ' + (seed + 41) + ', score ' + report2.score + '.' }; }
      return { state, ...lightFor(state), note: 'BOT DID NOT WIN (phase ' + report.phase + ') — win shot is NOT honest yet.' };
    }
    clearTransient(state);
    return { state, ...lightFor(state), note: 'Win on DUSK, seed ' + seed + ', score ' + report.score + ', ' + report.burned + ' burned.' };
  }
  // cover: night 4, mid-wave, many shades, GLEAM climbing.
  const state = createState(loadSave());
  const res = botPlayUntil(state, 'ember', seed, (s) => {
    return s.phase === 'night' && s.night === 4 && s.shades.length >= 12 && s.gleam.step >= 2;
  }, 0.1);
  if (!res.reached) {
    // Second try: any night-4 moment with 8+ shades on the hill.
    const state2 = createState(loadSave());
    const res2 = botPlayUntil(state2, 'ember', seed, (s) => {
      return s.phase === 'night' && s.night === 4 && s.shades.length >= 8;
    }, 0.1);
    if (res2.reached) { clearTransient(state2); return { state: state2, ...lightFor(state2), note: 'Cover: night 4, ' + state2.shades.length + ' shades, GLEAM x' + state2.gleam.step + '.' }; }
    return { state, ...lightFor(state), note: 'COVER PLANNER MISSED (phase ' + state.phase + ', night ' + state.night + ') — cover is NOT staged yet.' };
  }
  clearTransient(state);
  return { state, ...lightFor(state), note: 'Cover: night 4, ' + state.shades.length + ' shades, GLEAM x' + state.gleam.step + ', ' + state.nightBurned + ' burned.' };
}

function lightFor(state) {
  const { lit, segments } = traceBeams(state.board);
  return { lit, segments };
}

// The cover tick, chosen by the planner: the bot run's best frame is the
// one with the most shades, the highest GLEAM and the most lit cells.
// (Kept as a function so the shots tool can re-plan without re-running.)
export function coverScore(state, lit) {
  return state.shades.length * 10 + state.gleam.step * 5 + lit.size;
}
