// hud.js — every panel, button and overlay PRISMWAKE shows.
// One terracotta frame for all HUD panels, one big number per panel, and
// every number on screen is read from the live state — the same state the
// truth check rebuilds. Buttons are drawn here AND hit-tested here, from
// the same layout constants, so a click can never land where no button is.
// Overlays: title, draft, results, win, lose, pause, shop, almanac,
// options, help.

import { CANVAS_W, CANVAS_H, BOARD_X, BOARD_Y, BOARD_W, BOARD_H, CELL, NIGHTS, TOTAL_NIGHTS, DIFFICULTY_IDS, DIFFICULTIES } from './config.js';
import { HUES, HUE_IDS } from './hues.js';
import { PRISM_TYPES, PRISM_IDS } from './prisms.js';
import { relicSummary } from './relics.js';
import { shadeEntries, prismEntries, relicEntries, almanacProgress } from './almanac.js';
import { featSummary } from './feats.js';
import { optionsSummary } from './options.js';
import { chartData } from './history.js';
import { SHORTCUTS } from './input.js';
import { brightCells } from './beams.js';

export const LAYOUT = {
  topBar: { x: 24, y: 8, w: 1232, h: 76 },
  board: { x: BOARD_X, y: BOARD_Y, w: BOARD_W, h: BOARD_H },
  hand: { x: 24, y: 560, w: 640, h: 132 },
  hint: { x: 24, y: 704, w: 640, h: 76 },
  side: { x: 688, y: 96, w: 568, h: 684 },
  startBtn: { x: 712, y: 640, w: 520, h: 64 },
};

function panel(ctx, x, y, w, h) {
  // Warm dawn parchment: the UI is lit by the same dawn as the hill, so
  // the whole frame reads bright at a glance — dark panels would swallow
  // the cover's light. Ink on parchment is dark, not light.
  ctx.fillStyle = 'rgba(238,228,200,0.95)';
  ctx.strokeStyle = '#c97b4a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
}

function bigNum(ctx, x, y, label, value, color) {
  ctx.textAlign = 'left';
  ctx.fillStyle = '#6a5a3a';
  ctx.font = '11px "Trebuchet MS", sans-serif';
  ctx.fillText(label, x, y);
  ctx.fillStyle = color || '#2a2340';
  ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
  ctx.fillText(String(value), x, y + 28);
}

function button(ctx, r, label, enabled = true, accent = false) {
  ctx.fillStyle = enabled ? (accent ? '#c97b4a' : '#2a3054') : '#22263c';
  ctx.strokeStyle = accent ? '#ffd166' : '#c97b4a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = enabled ? '#f4ead8' : '#777';
  ctx.font = 'bold ' + (r.h >= 48 ? 20 : 14) + 'px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 7);
}

function dim(ctx) {
  ctx.fillStyle = 'rgba(5,6,15,0.90)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

export function drawHud(ctx, state, litMap, nowMs) {
  drawTopBar(ctx, state, litMap);
  drawHand(ctx, state);
  drawHint(ctx, state);
  drawSide(ctx, state, litMap, nowMs);
  const ui = state.ui;
  if (state.phase === 'title') drawTitle(ctx, state);
  else if (state.phase === 'draft') drawDraft(ctx, state);
  else if (state.phase === 'results') drawResults(ctx, state);
  else if (state.phase === 'win') drawWin(ctx, state);
  else if (state.phase === 'lose') drawLose(ctx, state);
  else if (state.phase === 'paused') drawPaused(ctx, state);
  if (ui.shopOpen) drawShop(ctx, state);
  if (ui.almanacOpen) drawAlmanac(ctx, state);
  if (ui.optionsOpen) drawOptions(ctx, state);
  if (ui.helpOpen) drawHelp(ctx, state);
}

function drawTopBar(ctx, state, litMap) {
  const b = LAYOUT.topBar;
  panel(ctx, b.x, b.y, b.w, b.h);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#7a5a10';
  ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
  ctx.fillText('PRISMWAKE', b.x + 16, b.y + 32);
  ctx.fillStyle = '#5a5470';
  ctx.font = '12px "Trebuchet MS", sans-serif';
  ctx.fillText(state.eclipse ? 'ECLIPSE ENDLESS' : 'Night ' + state.night + ' / ' + TOTAL_NIGHTS + ' · ' + (NIGHTS[state.night - 1] ? NIGHTS[state.night - 1].realm : ''), b.x + 16, b.y + 54);
  const x0 = 250;
  bigNum(ctx, x0, b.y + 18, 'SCORE', state.score, '#7a5a10');
  bigNum(ctx, x0 + 120, b.y + 18, 'LUMEN', state.economy.lumen, '#8a6d00');
  bigNum(ctx, x0 + 240, b.y + 18, 'LANTERN', state.lanternHp + '/' + state.lanternMax, state.lanternHp <= 3 ? '#c22a2a' : '#1a7a3a');
  bigNum(ctx, x0 + 360, b.y + 18, 'GLEAM', 'x' + state.gleam.step, '#a02080');
  bigNum(ctx, x0 + 470, b.y + 18, 'SHADES', state.shades.length + ' left', '#2050a0');
  // Small buttons: shop, almanac, options, help.
  const btns = [
    { id: 'shop', label: 'SHOP', x: 880, w: 70 },
    { id: 'almanac', label: 'ALMANAC', x: 958, w: 92 },
    { id: 'options', label: 'OPTIONS', x: 1058, w: 92 },
    { id: 'help', label: '?', x: 1158, w: 40 },
  ];
  for (const btn of btns) {
    button(ctx, { x: btn.x, y: b.y + 18, w: btn.w, h: 40 }, btn.label, true);
  }
  void litMap;
}

function drawHand(ctx, state) {
  const h = LAYOUT.hand;
  panel(ctx, h.x, h.y, h.w, h.h);
  ctx.fillStyle = '#5a5470';
  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('YOUR HAND — click a prism, then click a cell to place it', h.x + 14, h.y + 20);
  state.hand.forEach((prism, i) => {
    const x = h.x + 14 + i * 76;
    const y = h.y + 30;
    const sel = state.selectedHand === i;
    ctx.fillStyle = sel ? '#f7e9c0' : '#ddd2ae';
    ctx.strokeStyle = sel ? '#ffd166' : '#c97b4a';
    ctx.lineWidth = sel ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, 68, 88, 8);
    ctx.fill();
    ctx.stroke();
    const def = PRISM_TYPES[prism.typeId];
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(x + 34, y + 14);
    ctx.lineTo(x + 54, y + 42);
    ctx.lineTo(x + 14, y + 42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2a2340';
    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(def.name, x + 34, y + 60);
    ctx.fillStyle = '#5a5470';
    ctx.font = '11px "Trebuchet MS", sans-serif';
    ctx.fillText('Lv' + prism.level + ' · ' + def.hueOut.join('+').toUpperCase(), x + 34, y + 76);
  });
  if (!state.hand.length) {
    ctx.fillStyle = '#5a5470';
    ctx.font = '13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Hand empty — draft glass after the night, or buy it in the SHOP.', h.x + 14, h.y + 70);
  }
}

function drawHint(ctx, state) {
  const h = LAYOUT.hint;
  panel(ctx, h.x, h.y, h.w, h.h);
  ctx.fillStyle = '#2a2340';
  ctx.font = '14px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  const hint = state.hint || defaultHint(state);
  wrapText(ctx, hint, h.x + 14, h.y + 24, h.w - 28, 20);
}

function defaultHint(state) {
  if (state.phase === 'build') return 'Build phase: place glass, then press SPACE or START NIGHT. Shades fear the hue on their body — mix beams to make it.';
  if (state.phase === 'night') return 'Night in progress: beams burn shades whose weakness hue lights their cell. Watch the GLEAM combo climb.';
  if (state.phase === 'draft') return 'Draft: pick 1 of 3. New glass joins your hand; relics change the whole run.';
  return 'PRISMWAKE — split the dawn, mix the colours, burn the shades.';
}

function drawSide(ctx, state, litMap, nowMs) {
  const s = LAYOUT.side;
  panel(ctx, s.x, s.y, s.w, s.h);
  let y = s.y + 24;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#7a5a10';
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  ctx.fillText('THE HILL', s.x + 16, y);
  y += 22;
  ctx.fillStyle = '#2a2340';
  ctx.font = '14px "Trebuchet MS", sans-serif';
  ctx.fillText('Lit cells: ' + litMap.size + ' · Bright cells: ' + brightCells(litMap), s.x + 16, y);
  y += 22;
  ctx.fillStyle = '#5a5470';
  ctx.font = '13px "Trebuchet MS", sans-serif';
  ctx.fillText('Relics: ' + relicSummary(state.relics), s.x + 16, y);
  y += 30;
  // Hue legend: every weakness, its recipe, its glyph.
  ctx.fillStyle = '#7a5a10';
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  ctx.fillText('WHAT EACH SHADE FEARS', s.x + 16, y);
  y += 24;
  for (const id of HUE_IDS) {
    const hue = HUES[id];
    ctx.fillStyle = hue.color;
    ctx.beginPath();
    ctx.arc(s.x + 26, y - 5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2340';
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillText(hue.label + '  ' + hue.glyph, s.x + 42, y);
    ctx.fillStyle = '#5a5470';
    ctx.font = '12px "Trebuchet MS", sans-serif';
    ctx.fillText(hue.components.map((c) => c.toUpperCase()).join(' + '), s.x + 180, y);
    y += 24;
  }
  y += 8;
  // Night note + spawn countdown.
  const def = NIGHTS[state.night - 1];
  if (def) {
    ctx.fillStyle = '#7a5a10';
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.fillText('NIGHT ' + state.night + ' — ' + def.realm.toUpperCase(), s.x + 16, y);
    y += 20;
    ctx.fillStyle = '#2a2340';
    ctx.font = '13px "Trebuchet MS", sans-serif';
    wrapText(ctx, def.note, s.x + 16, y, s.w - 32, 18);
    y += 40;
    if (state.phase === 'night') {
      const left = state.schedule.length - state.scheduleIndex;
      ctx.fillStyle = '#5a5470';
      ctx.fillText(left + ' shades still to climb · ' + state.nightBurned + ' burned this night', s.x + 16, y);
    }
  }
  // Start button.
  const sb = LAYOUT.startBtn;
  const label = state.phase === 'build' ? 'START NIGHT  (SPACE)' : state.phase === 'night' ? 'NIGHT IN PROGRESS…' : 'PRISMWAKE';
  button(ctx, sb, label, state.phase === 'build', state.phase === 'build');
  // Toasts above the button.
  const toasts = state.announcer.toasts.filter((t) => nowMs - t.at < 3500).slice(-3);
  let ty = sb.y - 12;
  for (let i = toasts.length - 1; i >= 0; i--) {
    ty -= 20;
    ctx.fillStyle = toasts[i].kind === 'bad' ? '#c22a2a' : '#2a2340';
    ctx.font = '13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(toasts[i].text, s.x + 16, ty);
  }
  // Banner (nightfall / boss) drawn over the board centre.
  const banner = state.announcer.banner;
  if (banner && nowMs < banner.until) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(5,6,15,0.6)';
    ctx.fillRect(BOARD_X, 300, BOARD_W, 90);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    ctx.fillText(banner.title, BOARD_X + BOARD_W / 2, 340);
    ctx.fillStyle = '#f4ead8';
    ctx.font = '16px "Trebuchet MS", sans-serif';
    ctx.fillText(banner.sub, BOARD_X + BOARD_W / 2, 368);
  }
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = String(text).split(' ');
  let line = '';
  let cy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = w;
      cy += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, cy);
  return cy;
}

// ---- Overlays ----

function drawTitle(ctx, state) {
  // Opaque dawn-night background: the title is a screen of its own, and
  // the HUD behind it must not show through and collide with the text.
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  g.addColorStop(0, '#2a2350');
  g.addColorStop(0.5, '#171a33');
  g.addColorStop(1, '#0b0e1e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 72px "Trebuchet MS", sans-serif';
  ctx.fillText('PRISMWAKE', CANVAS_W / 2, 150);
  ctx.fillStyle = '#f4ead8';
  ctx.font = '20px "Trebuchet MS", sans-serif';
  ctx.fillText('Split the dawn. Mix the colours. Burn the shades.', CANVAS_W / 2, 188);
  ctx.fillStyle = '#b9b3a4';
  ctx.font = '15px "Trebuchet MS", sans-serif';
  ctx.fillText('Nine nights. Four realms. One lantern. The Pale King waits on night nine.', CANVAS_W / 2, 216);
  // Best scores per difficulty.
  const save = state.save;
  let bx = CANVAS_W / 2 - 300;
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  for (const id of DIFFICULTY_IDS) {
    const best = save && save.best[id];
    ctx.fillStyle = '#ffd166';
    ctx.fillText(DIFFICULTIES[id].label, bx, 260);
    ctx.fillStyle = '#f4ead8';
    ctx.font = '14px "Trebuchet MS", sans-serif';
    ctx.fillText('BEST ' + (best ? best.score.toLocaleString() : '0') + ' · NIGHT ' + (best ? best.night : '0') + ' · WINS ' + (best ? best.wins : '0'), bx, 282);
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    bx += 300;
  }
  // Difficulty cards.
  const cards = [
    { id: 'dusk', x: 190, label: 'DUSK', blurb: DIFFICULTIES.dusk.blurb },
    { id: 'ember', x: 490, label: 'EMBER', blurb: DIFFICULTIES.ember.blurb },
    { id: 'dawn', x: 790, label: 'DAWN', blurb: DIFFICULTIES.dawn.blurb },
  ];
  for (const c of cards) {
    const sel = state.difficultyId === c.id;
    ctx.fillStyle = sel ? '#3a2f16' : 'rgba(27,32,64,0.92)';
    ctx.strokeStyle = sel ? '#ffd166' : '#c97b4a';
    ctx.lineWidth = sel ? 3 : 2;
    ctx.beginPath();
    ctx.roundRect(c.x, 320, 300, 110, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
    ctx.fillText(c.label, c.x + 150, 360);
    ctx.fillStyle = '#f4ead8';
    ctx.font = '14px "Trebuchet MS", sans-serif';
    ctx.fillText(c.blurb, c.x + 150, 390);
    ctx.fillStyle = '#b9b3a4';
    ctx.font = '12px "Trebuchet MS", sans-serif';
    ctx.fillText('Lantern ' + DIFFICULTIES[c.id].lanternHp + ' HP · ' + DIFFICULTIES[c.id].startLumen + ' lumen · x' + DIFFICULTIES[c.id].scoreMul + ' score', c.x + 150, 412);
  }
  button(ctx, { x: 490, y: 470, w: 300, h: 64 }, 'START RUN', true, true);
  const feats = featSummary(state.feats);
  ctx.fillStyle = '#b9b3a4';
  ctx.font = '14px "Trebuchet MS", sans-serif';
  ctx.fillText('Feats ' + feats.earned + '/' + feats.total + (feats.list.length ? ' — ' + feats.list.join(', ') : '') + '   ·   ' + optionsSummary(state.options), CANVAS_W / 2, 580);
  if (save && save.history.length) {
    ctx.fillStyle = '#f4ead8';
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.fillText('LAST RUNS', CANVAS_W / 2, 620);
    ctx.fillStyle = '#b9b3a4';
    ctx.font = '13px "Trebuchet MS", sans-serif';
    save.history.forEach((r, i) => {
      ctx.fillText((r.won ? 'WON' : 'FELL') + ' · night ' + r.night + ' · ' + r.score.toLocaleString() + ' pts · ' + r.burned + ' burned · ' + r.difficultyId.toUpperCase() + ' · ' + r.date, CANVAS_W / 2, 644 + i * 20);
    });
  }
  ctx.fillStyle = '#b9b3a4';
  ctx.font = '13px "Trebuchet MS", sans-serif';
  ctx.fillText('Click a prism, click a cell. Click a placed prism to rotate. SPACE starts the night. M mutes. No network, no account — your runs stay on your machine.', CANVAS_W / 2, 730);
}

function drawDraft(ctx, state) {
  dim(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
  ctx.fillText('DAWN BREAKS — CHOOSE 1 OF 3', CANVAS_W / 2, 120);
  ctx.fillStyle = '#f4ead8';
  ctx.font = '16px "Trebuchet MS", sans-serif';
  ctx.fillText('Night ' + state.night + ' survived. The dawn offers glass, an upgrade, or a relic. Press 1, 2 or 3 — or click a card.', CANVAS_W / 2, 152);
  state.draftChoices.forEach((choice, i) => {
    const x = 140 + i * 360;
    const y = 200;
    ctx.fillStyle = 'rgba(27,32,64,0.95)';
    ctx.strokeStyle = '#c97b4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, 320, 300, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
    ctx.fillText('[' + (i + 1) + ']  ' + choice.title, x + 160, y + 50);
    ctx.fillStyle = '#b9b3a4';
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    ctx.fillText(choice.kind.toUpperCase(), x + 160, y + 78);
    ctx.fillStyle = '#f4ead8';
    ctx.font = '15px "Trebuchet MS", sans-serif';
    wrapTextCenter(ctx, choice.blurb, x + 160, y + 120, 280, 22);
    ctx.fillStyle = '#5aff8a';
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.fillText(choice.detail || '', x + 160, y + 260);
  });
  button(ctx, { x: 490, y: 560, w: 300, h: 48 }, 'REROLL  (' + state.economy.lumen + ' lumen, costs 25)', state.economy.lumen >= 25);
}

function wrapTextCenter(ctx, text, cx, y, maxW, lineH) {
  const words = String(text).split(' ');
  let line = '';
  let cy = y;
  const prev = ctx.textAlign;
  ctx.textAlign = 'center';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, cy);
      line = w;
      cy += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, cx, cy);
  ctx.textAlign = prev;
}

function drawResults(ctx, state) {
  dim(ctx);
  const last = state.history.nights[state.history.nights.length - 1];
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5aff8a';
  ctx.font = 'bold 40px "Trebuchet MS", sans-serif';
  ctx.fillText('NIGHT ' + state.night + ' CLEARED', CANVAS_W / 2, 110);
  ctx.fillStyle = '#f4ead8';
  ctx.font = '17px "Trebuchet MS", sans-serif';
  if (last) ctx.fillText(last.burned + ' shades burned · ' + last.lumenEarned + ' lumen earned · lantern ' + last.lanternHp + ' HP kept · best GLEAM x' + last.gleamBest, CANVAS_W / 2, 146);
  // Per-night chart: burned per night, with the lantern line.
  const data = chartData(state.history);
  const cx = 340, cy = 420, cw = 600, ch = 180;
  ctx.fillStyle = 'rgba(27,32,64,0.92)';
  ctx.strokeStyle = '#c97b4a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(cx, 190, cw, ch + 60, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('BURNED PER NIGHT (bars) · LANTERN HP KEPT (line)', cx + 16, 216);
  const maxV = Math.max(10, ...data.map((d) => d.spawned));
  data.forEach((d, i) => {
    const bx = cx + 30 + i * ((cw - 60) / Math.max(1, data.length));
    const bw = Math.min(52, (cw - 60) / Math.max(1, data.length) - 10);
    const bh = (d.burned / maxV) * ch;
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(bx, cy - bh, bw, bh);
    ctx.fillStyle = '#f4ead8';
    ctx.font = '12px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, bx + bw / 2, cy + 18);
    ctx.fillText(String(d.burned), bx + bw / 2, cy - bh - 6);
  });
  // Lantern line.
  ctx.strokeStyle = '#5aff8a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((d, i) => {
    const bx = cx + 30 + i * ((cw - 60) / Math.max(1, data.length)) + 26;
    const ly = cy - (d.lanternHp / state.lanternMax) * ch;
    if (i === 0) ctx.moveTo(bx, ly); else ctx.lineTo(bx, ly);
  });
  ctx.stroke();
  ctx.textAlign = 'center';
  button(ctx, { x: 490, y: 520, w: 300, h: 64 }, 'DRAFT THE DAWN  (SPACE)', true, true);
  const feats = featSummary(state.feats);
  ctx.fillStyle = '#b9b3a4';
  ctx.font = '14px "Trebuchet MS", sans-serif';
  ctx.fillText('Score ' + state.score.toLocaleString() + ' · Lumen ' + state.economy.lumen + ' · Feats ' + feats.earned + '/' + feats.total, CANVAS_W / 2, 630);
}

function drawWin(ctx, state) {
  dim(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 56px "Trebuchet MS", sans-serif';
  ctx.fillText('THE DAWN WAKES', CANVAS_W / 2, 160);
  ctx.fillStyle = '#f4ead8';
  ctx.font = '20px "Trebuchet MS", sans-serif';
  ctx.fillText('Nine nights. The Pale King is ash. The lantern burns for the morning.', CANVAS_W / 2, 200);
  drawEndStats(ctx, state, 260);
  button(ctx, { x: 340, y: 520, w: 260, h: 64 }, 'ECLIPSE ENDLESS', true, true);
  button(ctx, { x: 680, y: 520, w: 260, h: 64 }, 'PLAY AGAIN', true);
  button(ctx, { x: 510, y: 600, w: 260, h: 48 }, 'TITLE SCREEN', true);
}

function drawLose(ctx, state) {
  dim(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a5a';
  ctx.font = 'bold 56px "Trebuchet MS", sans-serif';
  ctx.fillText('THE LANTERN DIES', CANVAS_W / 2, 160);
  ctx.fillStyle = '#f4ead8';
  ctx.font = '20px "Trebuchet MS", sans-serif';
  ctx.fillText('Night ' + state.night + ' keeps the hill. The dark is patient — so are you.', CANVAS_W / 2, 200);
  drawEndStats(ctx, state, 260);
  button(ctx, { x: 340, y: 520, w: 260, h: 64 }, 'TRY AGAIN', true, true);
  button(ctx, { x: 680, y: 520, w: 260, h: 64 }, 'TITLE SCREEN', true);
}

function drawEndStats(ctx, state, y0) {
  ctx.fillStyle = '#f4ead8';
  ctx.font = '18px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Score ' + state.score.toLocaleString() + '  ·  ' + state.stats.burned + ' shades burned  ·  Best GLEAM x' + state.stats.bestGleam + '  ·  ' + state.difficulty.label + ' difficulty', CANVAS_W / 2, y0);
  ctx.fillStyle = '#b9b3a4';
  ctx.font = '15px "Trebuchet MS", sans-serif';
  const feats = featSummary(state.feats);
  ctx.fillText('Feats ' + feats.earned + '/' + feats.total + (feats.list.length ? ' — ' + feats.list.join(', ') : ''), CANVAS_W / 2, y0 + 30);
  ctx.fillText('Best on ' + state.difficulty.label + ': ' + (state.save ? (state.save.best[state.difficultyId].score || 0).toLocaleString() : '0') + ' pts', CANVAS_W / 2, y0 + 56);
}

function drawPaused(ctx, state) {
  dim(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 44px "Trebuchet MS", sans-serif';
  ctx.fillText('PAUSED', CANVAS_W / 2, 300);
  ctx.fillStyle = '#f4ead8';
  ctx.font = '17px "Trebuchet MS", sans-serif';
  ctx.fillText('The dawn waits. Press P or click RESUME.', CANVAS_W / 2, 340);
  button(ctx, { x: 490, y: 400, w: 300, h: 64 }, 'RESUME  (P)', true, true);
  button(ctx, { x: 490, y: 480, w: 300, h: 48 }, 'RESTART RUN', true);
  button(ctx, { x: 490, y: 540, w: 300, h: 48 }, 'TITLE SCREEN', true);
}

function drawShop(ctx, state) {
  dim(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
  ctx.fillText('THE GLASS SHOP — ' + state.economy.lumen + ' LUMEN', CANVAS_W / 2, 100);
  ctx.fillStyle = '#f4ead8';
  ctx.font = '15px "Trebuchet MS", sans-serif';
  ctx.fillText('Click a piece of glass to buy it into your hand. Esc closes.', CANVAS_W / 2, 130);
  PRISM_IDS.forEach((id, i) => {
    const def = PRISM_TYPES[id];
    const x = 140 + (i % 4) * 260;
    const y = 170 + Math.floor(i / 4) * 220;
    const afford = state.economy.lumen >= def.cost;
    ctx.fillStyle = 'rgba(27,32,64,0.95)';
    ctx.strokeStyle = afford ? '#c97b4a' : '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, 240, 190, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(x + 120, y + 26);
    ctx.lineTo(x + 150, y + 66);
    ctx.lineTo(x + 90, y + 66);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f4ead8';
    ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
    ctx.fillText(def.name, x + 120, y + 100);
    ctx.fillStyle = '#b9b3a4';
    ctx.font = '13px "Trebuchet MS", sans-serif';
    wrapTextCenter(ctx, def.blurb, x + 120, y + 126, 210, 18);
    ctx.fillStyle = afford ? '#ffe14d' : '#777';
    ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
    ctx.fillText(def.cost + ' LUMEN', x + 120, y + 172);
  });
  button(ctx, { x: 490, y: 660, w: 300, h: 48 }, 'CLOSE  (Esc)', true);
}

function drawAlmanac(ctx, state) {
  dim(ctx);
  const prog = almanacProgress(state.almanac);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
  ctx.fillText('ALMANAC — ' + prog.met + '/' + prog.total + ' met (' + prog.pct + '%)', 80, 90);
  ctx.fillStyle = '#b9b3a4';
  ctx.font = '14px "Trebuchet MS", sans-serif';
  ctx.fillText('Unmet entries show as ???. Meet a shade by burning it; meet glass by drafting or buying it.', 80, 116);
  const cols = [
    { title: 'SHADES', entries: shadeEntries(state.almanac), x: 80 },
    { title: 'GLASS', entries: prismEntries(state.almanac), x: 480 },
    { title: 'RELICS', entries: relicEntries(state.almanac), x: 880 },
  ];
  for (const col of cols) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
    ctx.fillText(col.title, col.x, 150);
    let y = 178;
    for (const e of col.entries) {
      ctx.fillStyle = e.met ? '#f4ead8' : '#666';
      ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
      ctx.fillText(e.name, col.x, y);
      ctx.fillStyle = '#b9b3a4';
      ctx.font = '12px "Trebuchet MS", sans-serif';
      const detail = e.weaknessText || e.throws || e.detail || e.blurb || '';
      wrapText(ctx, String(detail).slice(0, 90), col.x, y + 16, 360, 15);
      y += 52;
    }
  }
  button(ctx, { x: 490, y: 700, w: 300, h: 48 }, 'CLOSE  (Esc)', true);
}

function drawOptions(ctx, state) {
  dim(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
  ctx.fillText('OPTIONS', CANVAS_W / 2, 160);
  const o = state.options;
  const rows = [
    { id: 'opt-mute', label: 'SOUND: ' + (o.muted ? 'MUTED' : 'ON') },
    { id: 'opt-music', label: 'MUSIC: ' + (o.music ? 'ON' : 'OFF') },
    { id: 'opt-speed', label: 'GAME SPEED: ' + o.speed + 'x' },
    { id: 'opt-shake', label: 'SCREEN SHAKE: ' + (o.shake ? 'ON' : 'OFF') },
    { id: 'opt-cb', label: 'HUE PATTERNS (COLOUR-BLIND): ' + (o.colorBlind ? 'ON' : 'OFF') },
    { id: 'opt-vol-down', label: 'VOLUME −  (' + Math.round(o.volume * 100) + '%)' },
    { id: 'opt-vol-up', label: 'VOLUME +' },
  ];
  rows.forEach((r, i) => {
    button(ctx, { x: 440, y: 210 + i * 62, w: 400, h: 48 }, r.label, true);
  });
  button(ctx, { x: 490, y: 680, w: 300, h: 48 }, 'CLOSE  (Esc)', true);
}

function drawHelp(ctx, state) {
  dim(ctx);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
  ctx.fillText('HOW TO PLAY', 140, 100);
  const lines = [
    'The shades climb the hill to eat the Lantern. Only light burns them —',
    'and only the colour they fear. A shade\'s weakness glyph (R, G, B, Y, M, C, W)',
    'is printed on its body and in the legend at the right.',
    'Place prisms in the dawn\'s path. White light splits, bends and mixes:',
    'RED + GREEN = YELLOW, RED + BLUE = MAGENTA, GREEN + BLUE = CYAN,',
    'all three = WHITE. Overlap two beams on one shade to mix the hue it fears.',
    'Burns chained within 1.5 seconds raise the GLEAM combo, up to x5.',
    'After every night, draft 1 of 3: new glass, an upgrade, or a relic.',
    'Survive all 9 nights. On night 9 the Pale King eats one colour per phase.',
    'Win, and Eclipse endless mode opens — how many nights can the dawn hold?',
  ];
  ctx.fillStyle = '#f4ead8';
  ctx.font = '16px "Trebuchet MS", sans-serif';
  lines.forEach((l, i) => ctx.fillText(l, 140, 150 + i * 26));
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
  ctx.fillText('CONTROLS', 140, 440);
  ctx.fillStyle = '#f4ead8';
  ctx.font = '14px "Trebuchet MS", sans-serif';
  SHORTCUTS.forEach((s, i) => ctx.fillText(s.key + ' — ' + s.action, 140, 468 + i * 22));
  button(ctx, { x: 490, y: 700, w: 300, h: 48 }, 'CLOSE  (Esc)', true);
  void state;
}

// ---- Hit regions: the same coordinates the drawings use. ----
export function hitRegions(state) {
  const regions = [];
  const add = (id, r) => regions.push({ id, ...r });
  // Top bar buttons.
  add('shop', { x: 880, y: 26, w: 70, h: 40 });
  add('almanac', { x: 958, y: 26, w: 92, h: 40 });
  add('options', { x: 1058, y: 26, w: 92, h: 40 });
  add('help', { x: 1158, y: 26, w: 40, h: 40 });
  if (state.ui.shopOpen) {
    PRISM_IDS.forEach((id, i) => {
      add('buy:' + id, { x: 140 + (i % 4) * 260, y: 170 + Math.floor(i / 4) * 220, w: 240, h: 190 });
    });
    add('close-panel', { x: 490, y: 660, w: 300, h: 48 });
    return regions;
  }
  if (state.ui.almanacOpen || state.ui.optionsOpen || state.ui.helpOpen) {
    add('close-panel', { x: 490, y: 700, w: 300, h: 48 });
    if (state.ui.optionsOpen) {
      const ids = ['opt-mute', 'opt-music', 'opt-speed', 'opt-shake', 'opt-cb', 'opt-vol-down', 'opt-vol-up'];
      ids.forEach((id, i) => add(id, { x: 440, y: 210 + i * 62, w: 400, h: 48 }));
    }
    return regions;
  }
  if (state.phase === 'title') {
    for (const c of [{ id: 'dusk', x: 190 }, { id: 'ember', x: 490 }, { id: 'dawn', x: 790 }]) {
      add('difficulty:' + c.id, { x: c.x, y: 320, w: 300, h: 110 });
    }
    add('start-run', { x: 490, y: 470, w: 300, h: 64 });
    return regions;
  }
  if (state.phase === 'draft') {
    state.draftChoices.forEach((c, i) => add('draft:' + i, { x: 140 + i * 360, y: 200, w: 320, h: 300 }));
    add('reroll', { x: 490, y: 560, w: 300, h: 48 });
    return regions;
  }
  if (state.phase === 'results') {
    add('to-draft', { x: 490, y: 520, w: 300, h: 64 });
    return regions;
  }
  if (state.phase === 'win') {
    add('eclipse', { x: 340, y: 520, w: 260, h: 64 });
    add('play-again', { x: 680, y: 520, w: 260, h: 64 });
    add('to-title', { x: 510, y: 600, w: 260, h: 48 });
    return regions;
  }
  if (state.phase === 'lose') {
    add('play-again', { x: 340, y: 520, w: 260, h: 64 });
    add('to-title', { x: 680, y: 520, w: 260, h: 64 });
    return regions;
  }
  if (state.phase === 'paused') {
    add('resume', { x: 490, y: 400, w: 300, h: 64 });
    add('restart-run', { x: 490, y: 480, w: 300, h: 48 });
    add('to-title', { x: 490, y: 540, w: 300, h: 48 });
    return regions;
  }
  // In-play: hand slots, board cells, start button.
  state.hand.forEach((p, i) => add('hand:' + i, { x: 24 + 14 + i * 76, y: 590, w: 68, h: 88 }));
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 10; c++) add('cell:' + c + ',' + r, { x: BOARD_X + c * CELL, y: BOARD_Y + r * CELL, w: CELL, h: CELL });
  }
  if (state.phase === 'build') add('start-night', LAYOUT.startBtn);
  return regions;
}

export function regionAt(state, x, y) {
  for (const r of hitRegions(state)) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r.id;
  }
  return null;
}
