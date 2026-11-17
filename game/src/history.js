// history.js — the run record: per-night results and the last 3 runs.
// After every night the game writes one row: shades burned, lumen earned,
// lantern HP kept, GLEAM best, time. The results screen charts those rows
// (burned per night, with the lantern line), and the title screen lists
// the last 3 runs — all real numbers from real runs, never invented.

export function createHistory() {
  return { nights: [], startedAt: Date.now() };
}

export function recordNight(history, row) {
  history.nights.push({
    night: row.night,
    realm: row.realm,
    burned: row.burned,
    spawned: row.spawned,
    lumenEarned: row.lumenEarned,
    lanternHp: row.lanternHp,
    gleamBest: row.gleamBest,
    seconds: Math.round(row.seconds),
  });
  return history.nights[history.nights.length - 1];
}

export function nightTotals(history) {
  let burned = 0;
  let lumen = 0;
  for (const n of history.nights) { burned += n.burned; lumen += n.lumenEarned; }
  return { burned, lumen, nights: history.nights.length };
}

// Chart data for the results screen: one bar per night (burned), plus the
// lantern line (HP kept each night). Pure numbers, ready to draw.
export function chartData(history) {
  return history.nights.map((n) => ({
    label: 'N' + n.night,
    burned: n.burned,
    spawned: n.spawned,
    lanternHp: n.lanternHp,
  }));
}

export function lastRunSummary(history) {
  if (!history.nights.length) return 'No nights survived yet.';
  const t = nightTotals(history);
  return t.nights + ' night' + (t.nights === 1 ? '' : 's') + ' · ' + t.burned + ' shades burned · ' + t.lumen + ' lumen earned';
}
