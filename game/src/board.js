// board.js — the hill: a 10x7 grid between the Dawn Gate and the Lantern.
// The board owns cells, emitters, the lantern, and the question every other
// system asks: "what is in this cell, and can a prism go here?"
// Coordinates: col 0..9 left to right, row 0..6 top (gate) to bottom (lantern).

import { COLS, ROWS, EMITTERS, LANTERN_COL, LANTERN_ROW, CELL, BOARD_X, BOARD_Y } from './config.js';

export function createBoard() {
  // cells[row][col] = null | { prismId, level, rotation, uid }
  const cells = [];
  for (let r = 0; r < ROWS; r++) cells.push(new Array(COLS).fill(null));
  return {
    cells,
    // The lantern row is sacred ground: no prism may sit on the lantern.
    lantern: { col: LANTERN_COL, row: LANTERN_ROW },
    emitters: EMITTERS.map((col) => ({ col, row: 0 })),
  };
}

export function inBounds(col, row) {
  return col >= 0 && col < COLS && row >= 0 && row < ROWS;
}

export function isLanternCell(col, row) {
  return col === LANTERN_COL && row === LANTERN_ROW;
}

// A prism may be placed on any empty, in-bounds cell except the lantern
// cell and the emitter cells on the top row.
export function canPlace(board, col, row) {
  if (!inBounds(col, row)) return { ok: false, why: 'Outside the hill.' };
  if (isLanternCell(col, row)) return { ok: false, why: 'The Lantern stands there.' };
  if (row === 0 && EMITTERS.includes(col)) return { ok: false, why: 'The Dawn Gate shines there.' };
  if (board.cells[row][col]) return { ok: false, why: 'Glass already stands there.' };
  return { ok: true, why: '' };
}

export function placePrism(board, col, row, prism) {
  const check = canPlace(board, col, row);
  if (!check.ok) return check;
  board.cells[row][col] = prism;
  return { ok: true, why: '' };
}

export function removePrism(board, col, row) {
  if (!inBounds(col, row)) return null;
  const p = board.cells[row][col];
  board.cells[row][col] = null;
  return p;
}

export function prismAt(board, col, row) {
  if (!inBounds(col, row)) return null;
  return board.cells[row][col];
}

export function listPrisms(board) {
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board.cells[r][c]) out.push({ col: c, row: r, prism: board.cells[r][c] });
    }
  }
  return out;
}

// Pixel helpers for the renderer: cell centre, board edges.
export function cellCenter(col, row) {
  return { x: BOARD_X + col * CELL + CELL / 2, y: BOARD_Y + row * CELL + CELL / 2 };
}

export function cellFromPoint(x, y) {
  const col = Math.floor((x - BOARD_X) / CELL);
  const row = Math.floor((y - BOARD_Y) / CELL);
  return { col, row, inside: inBounds(col, row) };
}

// Shades walk straight down their spawn column toward the lantern row.
// A shade's lane is its column; it breaches when it reaches the lantern row.
export function breachRow() {
  return ROWS - 1;
}
