// economy.js — lumen: the currency of the dawn.
// Lumen is earned by burning shades (their bounty, plus a trickle per burn
// tick), granted at each dawn, and spent on glass, upgrades and rerolls.
// Every transaction is logged, so the run log can rebuild the exact lumen
// balance at any tick — the truth check's favourite number.

import { ECONOMY } from './config.js';
import { PRISM_TYPES, upgradeCost, sellValue } from './prisms.js';

export function createEconomy(startLumen) {
  return { lumen: startLumen, earned: 0, spent: 0, log: [] };
}

function record(eco, kind, amount, note) {
  eco.log.push({ kind, amount, note, balance: eco.lumen });
}

export function earn(eco, amount, note) {
  eco.lumen += amount;
  eco.earned += amount;
  record(eco, 'earn', amount, note);
  return eco.lumen;
}

export function spend(eco, amount, note) {
  if (eco.lumen < amount) return { ok: false, why: 'Not enough lumen.' };
  eco.lumen -= amount;
  eco.spent += amount;
  record(eco, 'spend', -amount, note);
  return { ok: true };
}

export function canAfford(eco, amount) {
  return eco.lumen >= amount;
}

// Buying a prism: pay its cost, receive the glass in hand.
export function buyPrism(eco, typeId) {
  const def = PRISM_TYPES[typeId];
  if (!def) return { ok: false, why: 'No such glass.' };
  const paid = spend(eco, def.cost, 'Bought ' + def.name);
  return paid.ok ? { ok: true, typeId } : paid;
}

export function upgradePrism(eco, prism) {
  const cost = upgradeCost(prism);
  if (cost === null) return { ok: false, why: 'Already at level 3.' };
  const paid = spend(eco, cost, 'Upgraded ' + PRISM_TYPES[prism.typeId].name + ' to Lv' + (prism.level + 1));
  if (!paid.ok) return paid;
  prism.level += 1;
  return { ok: true, level: prism.level };
}

export function sellPrism(eco, prism) {
  const value = sellValue(prism);
  earn(eco, value, 'Sold ' + PRISM_TYPES[prism.typeId].name + ' Lv' + prism.level);
  return { ok: true, value };
}

// Dawn grant: each survived night pays its grant plus the clear bonus.
export function dawnGrant(eco, grant, clearBonus) {
  earn(eco, grant + clearBonus, 'Dawn grant + clear bonus');
  return eco.lumen;
}

// Win bonus: 15 lumen per lantern HP still standing.
export function lanternBonus(eco, lanternHpLeft) {
  const bonus = lanternHpLeft * ECONOMY.lanternSaveBonus;
  if (bonus > 0) earn(eco, bonus, 'Lantern bonus (' + lanternHpLeft + ' HP kept)');
  return bonus;
}
