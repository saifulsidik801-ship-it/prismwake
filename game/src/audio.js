// audio.js — procedural WebAudio: no samples, no files, no network.
// A generative pentatonic dawn: a marimba-like ostinato over a low drone,
// quickening a little every night, plus a sound for every action — place,
// rotate, burn, breach, draft, win, lose. All synthesis, all in this file,
// and all silent until the player first interacts (browsers demand it).

const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const BASE_FREQ = 220; // A3

function noteFreq(step) {
  const semis = PENTATONIC[((step % PENTATONIC.length) + PENTATONIC.length) % PENTATONIC.length];
  const oct = Math.floor(step / PENTATONIC.length);
  return BASE_FREQ * Math.pow(2, (semis + oct * 12) / 12);
}

export function createAudio() {
  return {
    ctx: null,
    master: null,
    musicGain: null,
    sfxGain: null,
    muted: false,
    volume: 0.7,
    musicOn: true,
    step: 0,
    nextNoteAt: 0,
    timer: null,
    tempo: 132, // ms per ostinato step, quickens with the night
  };
}

export function ensureAudio(audio) {
  if (audio.ctx) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return true;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    audio.ctx = new AC();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = audio.volume;
    audio.master.connect(audio.ctx.destination);
    audio.musicGain = audio.ctx.createGain();
    audio.musicGain.gain.value = 0.35;
    audio.musicGain.connect(audio.master);
    audio.sfxGain = audio.ctx.createGain();
    audio.sfxGain.gain.value = 0.9;
    audio.sfxGain.connect(audio.master);
    return true;
  } catch (e) {
    return false;
  }
}

export function setMuted(audio, muted) {
  audio.muted = muted;
  if (audio.master) audio.master.gain.value = muted ? 0 : audio.volume;
}

export function setVolume(audio, volume) {
  audio.volume = Math.max(0, Math.min(1, volume));
  if (audio.master && !audio.muted) audio.master.gain.value = audio.volume;
}

// One marimba-like pluck: sine + a fast-decaying harmonic, low-passed.
function pluck(audio, freq, when, dur, gain) {
  const ctx = audio.ctx;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.value = freq * 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, when + dur);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0, when);
  g2.gain.linearRampToValueAtTime(gain * 0.3, when + 0.01);
  g2.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.5);
  osc.connect(g); osc2.connect(g2);
  g.connect(audio.musicGain); g2.connect(audio.musicGain);
  osc.start(when); osc2.start(when);
  osc.stop(when + dur + 0.05); osc2.stop(when + dur * 0.5 + 0.05);
}

// The drone: two detuned sines an octave apart, very quiet, always on.
function drone(audio) {
  const ctx = audio.ctx;
  const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 110;
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 110.5;
  const g = ctx.createGain(); g.gain.value = 0.05;
  o1.connect(g); o2.connect(g); g.connect(audio.musicGain);
  o1.start(); o2.start();
  audio.droneNodes = [o1, o2];
}

export function startMusic(audio, night = 1) {
  if (!ensureAudio(audio) || !audio.musicOn) return;
  audio.tempo = Math.max(96, 132 - (night - 1) * 4);
  if (audio.timer) return;
  if (!audio.droneNodes) drone(audio);
  audio.nextNoteAt = audio.ctx.currentTime + 0.1;
  audio.step = 0;
  const pattern = [0, 2, 4, 7, 4, 2, 9, 7, 4, 2, 0, -2];
  audio.timer = setInterval(() => {
    if (audio.muted || !audio.musicOn) return;
    const now = audio.ctx.currentTime;
    while (audio.nextNoteAt < now + 0.3) {
      const idx = pattern[audio.step % pattern.length];
      pluck(audio, noteFreq(idx + 7), audio.nextNoteAt, 0.5, 0.5);
      if (audio.step % 4 === 0) pluck(audio, noteFreq(idx), audio.nextNoteAt, 0.9, 0.25);
      audio.nextNoteAt += audio.tempo / 1000;
      audio.step++;
    }
  }, 90);
}

export function stopMusic(audio) {
  if (audio.timer) { clearInterval(audio.timer); audio.timer = null; }
  if (audio.droneNodes) {
    for (const n of audio.droneNodes) { try { n.stop(); } catch (e) { /* already stopped */ } }
    audio.droneNodes = null;
  }
}

// Short synth SFX. Each is a tiny oscillator gesture, named for its cause.
export function sfx(audio, name) {
  if (!ensureAudio(audio) || audio.muted) return;
  const ctx = audio.ctx;
  const now = ctx.currentTime;
  const out = audio.sfxGain;
  const tone = (type, f0, f1, dur, gain) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, now);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.connect(g); g.connect(out);
    o.start(now); o.stop(now + dur + 0.02);
  };
  switch (name) {
    case 'place': tone('triangle', 520, 780, 0.12, 0.35); break;
    case 'rotate': tone('sine', 660, 880, 0.08, 0.25); break;
    case 'sell': tone('triangle', 700, 420, 0.12, 0.3); break;
    case 'burn': tone('sawtooth', 180, 60, 0.18, 0.12); break;
    case 'breach': tone('sawtooth', 220, 55, 0.5, 0.4); break;
    case 'draft': tone('sine', 440, 660, 0.15, 0.3); tone('sine', 660, 990, 0.2, 0.2); break;
    case 'night': tone('triangle', 330, 495, 0.3, 0.3); break;
    case 'win': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone('triangle', f, f, 0.3, 0.3), i * 120)); break;
    case 'lose': [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone('triangle', f, f, 0.35, 0.3), i * 140)); break;
    case 'error': tone('square', 160, 120, 0.12, 0.15); break;
    case 'gleam': tone('sine', 880, 1320, 0.1, 0.2); break;
    default: tone('sine', 440, 440, 0.08, 0.2); break;
  }
}
