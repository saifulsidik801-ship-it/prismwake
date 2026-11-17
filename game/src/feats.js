// feats.js — 6 medals for deeds worth remembering.
// A feat is checked after every night and at the win; each one names the
// exact deed and the exact threshold, and the save file keeps which ones
// the player has earned. Medals are shown on the results screen and in
// the title's hall of light.

export const FEATS = {
  'first-light': {
    id: 'first-light', name: 'First Light',
    blurb: 'Burn your first shade.',
    check: (stats) => stats.burned >= 1,
  },
  'gleam-five': {
    id: 'gleam-five', name: 'Gleam Five',
    blurb: 'Reach a GLEAM combo of x5 — five burns inside one chain.',
    check: (stats) => stats.bestGleam >= 5,
  },
  'flawless-night': {
    id: 'flawless-night', name: 'Flawless Night',
    blurb: 'Clear a night without the Lantern losing a single HP.',
    check: (stats) => stats.flawlessNights >= 1,
  },
  'prism-master': {
    id: 'prism-master', name: 'Prism Master',
    blurb: 'Hold 8 pieces of glass on the hill at once.',
    check: (stats) => stats.maxPrisms >= 8,
  },
  'king-slayer': {
    id: 'king-slayer', name: 'King-Slayer',
    blurb: 'Burn the Pale King and wake the dawn.',
    check: (stats) => stats.bossKills >= 1,
  },
  'eclipse-ten': {
    id: 'eclipse-ten', name: 'Eclipse Ten',
    blurb: 'Survive 10 nights of Eclipse endless mode.',
    check: (stats) => stats.eclipseNights >= 10,
  },
};
export const FEAT_IDS = Object.keys(FEATS);

export function createFeatState() {
  return { earned: {} };
}

export function checkFeats(featState, stats) {
  const newly = [];
  for (const id of FEAT_IDS) {
    if (!featState.earned[id] && FEATS[id].check(stats)) {
      featState.earned[id] = true;
      newly.push(FEATS[id]);
    }
  }
  return newly;
}

export function featSummary(featState) {
  const earned = FEAT_IDS.filter((id) => featState.earned[id]);
  return { earned: earned.length, total: FEAT_IDS.length, list: earned.map((id) => FEATS[id].name) };
}
