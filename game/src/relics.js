// relics.js — 12 relics: permanent run effects won in the draft.
// Each relic changes exactly one number, and its effect is recomputed
// from the held list every time — no hidden state, no stacking surprise.
// The run's burn multiplier, lantern guard and economy all read this file.

export const RELIC_TYPES = {
  emberwick: {
    id: 'emberwick', name: 'Emberwick Candle', burnMul: 1.15,
    blurb: 'A candle that never gutters. All burns +15%.',
    detail: 'Burn damage x1.15',
  },
  twinlens: {
    id: 'twinlens', name: 'Twin Lens', burnMul: 1.10, gleamWindowBonus: 500,
    blurb: 'Two lenses, one focus. Burns +10%, GLEAM window +0.5 s.',
    detail: 'Burn damage x1.10 · GLEAM window +500 ms',
  },
  gildedmirror: {
    id: 'gildedmirror', name: 'Gilded Mirror', burnMul: 1.10,
    blurb: 'Gold leaf on the back of the glass. Burns +10%.',
    detail: 'Burn damage x1.10',
  },
  dawnshard: {
    id: 'dawnshard', name: 'Dawnshard', burnMul: 1.25, lanternGuard: 0,
    blurb: 'A chip of the first sunrise. Burns +25%.',
    detail: 'Burn damage x1.25',
  },
  lanternward: {
    id: 'lanternward', name: 'Lanternward', burnMul: 1.0, lanternGuard: 2,
    blurb: 'The lantern gains 2 extra HP. The dark must work harder.',
    detail: 'Lantern +2 HP',
  },
  prismheart: {
    id: 'prismheart', name: 'Prismheart', burnMul: 1.0, bountyMul: 1.25,
    blurb: 'The hill pays better for its dead. Bounties +25%.',
    detail: 'Bounty lumen x1.25',
  },
  quicksilver: {
    id: 'quicksilver', name: 'Quicksilver', burnMul: 1.0, rerollFree: true,
    blurb: 'Draft rerolls are free from now on.',
    detail: 'Rerolls cost 0 lumen',
  },
  sunspore: {
    id: 'sunspore', name: 'Sunspore', burnMul: 1.0, startLumenBonus: 50,
    blurb: 'Spores of stored sunlight. +50 lumen at once.',
    detail: '+50 lumen immediately',
  },
  farlantern: {
    id: 'farlantern', name: 'Far Lantern', burnMul: 1.08,
    blurb: 'A second light, far away. Burns +8%, beams reach one cell further.',
    detail: 'Burn damage x1.08 · beam range +1 cell',
  },
  coldflame: {
    id: 'coldflame', name: 'Coldflame', burnMul: 1.0, slowMul: 0.85,
    blurb: 'A flame that chills. All shades walk 15% slower.',
    detail: 'Shade speed x0.85',
  },
  brightcoin: {
    id: 'brightcoin', name: 'Brightcoin', burnMul: 1.0, bountyMul: 1.5,
    blurb: 'A coin struck from a sunbeam. Bounties +50%.',
    detail: 'Bounty lumen x1.50',
  },
  paleveil: {
    id: 'paleveil', name: 'Paleveil', burnMul: 1.2, lanternGuard: 0,
    blurb: 'A veil cut from the King\'s own cloak. Burns +20% — and the boss fears it.',
    detail: 'Burn damage x1.20',
  },
};
export const RELIC_IDS = Object.keys(RELIC_TYPES);

// Recompute the run's derived multipliers from its held relics.
// Returns { burnMul, bountyMul, slowMul, lanternGuard, rerollFree, gleamWindowBonus }.
export function relicEffects(held) {
  const out = { burnMul: 1, bountyMul: 1, slowMul: 1, lanternGuard: 0, rerollFree: false, gleamWindowBonus: 0 };
  for (const relic of held) {
    const def = RELIC_TYPES[relic.id];
    if (!def) continue;
    if (def.burnMul) out.burnMul *= def.burnMul;
    if (def.bountyMul) out.bountyMul *= def.bountyMul;
    if (def.slowMul) out.slowMul *= def.slowMul;
    if (def.lanternGuard) out.lanternGuard += def.lanternGuard;
    if (def.rerollFree) out.rerollFree = true;
    if (def.gleamWindowBonus) out.gleamWindowBonus += def.gleamWindowBonus;
  }
  return out;
}

// One-line summary of held relics for the HUD side panel.
export function relicSummary(held) {
  if (!held.length) return 'No relics yet — draft one after a night.';
  return held.map((r) => RELIC_TYPES[r.id].name).join(' · ');
}
