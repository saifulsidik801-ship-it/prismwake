// draft.js — the draft: after every night, 1 of 3.
// The draft is where the run bends: new glass, an upgrade, or a relic.
// Choices are drawn from the weighted pool (rare glass only from night 3),
// and a reroll costs lumen. The draft card shows the real numbers — the
// same numbers prisms.js and relics.js print — so a choice is never a lie.

import { DRAFT } from './config.js';
import { PRISM_TYPES, PRISM_IDS, draftWeight, makePrism } from './prisms.js';
import { RELIC_TYPES, RELIC_IDS } from './relics.js';
import { makeRng, hashSeed } from './random.js';

export function createDraftPool() {
  return { rerolls: 0 };
}

// Draw 3 distinct choices for the night that just ended.
// Kinds: 'prism' (a new piece of glass), 'upgrade' (raise a placed prism),
// 'relic' (a permanent run effect). Relics never repeat in a run.
export function drawDraft(state, seed) {
  const rng = makeRng(hashSeed('draft-' + state.night + '-' + state.difficultyId + '-' + seed));
  const choices = [];
  const seen = new Set();
  const placed = state.board ? placedTypes(state) : [];
  let guard = 0;
  while (choices.length < DRAFT.choices && guard++ < 60) {
    const roll = rng.next();
    if (roll < 0.55) {
      // A prism, weighted: common glass often, rare glass rarely.
      const weighted = [];
      for (const id of PRISM_IDS) {
        const w = draftWeight(id, state.night);
        for (let i = 0; i < w; i++) weighted.push(id);
      }
      const typeId = rng.pick(weighted);
      if (seen.has('prism:' + typeId)) continue;
      seen.add('prism:' + typeId);
      const def = PRISM_TYPES[typeId];
      choices.push({
        kind: 'prism', typeId,
        title: def.name, cost: 0,
        blurb: def.blurb,
        detail: 'Power ' + def.power.toFixed(2) + ' · throws ' + def.hueOut.join(' + ').toUpperCase(),
      });
    } else if (roll < 0.8 && placed.length > 0) {
      // An upgrade for a random placed prism.
      const target = rng.pick(placed);
      if (target.level >= 3 || seen.has('upgrade:' + target.uid)) continue;
      seen.add('upgrade:' + target.uid);
      const def = PRISM_TYPES[target.typeId];
      choices.push({
        kind: 'upgrade', targetUid: target.uid, typeId: target.typeId,
        title: def.name + ' → Lv' + (target.level + 1), cost: 0,
        blurb: 'Raise the glass on the hill one level. Stronger light, same cell.',
        detail: 'Level ' + target.level + ' → ' + (target.level + 1) + ' · power +' + Math.round(def.levelBonus * 100) + '%',
      });
    } else {
      // A relic the run does not already hold.
      const held = new Set(state.relics.map((r) => r.id));
      const open = RELIC_IDS.filter((id) => !held.has(id));
      if (open.length === 0) continue;
      const id = rng.pick(open);
      if (seen.has('relic:' + id)) continue;
      seen.add('relic:' + id);
      const def = RELIC_TYPES[id];
      choices.push({
        kind: 'relic', relicId: id,
        title: def.name, cost: 0,
        blurb: def.blurb,
        detail: def.detail,
      });
    }
  }
  // Fallback: never offer an empty draft.
  while (choices.length < DRAFT.choices) {
    const id = PRISM_IDS[choices.length % PRISM_IDS.length];
    choices.push({ kind: 'prism', typeId: id, title: PRISM_TYPES[id].name, cost: 0, blurb: PRISM_TYPES[id].blurb, detail: '' });
  }
  return choices.slice(0, DRAFT.choices);
}

function placedTypes(state) {
  const out = [];
  for (let r = 0; r < state.board.cells.length; r++) {
    for (let c = 0; c < state.board.cells[r].length; c++) {
      const p = state.board.cells[r][c];
      if (p) out.push(p);
    }
  }
  return out;
}

// Apply a picked choice to the run. Prism picks go to the hand; upgrades
// raise the prism in place; relics join the run and recompute its bonuses.
export function applyDraftChoice(state, choice) {
  if (choice.kind === 'prism') {
    state.hand.push(makePrism(choice.typeId, 1));
    return { ok: true, note: choice.title + ' joins your hand.' };
  }
  if (choice.kind === 'upgrade') {
    const found = findPrism(state, choice.targetUid);
    if (!found) return { ok: false, why: 'That glass is gone.' };
    found.level = Math.min(3, found.level + 1);
    return { ok: true, note: choice.title + ' — the glass hums brighter.' };
  }
  if (choice.kind === 'relic') {
    state.relics.push({ id: choice.relicId });
    return { ok: true, note: choice.title + ' — a relic for the run.' };
  }
  return { ok: false, why: 'Unknown draft choice.' };
}

function findPrism(state, uid) {
  for (const row of state.board.cells) {
    for (const p of row) if (p && p.uid === uid) return p;
  }
  return null;
}
