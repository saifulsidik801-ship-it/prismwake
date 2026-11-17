// names.js — the names table: words PRISMWAKE must never carry.
// The game is original: its names, characters and places are its own.
// This table is the scanner's list — commercial game names, characters
// and franchises that would make the entry a copy instead of an original.
// tools/names.cjs fails the build if any of these appear in game/ or README.

export const BANNED_WORDS = [
  'minecraft', 'fortnite', 'pokemon', 'zelda', 'mario', 'sonic',
  'overwatch', 'valorant', 'league of legends', 'dota', 'warcraft',
  'skyrim', 'fallout', 'call of duty', 'gta', 'grand theft auto',
  'harry potter', 'star wars', 'lord of the rings', 'game of thrones',
  'attack on titan', 'demon slayer', 'naruto', 'one piece',
  'bloons', 'plants vs zombies', 'tower defense simulator',
  'sunwright', 'lanternwake', 'cinderline', 'skyfall slayers',
];

export function scanText(text) {
  const lower = String(text).toLowerCase();
  return BANNED_WORDS.filter((w) => lower.includes(w));
}
