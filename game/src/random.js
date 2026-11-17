// random.js — deterministic seeded randomness for PRISMWAKE.
// Every run that matters (staging, bots, playtests) takes a seed, so a
// screenshot can be rebuilt exactly and a HUD number re-derived from its
// replay. The live game seeds from the clock; staged runs seed from 2013.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // Float in [min, max).
    range(min, max) { return min + next() * (max - min); },
    // Integer in [min, max] inclusive.
    int(min, max) { return min + Math.floor(next() * (max - min + 1)); },
    // Pick one element of a non-empty array.
    pick(list) { return list[Math.floor(next() * list.length)]; },
    // Fisher-Yates shuffle, returns a new array.
    shuffle(list) {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    // True with probability p.
    chance(p) { return next() < p; },
  };
}

// A tiny hash of a string, for seeding from names (night + difficulty).
export function hashSeed(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
