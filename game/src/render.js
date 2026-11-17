// render.js — the scene: the hill at night, drawn on canvas.
// The board is a dark hillside under a dawn sky: the gate glows along the
// top edge, the lantern burns at the bottom, beams cut the dark in their
// true hues, shades climb as coloured silhouettes with their weakness
// glyph, and prisms stand as glass shapes with a rotation tick. Time of
// day tints the floor per realm; longer cast shadows sell the light.
// Everything drawn here comes from the sim state — never invented.

import { COLS, ROWS, CELL, BOARD_X, BOARD_Y, BOARD_W, BOARD_H, EMITTERS, LANTERN_COL, LANTERN_ROW, CANVAS_W, CANVAS_H, BOSS } from './config.js';
import { HUES } from './hues.js';
import { cellCenter } from './board.js';
import { shakeOffset } from './fx.js';

// Realm floor tints: Murkwood indigo, Emberfields ember, Glassmere teal,
// the Pale Court bone-white. The tint is the realm, readable at a glance.
// Kept light enough that the dawn still reads on the hill.
export const REALM_TINTS = {
  Murkwood: '#4a4a72',
  Emberfields: '#6e4a34',
  Glassmere: '#2e5a66',
  'the Pale Court': '#5a5266',
};

export function realmTint(state) {
  if (state.eclipse) return '#241a2e';
  const night = state.night;
  if (night <= 2) return REALM_TINTS.Murkwood;
  if (night <= 4) return REALM_TINTS.Emberfields;
  if (night <= 7) return REALM_TINTS.Glassmere;
  return REALM_TINTS['the Pale Court'];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawScene(ctx, state, litMap, segments, nowMs) {
  ctx.save();
  const off = shakeOffset(state.fx, state.options.shake);
  ctx.translate(off.x, off.y);
  drawSky(ctx, state, nowMs);
  drawBoard(ctx, state, litMap, nowMs);
  drawBeams(ctx, segments, nowMs);
  drawPrisms(ctx, state, nowMs);
  drawLantern(ctx, state, nowMs);
  drawShades(ctx, state, nowMs);
  drawParticles(ctx, state);
  drawFloaters(ctx, state);
  ctx.restore();
}

function drawSky(ctx, state, nowMs) {
  // Dawn breaking over the hill: bright gold at the top, warming to rose,
  // then deep indigo at the bottom. The cover must read bright at a glance.
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  g.addColorStop(0, '#ffe9a8');
  g.addColorStop(0.22, '#f7b267');
  g.addColorStop(0.45, '#c97b6a');
  g.addColorStop(0.7, '#4a3560');
  g.addColorStop(1, '#1a1430');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // The rising sun: a pale disc behind the gate, glowing over the hill.
  const sun = ctx.createRadialGradient(640, 60, 10, 640, 60, 260);
  sun.addColorStop(0, 'rgba(255,246,216,0.95)');
  sun.addColorStop(0.4, 'rgba(255,209,102,0.55)');
  sun.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(380, -40, 520, 360);
  // Drifting stars, seeded by the clock so the title shimmers.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 40; i++) {
    const x = (i * 137.5) % CANVAS_W;
    const y = 320 + (i * 89.3) % 300;
    const tw = 0.3 + 0.2 * Math.sin(nowMs / 700 + i);
    ctx.globalAlpha = Math.max(0.05, tw);
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawBoard(ctx, state, litMap, nowMs) {
  const tint = realmTint(state);
  // Dawn wash: the hill is lit from the gate down — bright gold at the
  // top fading into the realm's own tint at the lantern. The board is the
  // brightest thing on the hill, so the cover reads at a glance.
  const wash = ctx.createLinearGradient(0, BOARD_Y, 0, BOARD_Y + BOARD_H);
  wash.addColorStop(0, '#f2cf92');
  wash.addColorStop(0.45, tint);
  wash.addColorStop(1, tint);
  ctx.fillStyle = wash;
  roundRect(ctx, BOARD_X - 8, BOARD_Y - 8, BOARD_W + 16, BOARD_H + 16, 12);
  ctx.fill();
  ctx.strokeStyle = '#c97b4a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Cells, alternating, with lit cells glowing in their mixed hue.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = BOARD_X + c * CELL;
      const y = BOARD_Y + r * CELL;
      const lit = litMap.get(c + ',' + r);
      if (lit) {
        ctx.fillStyle = HUES[lit.hue].color;
        ctx.globalAlpha = 0.30 + Math.min(0.45, lit.power * 0.45);
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        ctx.globalAlpha = 1;
      } else if ((r + c) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
    }
  }
  // Dawn Gate: three glowing emitter mouths along the top edge.
  for (const col of EMITTERS) {
    const x = BOARD_X + col * CELL;
    const pulse = 0.7 + 0.3 * Math.sin(nowMs / 400 + col);
    ctx.fillStyle = 'rgba(255,209,102,' + pulse.toFixed(2) + ')';
    roundRect(ctx, x + 6, BOARD_Y - 14, CELL - 12, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#fff6d8';
    ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DAWN', x + CELL / 2, BOARD_Y - 18);
  }
  // Hover highlight on the cell under the mouse.
  if (state.hover && state.phase === 'build') {
    const { col, row } = state.hover;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.strokeRect(BOARD_X + col * CELL + 2, BOARD_Y + row * CELL + 2, CELL - 4, CELL - 4);
  }
}

function drawBeams(ctx, segments, nowMs) {
  ctx.save();
  ctx.lineCap = 'round';
  for (const seg of segments) {
    const a = cellCenter(seg.col, seg.row);
    const d = seg.dir;
    const dx = [1, 1, 0, -1, -1, -1, 0, 1][d];
    const dy = [0, 1, 1, 1, 0, -1, -1, -1][d];
    const b = { x: a.x + dx * CELL * 0.5, y: a.y + dy * CELL * 0.5 };
    const hue = HUES[seg.hue];
    const flicker = 0.8 + 0.2 * Math.sin(nowMs / 180 + seg.col * 2 + seg.row);
    ctx.strokeStyle = hue.color;
    ctx.globalAlpha = Math.min(1, seg.power) * 0.7 * flicker + 0.25;
    ctx.lineWidth = 7 + seg.power * 6;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.globalAlpha = Math.min(1, seg.power) * flicker;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPrisms(ctx, state, nowMs) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const prism = state.board.cells[r][c];
      if (!prism) continue;
      const ctr = cellCenter(c, r);
      const def = prismShape(prism);
      // Cast shadow away from the gate.
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(ctr.x + 6, ctr.y + 16, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Glass body.
      ctx.save();
      ctx.translate(ctr.x, ctr.y);
      ctx.rotate((prism.rotation * Math.PI) / 2);
      ctx.fillStyle = def.color;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (def.shape === 'lens') {
        ctx.ellipse(0, 0, 12, 20, 0, 0, Math.PI * 2);
      } else if (def.shape === 'mirror') {
        ctx.rect(-4, -20, 8, 40);
      } else {
        ctx.moveTo(0, -20); ctx.lineTo(17, 14); ctx.lineTo(-17, 14); ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      // Level pips and hue glyph.
      ctx.fillStyle = '#ffd166';
      for (let i = 0; i < prism.level; i++) {
        ctx.beginPath();
        ctx.arc(ctr.x - 10 + i * 10, ctr.y + 24, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (prism.typeId === 'filter') {
        ctx.fillStyle = HUES[prism.filterHue].color;
        ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(HUES[prism.filterHue].glyph, ctr.x, ctr.y - 24);
      }
    }
  }
}

import { PRISM_TYPES } from './prisms.js';
function prismShape(prism) {
  const def = PRISM_TYPES[prism.typeId];
  return { color: def.color, shape: def.shape };
}

function drawLantern(ctx, state, nowMs) {
  const ctr = cellCenter(LANTERN_COL, LANTERN_ROW);
  const flicker = 0.8 + 0.2 * Math.sin(nowMs / 260);
  const glow = ctx.createRadialGradient(ctr.x, ctr.y, 4, ctr.x, ctr.y, 70);
  glow.addColorStop(0, 'rgba(255,179,71,' + (0.55 * flicker).toFixed(2) + ')');
  glow.addColorStop(1, 'rgba(255,179,71,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(ctr.x, ctr.y, 70, 0, Math.PI * 2);
  ctx.fill();
  // Lantern body: a little brass house with a flame.
  ctx.fillStyle = '#8a6a2f';
  ctx.fillRect(ctr.x - 14, ctr.y - 18, 28, 34);
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.moveTo(ctr.x, ctr.y - 26);
  ctx.quadraticCurveTo(ctr.x + 9, ctr.y - 8, ctr.x, ctr.y + 2);
  ctx.quadraticCurveTo(ctr.x - 9, ctr.y - 8, ctr.x, ctr.y - 26);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LANTERN ' + state.lanternHp + '/' + state.lanternMax, ctr.x, ctr.y + 26);
  if (state.lanternHp <= 3) {
    ctx.fillStyle = '#ff5a5a';
    ctx.fillText('THE LIGHT IS FAILING', ctr.x, ctr.y + 40);
  }
}

function drawShades(ctx, state, nowMs) {
  for (const shade of state.shades) {
    const ctr = cellCenter(shade.col, Math.max(0, Math.min(ROWS - 1, Math.floor(shade.y))));
    const frac = shade.y - Math.floor(shade.y);
    const y = BOARD_Y + shade.y * CELL + CELL / 2;
    const x = BOARD_X + shade.x * CELL + CELL / 2;
    const def = shadeDef(shade);
    const bob = Math.sin(nowMs / 300 + shade.uid) * 2;
    // Shadow body.
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = shade.burning ? '#ff8a5a' : def.color;
    ctx.globalAlpha = shade.boss ? 0.97 : 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, def.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Eyes: two pale dots, watching the lantern.
    ctx.fillStyle = '#e8e4d8';
    ctx.beginPath(); ctx.arc(-5, -3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -3, 2.5, 0, Math.PI * 2); ctx.fill();
    // Weakness glyph on the body, so the player never has to guess.
    // The King shows his current phase's weakness, which changes as he burns.
    const weaknessId = shade.boss ? BOSS.phases[shade.phase || 0].weakness : shade.weakness;
    const hue = HUES[weaknessId];
    ctx.fillStyle = hue.color;
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hue.glyph, 0, 5);
    if (state.options.colorBlind) {
      ctx.strokeStyle = hue.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, def.size + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // Health bar above the shade.
    const w = shade.boss ? 64 : 34;
    const fracHp = Math.max(0, shade.hp / shade.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - w / 2, y - def.size - 12, w, 5);
    ctx.fillStyle = fracHp > 0.5 ? '#5aff8a' : fracHp > 0.25 ? '#ffe14d' : '#ff5a5a';
    ctx.fillRect(x - w / 2, y - def.size - 12, w * fracHp, 5);
    if (shade.boss) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE PALE KING', x, y - def.size - 18);
    }
    void ctr; void frac;
  }
}

import { SHADE_KINDS } from './shades.js';
function shadeDef(shade) {
  return SHADE_KINDS[shade.kindId];
}

function drawParticles(ctx, state) {
  for (const p of state.fx.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, state) {
  for (const f of state.fx.floaters) {
    const rise = f.age * 40;
    ctx.globalAlpha = Math.max(0, 1 - f.age / f.life);
    ctx.fillStyle = f.color;
    ctx.font = (f.big ? 'bold 30px' : 'bold 18px') + ' "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y - rise);
  }
  ctx.globalAlpha = 1;
}
