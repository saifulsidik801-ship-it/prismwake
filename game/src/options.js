// options.js — settings the player owns: volume, mute, music, shake,
// game speed, and colour-blind hue patterns. Options persist in the save
// file and are applied live — no restart, no menu dive. Colour-blind mode
// draws a distinct pattern over every hue (slash, dots, rings, cross,
// triangle, waves, star), so no mechanic ever depends on colour alone.

export function defaultOptions() {
  return { volume: 0.7, muted: false, music: true, shake: true, speed: 1, colorBlind: false };
}

export function createOptions(saved) {
  return { ...defaultOptions(), ...(saved || {}) };
}

export function toggleMuted(options) {
  options.muted = !options.muted;
  return options.muted;
}

export function toggleMusic(options) {
  options.music = !options.music;
  return options.music;
}

export function toggleShake(options) {
  options.shake = !options.shake;
  return options.shake;
}

export function toggleColorBlind(options) {
  options.colorBlind = !options.colorBlind;
  return options.colorBlind;
}

// Game speed cycles 1x -> 2x -> 1x. The sim multiplies dt by it.
export function cycleSpeed(options) {
  options.speed = options.speed >= 2 ? 1 : 2;
  return options.speed;
}

export function setVolume(options, volume) {
  options.volume = Math.max(0, Math.min(1, volume));
  return options.volume;
}

// One-line options summary for the title screen footer.
export function optionsSummary(options) {
  const parts = [];
  parts.push(options.muted ? 'MUTED' : 'VOL ' + Math.round(options.volume * 100) + '%');
  parts.push(options.music ? 'MUSIC ON' : 'MUSIC OFF');
  parts.push('SPEED ' + options.speed + 'x');
  parts.push(options.colorBlind ? 'HUE PATTERNS ON' : 'HUE PATTERNS OFF');
  return parts.join(' · ');
}
