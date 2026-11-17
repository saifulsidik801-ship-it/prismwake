// state.js — the run: one object holding everything a game of PRISMWAKE
// is. The state machine is small on purpose — title, build, night, draft,
// results, win, lose, pause — and every transition goes through the
// functions here, so the sim, the renderer and the tools all read the
// same truth. Nothing about the run lives outside this object.

import { DIFFICULTIES, TOTAL_NIGHTS } from './config.js';
import { createBoard } from './board.js';
import { createEconomy } from './economy.js';
import { createAnnouncer } from './announce.js';
import { createAudio } from './audio.js';
import { createAlmanac } from './almanac.js';
import { createFeatState } from './feats.js';
import { createHistory } from './history.js';
import { createOptions } from './options.js';
import { makePrism } from './prisms.js';

export const PHASES = ['title', 'build', 'night', 'draft', 'results', 'win', 'lose', 'paused'];

export function createState(save) {
  return {
    phase: 'title',
    prevPhase: 'build',
    difficultyId: 'ember',
    difficulty: DIFFICULTIES.ember,
    night: 1,
    seed: 2013,
    board: createBoard(),
    hand: [makePrism('splitter'), makePrism('bender'), makePrism('filter')],
    selectedHand: -1,
    hover: null,
    shades: [],
    schedule: [],
    scheduleIndex: 0,
    nightTime: 0,
    nightSpawned: 0,
    nightBurned: 0,
    nightLumenStart: 0,
    lanternHp: DIFFICULTIES.ember.lanternHp,
    lanternMax: DIFFICULTIES.ember.lanternHp,
    economy: createEconomy(DIFFICULTIES.ember.startLumen),
    relics: [],
    relicMul: 1,
    relicEffects: null,
    gleam: { step: 1, lastKillMs: 0, best: 1 },
    score: 0,
    stats: { burned: 0, bestGleam: 1, flawlessNights: 0, maxPrisms: 0, bossKills: 0, eclipseNights: 0 },
    draftChoices: [],
    announcer: createAnnouncer(),
    audio: createAudio(),
    almanac: save ? save.almanac : createAlmanac(),
    feats: createFeatState(),
    history: createHistory(),
    options: createOptions(save ? save.options : null),
    save,
    eclipse: false,
    eclipseNight: 0,
    fx: { floaters: [], particles: [], shake: 0 },
    ui: { shopOpen: false, almanacOpen: false, optionsOpen: false, helpOpen: false, selectedPlaced: null },
    hint: null,
    timeMs: 0,
    log: [],
  };
}

// Start a fresh run on a difficulty. The hand opens with the three
// teaching pieces of glass; the lantern and lumen come from the difficulty.
export function startRun(state, difficultyId, seed) {
  const diff = DIFFICULTIES[difficultyId] || DIFFICULTIES.ember;
  state.difficultyId = difficultyId;
  state.difficulty = diff;
  state.seed = seed || Math.floor(Math.random() * 100000);
  state.night = 1;
  state.board = createBoard();
  state.hand = [makePrism('splitter'), makePrism('bender'), makePrism('filter')];
  state.selectedHand = -1;
  state.shades = [];
  state.schedule = [];
  state.scheduleIndex = 0;
  state.nightTime = 0;
  state.lanternHp = diff.lanternHp;
  state.lanternMax = diff.lanternHp;
  state.economy = createEconomy(diff.startLumen);
  state.relics = [];
  state.relicMul = 1;
  state.gleam = { step: 1, lastKillMs: 0, best: 1 };
  state.score = 0;
  state.stats = { burned: 0, bestGleam: 1, flawlessNights: 0, maxPrisms: 0, bossKills: 0, eclipseNights: 0 };
  state.history = createHistory();
  state.eclipse = false;
  state.eclipseNight = 0;
  state.ui = { shopOpen: false, almanacOpen: false, optionsOpen: false, helpOpen: false, selectedPlaced: null };
  state.hint = null;
  state.phase = 'build';
  state.log = [];
  return state;
}

export function isPlaying(state) {
  return state.phase === 'night' || state.phase === 'build';
}

export function isNightOver(state) {
  return state.scheduleIndex >= state.schedule.length && state.shades.length === 0;
}

export function nightWon(state) {
  return state.night >= TOTAL_NIGHTS && isNightOver(state);
}
