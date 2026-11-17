// input.js — mouse and keyboard, the player's hands.
// Click a prism in the hand, click a cell to place it. Click a placed
// prism to rotate it; right-click it to sell it. SPACE starts the night,
// P pauses, Esc cancels a selection or closes a panel, 1-3 pick a draft
// card, M mutes. Every handler is a hook the bootstrap supplies, so this
// file knows nothing about the sim — it only translates events into
// intentions, and reports hover for the renderer to highlight.

import { cellFromPoint } from './board.js';

export function attachInput(canvas, hooks) {
  const toLocal = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  canvas.addEventListener('mousemove', (e) => {
    const p = toLocal(e);
    const cell = cellFromPoint(p.x, p.y);
    hooks.onHover(p, cell.inside ? cell : null);
  });

  canvas.addEventListener('mouseleave', () => hooks.onHover(null, null));

  canvas.addEventListener('click', (e) => {
    const p = toLocal(e);
    hooks.onClick(p);
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const p = toLocal(e);
    hooks.onRightClick(p);
  });

  canvas.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === ' ') { e.preventDefault(); hooks.onKey('space'); }
    else if (key === 'p') hooks.onKey('pause');
    else if (key === 'escape') hooks.onKey('escape');
    else if (key === 'm') hooks.onKey('mute');
    else if (key === 'enter') hooks.onKey('enter');
    else if (key >= '1' && key <= '9') hooks.onKey('digit:' + key);
    else if (key === 'r') hooks.onKey('rotate');
    else if (key === 'h') hooks.onKey('help');
  });

  canvas.addEventListener('mousedown', () => hooks.onInteract());
  canvas.addEventListener('touchstart', () => hooks.onInteract(), { passive: true });
  return { detach() {} };
}

// Keyboard shortcuts, printed on the title screen and the help panel.
export const SHORTCUTS = [
  { key: 'Click hand → click cell', action: 'Place a prism' },
  { key: 'Click placed prism', action: 'Rotate it (filter cycles its hue)' },
  { key: 'Right-click placed prism', action: 'Sell it (70% refund)' },
  { key: 'SPACE', action: 'Start the night / next night' },
  { key: '1 / 2 / 3', action: 'Pick a draft card' },
  { key: 'P', action: 'Pause' },
  { key: 'R', action: 'Rotate the prism under the mouse' },
  { key: 'M', action: 'Mute' },
  { key: 'Esc', action: 'Cancel selection / close panel' },
];
