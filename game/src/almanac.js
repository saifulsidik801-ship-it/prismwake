// almanac.js — the bestiary and the glassbook, with real numbers.
// Every shade, prism and relic the player has met is recorded with its
// true stats; anything unmet shows as a silhouette with a hint, never a
// guessed number. The almanac is the judge's proof that the numbers on
// screen, in the draft and in the docs are the same numbers.

import { SHADE_KINDS } from './shades.js';
import { PRISM_TYPES } from './prisms.js';
import { RELIC_TYPES } from './relics.js';
import { weaknessOf, recipeText } from './hues.js';

export function createAlmanac() {
  return { shadesMet: {}, prismsMet: {}, relicsMet: {} };
}

export function meetShade(almanac, kindId) {
  almanac.shadesMet[kindId] = true;
}
export function meetPrism(almanac, typeId) {
  almanac.prismsMet[typeId] = true;
}
export function meetRelic(almanac, relicId) {
  almanac.relicsMet[relicId] = true;
}

// Shade entries: name, weakness, hp, speed, armour, bounty, blurb — or a
// silhouette when unmet.
export function shadeEntries(almanac) {
  return Object.values(SHADE_KINDS).map((def) => {
    const met = !!almanac.shadesMet[def.id];
    return {
      id: def.id, met,
      name: met ? def.name : '???',
      weakness: met ? weaknessOf(def.id) : null,
      weaknessText: met
        ? (def.boss
          ? 'Fears a mixed hue each phase: CYAN, then MAGENTA, then YELLOW. White never burns him.'
          : 'Burns in ' + weaknessOf(def.id).toUpperCase() + ' light (' + recipeText(weaknessOf(def.id)) + ') — or in white light, which holds every colour.')
        : 'Unmet — burn it to learn its fear.',
      hp: met ? def.hp : null,
      speed: met ? def.speed : null,
      armour: met ? def.armour : null,
      bounty: met ? def.bounty : null,
      blurb: met ? def.blurb : 'A shape in the murk. Meet it on the hill.',
      boss: !!def.boss,
    };
  });
}

export function prismEntries(almanac) {
  return Object.values(PRISM_TYPES).map((def) => {
    const met = !!almanac.prismsMet[def.id];
    return {
      id: def.id, met,
      name: met ? def.name : '???',
      cost: met ? def.cost : null,
      power: met ? def.power : null,
      throws: met ? def.hueOut.join(' + ').toUpperCase() : null,
      blurb: met ? def.blurb : 'Untried glass. Draft it to learn its bend.',
    };
  });
}

export function relicEntries(almanac) {
  return Object.values(RELIC_TYPES).map((def) => {
    const met = !!almanac.relicsMet[def.id];
    return {
      id: def.id, met,
      name: met ? def.name : '???',
      blurb: met ? def.blurb : 'An unheld relic. Draft it after a night.',
      detail: met ? def.detail : null,
    };
  });
}

export function almanacProgress(almanac) {
  const total = Object.keys(SHADE_KINDS).length + Object.keys(PRISM_TYPES).length + Object.keys(RELIC_TYPES).length;
  const met = Object.keys(almanac.shadesMet).length + Object.keys(almanac.prismsMet).length + Object.keys(almanac.relicsMet).length;
  return { met, total, pct: Math.round((met / total) * 100) };
}
