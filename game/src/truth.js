// truth.js — the truth check's hook: what the screen claims, in numbers.
// The renderer draws from the same state this module snapshots, and the
// economy log records every lumen transaction, so the tools can rebuild
// each HUD number from the run's own records and compare:
//   lumen  = start lumen + sum(earn) - sum(spend)   (from the economy log)
//   burned = sum of per-night burned               (from the history)
//   score  = the sim's running score               (recomputed in sim)
// A screenshot is truthful when the snapshot and the rebuild agree.

export function snapshot(state) {
  return {
    phase: state.phase,
    night: state.night,
    difficultyId: state.difficultyId,
    score: state.score,
    lumen: state.economy.lumen,
    lumenEarned: state.economy.earned,
    lumenSpent: state.economy.spent,
    lanternHp: state.lanternHp,
    lanternMax: state.lanternMax,
    gleamStep: state.gleam.step,
    gleamBest: state.gleam.best,
    shadesAlive: state.shades.length,
    shadesSpawned: state.nightSpawned,
    shadesBurnedNight: state.nightBurned,
    shadesBurnedTotal: state.stats.burned,
    litCells: state.lastLit ? state.lastLit.size : 0,
    prismsPlaced: countPrisms(state),
    handSize: state.hand.length,
    relics: state.relics.map((r) => r.id),
    history: state.history.nights.map((n) => ({ night: n.night, burned: n.burned, lumenEarned: n.lumenEarned, lanternHp: n.lanternHp })),
  };
}

function countPrisms(state) {
  let n = 0;
  for (const row of state.board.cells) for (const p of row) if (p) n++;
  return n;
}

// Rebuild the lumen balance from the economy log alone. The log's first
// balance is the starting lumen; every later entry records the balance
// after its transaction, so the rebuild is: start + sum(amounts).
export function rebuildLumen(state) {
  const log = state.economy.log;
  if (!log.length) return state.economy.lumen;
  let balance = log[0].balance - log[0].amount;
  for (const entry of log) balance += entry.amount;
  return balance;
}

// Rebuild total burned shades from the per-night history plus this night
// — but only when this night has not been recorded yet. Once a night is
// cleared its burns live in the history, and adding nightBurned again
// would double-count them.
export function rebuildBurned(state) {
  let total = 0;
  for (const n of state.history.nights) total += n.burned;
  if (state.phase === 'night') total += state.nightBurned;
  return total;
}

// Rebuild the score's night component: score is only ever added by burns
// and kills, so the check is that score >= 0 and grows with burned.
export function scoreSane(state) {
  return state.score >= 0 && (state.stats.burned === 0 || state.score > 0);
}

// The full truth report for a shot: each claim, its rebuild, and pass/fail.
export function truthReport(state) {
  const snap = snapshot(state);
  const lumenRebuilt = rebuildLumen(state);
  const burnedRebuilt = rebuildBurned(state);
  const checks = [
    { name: 'lumen', shown: snap.lumen, rebuilt: lumenRebuilt, pass: snap.lumen === lumenRebuilt },
    { name: 'burned-total', shown: snap.shadesBurnedTotal, rebuilt: burnedRebuilt, pass: snap.shadesBurnedTotal === burnedRebuilt },
    { name: 'score-sane', shown: snap.score, rebuilt: snap.score, pass: scoreSane(state) },
    { name: 'lantern-range', shown: snap.lanternHp, rebuilt: snap.lanternHp, pass: snap.lanternHp >= 0 && snap.lanternHp <= snap.lanternMax },
    { name: 'night-range', shown: snap.night, rebuilt: snap.night, pass: snap.night >= 1 && snap.night <= 10 },
  ];
  return { snapshot: snap, checks, pass: checks.every((c) => c.pass) };
}
