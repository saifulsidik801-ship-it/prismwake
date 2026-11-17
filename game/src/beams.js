// beams.js — the dawn's path: trace every beam from the gate, through
// the glass, across the hill. A beam is a walker: it enters a cell, lights
// it, and either carries on straight or is remade by the prism standing
// there. When two beams cross in one cell their colours UNION — red
// meeting green lights the cell yellow — which is how mixed hues are born.
// The tracer returns a lit-cell map the combat system burns shades with.

import { COLS, ROWS, BEAM, EMITTERS } from './config.js';
import { mixComponents, HUES } from './hues.js';
import { prismAt, inBounds } from './board.js';
import { prismPower, prismOutHues } from './prisms.js';

// 8 compass directions, clockwise from east. Down (the dawn's own
// direction) is index 2. A quarter turn is 2 steps; a 45-degree split is 1.
export const DIRS = [
  { dx: 1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 1 },
  { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
];
export const DOWN = 2;

export function rotateDir(index, steps) {
  return (((index + steps) % 8) + 8) % 8;
}

// What leaves a prism, given the incoming direction and the prism's
// rotation. Returns [{ dir, hue, powerMul }]. Filter and lens keep the
// beam straight; splitter, dawn and veil fan it out; bender turns it;
// mirror throws it back up the hill at a diagonal.
export function prismOutputs(prism, inDir) {
  const rot = prism.rotation * 2; // quarter turns -> 45-degree steps
  const hues = prismOutHues(prism);
  const power = prismPower(prism);
  switch (prism.typeId) {
    // Splitting glass fans colour out AND lets a dimmed white core carry
    // on straight: the column below a splitter stays lit, so the glass
    // never darkens the lane it stands in.
    case 'splitter':
      return [
        { dir: rotateDir(inDir, -1 + rot), hue: hues[0], powerMul: power * (1 - BEAM.splitterLoss) },
        { dir: rotateDir(inDir, 1 + rot), hue: hues[1], powerMul: power * (1 - BEAM.splitterLoss) },
        { dir: inDir, hue: 'white', powerMul: power * 0.5 },
      ];
    case 'dawn':
      return [
        { dir: rotateDir(inDir, -1 + rot), hue: hues[0], powerMul: power },
        { dir: rotateDir(inDir, 0 + rot), hue: hues[1], powerMul: power },
        { dir: rotateDir(inDir, 1 + rot), hue: hues[2], powerMul: power },
        { dir: inDir, hue: 'white', powerMul: power * 0.5 },
      ];
    case 'veil':
      return [
        { dir: rotateDir(inDir, -1 + rot), hue: hues[0], powerMul: power },
        { dir: rotateDir(inDir, 1 + rot), hue: hues[1], powerMul: power },
        { dir: inDir, hue: 'white', powerMul: power * 0.5 },
      ];
    case 'bender':
      return [{ dir: rotateDir(inDir, 2 + rot), hue: hues[0], powerMul: power }];
    case 'mirror':
      return [{ dir: rotateDir(inDir, 4 - 1 + rot), hue: hues[0], powerMul: power }];
    case 'lens':
      return [{ dir: inDir, hue: hues[0], powerMul: power }];
    case 'filter':
      return [{ dir: inDir, hue: hues[0], powerMul: power }];
    default:
      return [{ dir: inDir, hue: 'white', powerMul: 1 }];
  }
}

// Trace all beams on a board. Returns:
//   lit: Map "col,row" -> { hue, power, count } (hue is the mixed hue)
//   segments: [{ x0, y0, x1, y1, hue, power }] for the renderer
//   cellsLit: number of distinct lit cells
export function traceBeams(board) {
  const lit = new Map();
  const segments = [];
  const queue = [];
  for (const col of EMITTERS) {
    queue.push({ col, row: 0, dir: DOWN, hue: 'white', power: BEAM.basePower, steps: 0 });
  }
  const seen = new Set();
  while (queue.length > 0) {
    const beam = queue.shift();
    let { col, row, dir, hue, power } = beam;
    let steps = beam.steps;
    while (steps < BEAM.maxSteps && power >= BEAM.minPower && inBounds(col, row)) {
      const key = col + ',' + row + ',' + dir + ',' + hue;
      if (seen.has(key)) break;
      seen.add(key);
      const d = DIRS[dir];
      // Light this cell.
      const cellKey = col + ',' + row;
      const prev = lit.get(cellKey);
      const comps = new Set([...(prev ? HUES[prev.hue].components : []), ...HUES[hue].components]);
      const mixed = mixComponents([...comps], []);
      lit.set(cellKey, {
        hue: mixed,
        power: Math.max(prev ? prev.power : 0, power),
        count: (prev ? prev.count : 0) + 1,
      });
      segments.push({ col, row, dir, hue, power });
      // A prism remakes the beam; otherwise it carries on straight.
      const prism = prismAt(board, col, row);
      if (prism) {
        for (const out of prismOutputs(prism, dir)) {
          const od = DIRS[out.dir];
          queue.push({
            col: col + od.dx, row: row + od.dy, dir: out.dir,
            hue: out.hue, power: power * out.powerMul, steps: steps + 1,
          });
        }
        break;
      }
      col += d.dx;
      row += d.dy;
      power *= 1 - BEAM.falloffPerCell;
      steps++;
    }
  }
  return { lit, segments, cellsLit: lit.size };
}

// The light in one cell, or null when the cell is dark.
export function lightAt(litMap, col, row) {
  return litMap.get(col + ',' + row) || null;
}

// How many cells burn at full power (power >= 0.9) — a HUD stat.
export function brightCells(litMap) {
  let n = 0;
  for (const cell of litMap.values()) if (cell.power >= 0.9) n++;
  return n;
}
