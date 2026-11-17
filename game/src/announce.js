// announce.js — the town crier: banners, toasts and the run log.
// Every important moment — nightfall, a draft, a breach, the King's phase
// change, a feat — is announced in words on screen and written to the run
// log with its night and tick, so a replay can show exactly what happened
// and when. Nothing is announced that did not happen.

export function createAnnouncer() {
  return { banner: null, toasts: [], log: [] };
}

// A big centre banner (night name, boss warning, victory). `ms` is how
// long it stays up.
export function banner(ann, title, sub, ms = 2200) {
  ann.banner = { title, sub: sub || '', until: Date.now() + ms };
  ann.log.push({ kind: 'banner', title, sub: sub || '', at: Date.now() });
}

export function toast(ann, text, kind = 'info') {
  ann.toasts.push({ text, kind, at: Date.now() });
  if (ann.toasts.length > 5) ann.toasts.shift();
  ann.log.push({ kind: 'toast', text, at: Date.now() });
}

export function logEvent(ann, kind, text) {
  ann.log.push({ kind, text, at: Date.now() });
}

// The banner is live while its time has not run out.
export function liveBanner(ann, nowMs) {
  if (!ann.banner) return null;
  if (nowMs > ann.banner.until) { ann.banner = null; return null; }
  return ann.banner;
}

// Toasts younger than 3.5 seconds, oldest first.
export function liveToasts(ann, nowMs) {
  return ann.toasts.filter((t) => nowMs - t.at < 3500);
}

// Nightfall wording, per night — the crier names the realm and the threat.
export function nightfallText(night, realm, note) {
  return { title: 'NIGHT ' + night + ' — ' + realm.toUpperCase(), sub: note };
}

export function bossPhaseText(phase) {
  const notes = [
    'The King drinks RED. Burn him green and blue.',
    'The King drinks GREEN. Burn him red and blue.',
    'The King drinks BLUE. Burn him red and green.',
  ];
  return { title: 'THE PALE KING SHIFTS', sub: notes[phase] || notes[0] };
}
