// playtest.cjs — the full loop with real inputs, plus a headless win.
// Clicks through title -> build -> place -> rotate -> night -> pause ->
// resume, then drives a bot run in-page to a real win, and counts console
// errors the whole way. 0 errors and a win is a pass.
// Usage: node tools/playtest.cjs [port]
const { chromium } = require('/home/hatch/workspace/mm-wallet/node_modules/playwright-core');
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CHROME = '/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';

const CHECKS = [];
function check(name, ok, detail) {
  CHECKS.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? ' — ' + detail : ''));
}

async function main() {
  const port = process.argv[2] || '8092';
  const server = spawn('node', [path.join(ROOT, 'tools/serve.cjs'), port], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1200));
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let failed = false;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    await page.goto(`http://localhost:${port}/game/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__PRISMWAKE_READY__, null, { timeout: 30000 });
    const phase = () => page.evaluate(() => window.__PRISMWAKE__.state.phase);
    check('title shown', (await phase()) === 'title');

    // Pick DAWN difficulty, then start the run (real clicks).
    await page.mouse.click(940, 375); // DAWN card
    await page.waitForTimeout(200);
    await page.mouse.click(640, 502); // START RUN
    await page.waitForTimeout(300);
    check('run starts in build', (await phase()) === 'build', await phase());

    // Select hand slot 0 (splitter) and place it under emitter col 2, row 1.
    await page.mouse.click(72, 634);
    await page.waitForTimeout(150);
    await page.mouse.click(184, 192);
    await page.waitForTimeout(200);
    const placed = await page.evaluate(() => {
      const s = window.__PRISMWAKE__.state;
      return s.board.cells[1][2] ? s.board.cells[1][2].typeId : null;
    });
    check('prism placed by click', placed === 'splitter', 'placed=' + placed);

    // Click the placed prism to rotate it.
    await page.mouse.click(184, 192);
    await page.waitForTimeout(150);
    const rot = await page.evaluate(() => window.__PRISMWAKE__.state.board.cells[1][2].rotation);
    check('prism rotates on click', rot === 1, 'rotation=' + rot);

    // Start the night with SPACE, let it run, pause, resume.
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    check('night starts on SPACE', (await phase()) === 'night', await phase());
    await page.waitForTimeout(4000);
    const nightState = await page.evaluate(() => {
      const s = window.__PRISMWAKE__.state;
      return { spawned: s.nightSpawned, alive: s.shades.length, burned: s.nightBurned, score: s.score };
    });
    check('night spawns and burns', nightState.spawned > 0, JSON.stringify(nightState));
    await page.keyboard.press('p');
    await page.waitForTimeout(200);
    check('pause works', (await phase()) === 'paused', await phase());
    await page.mouse.click(640, 432); // RESUME
    await page.waitForTimeout(200);
    check('resume works', (await phase()) === 'night', await phase());

    // Headless full run to a win on DUSK (proves the win path end to end).
    const run = await page.evaluate(() => {
      const w = window.__PRISMWAKE__;
      return w.botPlayRun('dusk', 2013);
    });
    check('bot wins a full run on DUSK', run.phase === 'win', JSON.stringify(run));
    const truth = await page.evaluate(() => window.__PRISMWAKE__.truth());
    check('truth check passes after win', truth.pass, JSON.stringify(truth.checks.filter((c) => !c.pass)));

    // Restart from the win screen via real click.
    await page.mouse.click(810, 552); // PLAY AGAIN
    await page.waitForTimeout(200);
    check('play again restarts', (await phase()) === 'build', await phase());

    check('zero console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  } finally {
    await browser.close();
    server.kill();
  }
  failed = CHECKS.some((c) => !c.ok);
  console.log(failed ? 'PLAYTEST: FAILED' : 'PLAYTEST: ' + CHECKS.length + '/' + CHECKS.length + ' PASS');
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error('PLAYTEST CRASH:', e.message); process.exit(1); });
