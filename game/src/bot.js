// bot.js — the greedy dawn: a headless player for staging and playtests.
// The bot places glass by a simple rule (splitters and dawn glass under
// the emitters, lenses behind them, filters where a lane is dark), buys
// what it can afford, drafts the first relic it is offered, and plays
// night after night. It is not clever — it is honest: every staged
// screenshot and every truth check is a real bot run, not a painting.

import { EMITTERS, COLS, ROWS } from './config.js';
import { canPlace, placePrism } from './board.js';
import { buyPrism } from './economy.js';
import { applyDraftChoice } from './draft.js';
import { startNight, simTick, openDraft, nextNight, applyRelics } from './sim.js';
import { startRun } from './state.js';
import { makePrism } from './prisms.js';

// Where a prism wants to live: under an emitter for splitters and dawn
// glass (rows 1-2), mid-hill for lenses and filters, anywhere free for
// the rest. Returns { col, row } or null when the hill is full.
export function bestCellFor(state, prism) {
  const type = prism.typeId;
  const rows = type === 'splitter' || type === 'dawn' || type === 'veil' ? [1, 2, 3] : [2, 3, 4, 5];
  const cols = type === 'lens' ? EMITTERS.slice() : [...EMITTERS, 2, 4, 6, 8, 0];
  for (const row of rows) {
    for (const col of cols) {
      if (canPlace(state.board, col, row).ok) return { col, row };
    }
  }
  for (let r = 1; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (canPlace(state.board, c, r).ok) return { col: c, row: r };
    }
  }
  return null;
}

// Tune a filter to cover a weakness the hill still lacks: filters cycle
// red -> green -> blue across placements, so the three pure hues are all
// on the hill by the third filter.
let filterCycle = 0;
function tuneFilter(state, prism) {
  if (prism.typeId !== 'filter') return prism;
  prism.filterHue = FILTER_HUES[filterCycle++ % FILTER_HUES.length];
  return prism;
}

import { FILTER_HUES } from './prisms.js';

// Place every prism in the hand, then buy the best affordable glass and
// place that too (up to 5 buys a build phase). Splitters alternate their
// rotation so the fans cover both sides of the hill.
export function botBuild(state) {
  let placed = 0;
  let splitCount = 0;
  while (state.hand.length > 0) {
    const prism = state.hand[0];
    tuneFilter(state, prism);
    if (prism.typeId === 'splitter') prism.rotation = splitCount++ % 2;
    const cell = bestCellFor(state, prism);
    if (!cell) break;
    placePrism(state.board, cell.col, cell.row, prism);
    state.hand.shift();
    placed++;
  }
  const shopOrder = ['filter', 'splitter', 'lens', 'bender', 'mirror', 'veil', 'dawn'];
  let buys = 0;
  for (const typeId of shopOrder) {
    if (buys >= 5) break;
    const bought = buyPrism(state.economy, typeId);
    if (!bought.ok) continue;
    const prism = makePrism(typeId, 1);
    tuneFilter(state, prism);
    if (prism.typeId === 'splitter') prism.rotation = splitCount++ % 2;
    const cell = bestCellFor(state, prism);
    if (!cell) { state.hand.push(prism); break; }
    placePrism(state.board, cell.col, cell.row, prism);
    buys++;
  }
  return placed + buys;
}

// Pick a draft card: relics first, then dawn glass, then anything.
export function botDraftPick(state) {
  const choices = state.draftChoices;
  const relic = choices.findIndex((c) => c.kind === 'relic');
  if (relic >= 0) return relic;
  const dawn = choices.findIndex((c) => c.typeId === 'dawn');
  if (dawn >= 0) return dawn;
  return 0;
}

// Play one night to its end (or the run's end). dt is fixed for
// determinism; maxTicks bounds a runaway.
export function botPlayNight(state, dt = 0.1, maxTicks = 20000) {
  if (state.phase === 'build') {
    botBuild(state);
    startNight(state);
  }
  let ticks = 0;
  while (state.phase === 'night' && ticks++ < maxTicks) {
    simTick(state, dt);
  }
  return { phase: state.phase, ticks, night: state.night, lanternHp: state.lanternHp };
}

// Play a whole run: nights, drafts, results, until win or lose.
// Returns the finished state and a short report.
export function botPlayRun(state, difficultyId, seed, dt = 0.1) {
  startRun(state, difficultyId, seed);
  applyRelics(state);
  let nights = 0;
  while ((state.phase === 'build' || state.phase === 'night' || state.phase === 'results' || state.phase === 'draft') && nights < 30) {
    if (state.phase === 'build') {
      botPlayNight(state, dt);
    } else if (state.phase === 'results') {
      openDraft(state);
    } else if (state.phase === 'draft') {
      const pick = botDraftPick(state);
      applyDraftChoice(state, state.draftChoices[pick]);
      applyRelics(state);
      nextNight(state);
      nights++;
    } else {
      break;
    }
  }
  return {
    phase: state.phase, score: state.score, night: state.night,
    burned: state.stats.burned, lanternHp: state.lanternHp,
    lumen: state.economy.lumen, nights,
  };
}

// Play until a target condition (used by staging): the predicate sees the
// state each tick and stops the run when true.
export function botPlayUntil(state, difficultyId, seed, until, dt = 0.1, maxTicks = 60000) {
  startRun(state, difficultyId, seed);
  applyRelics(state);
  let ticks = 0;
  while (ticks++ < maxTicks) {
    if (until(state)) return { reached: true, ticks };
    if (state.phase === 'build') {
      botBuild(state);
      startNight(state);
    } else if (state.phase === 'night') {
      simTick(state, dt);
    } else if (state.phase === 'results') {
      openDraft(state);
    } else if (state.phase === 'draft') {
      const pick = botDraftPick(state);
      applyDraftChoice(state, state.draftChoices[pick]);
      applyRelics(state);
      nextNight(state);
    } else {
      return { reached: false, ticks, phase: state.phase };
    }
  }
  return { reached: false, ticks, phase: state.phase };
}
