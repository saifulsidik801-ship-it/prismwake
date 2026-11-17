// save.js — persistence: best scores, feats, almanac, run history.
// One localStorage key, one JSON blob, guarded reads (a corrupt or older
// save never crashes the game — it is replaced). The save never leaves the
// player's browser; there is no account, no network, nothing to leak.

import { SAVE_KEY, HISTORY_MAX, DIFFICULTY_IDS } from './config.js';

export function defaultSave() {
  const best = {};
  for (const id of DIFFICULTY_IDS) best[id] = { score: 0, night: 0, wins: 0 };
  return {
    version: 1,
    best,
    feats: {},
    almanac: { shadesMet: {}, prismsMet: {}, relicsMet: {} },
    history: [],
    options: { volume: 0.7, muted: false, shake: true, speed: 1, colorBlind: false, music: true },
    eclipseBest: 0,
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return defaultSave();
    const fresh = defaultSave();
    return {
      ...fresh,
      ...data,
      best: { ...fresh.best, ...(data.best || {}) },
      options: { ...fresh.options, ...(data.options || {}) },
    };
  } catch (e) {
    return defaultSave();
  }
}

export function storeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch (e) {
    return false;
  }
}

// Record a finished run: best score per difficulty, wins, history (last 3).
export function recordRun(save, run) {
  const best = save.best[run.difficultyId];
  if (best) {
    if (run.score > best.score) best.score = run.score;
    if (run.night > best.night) best.night = run.night;
    if (run.won) best.wins += 1;
  }
  save.history.unshift({
    score: run.score, night: run.night, won: run.won,
    difficultyId: run.difficultyId, burned: run.burned,
    date: new Date().toISOString().slice(0, 10),
  });
  save.history = save.history.slice(0, HISTORY_MAX);
  if (run.eclipseNights > save.eclipseBest) save.eclipseBest = run.eclipseNights;
  storeSave(save);
  return save;
}

export function bestScore(save, difficultyId) {
  const best = save.best[difficultyId];
  return best ? best.score : 0;
}
