// botcheck.cjs — quick balance probe: bot full runs on each difficulty,
// plus the cover condition (night 4, 10+ shades, GLEAM >= 2).
const { chromium } = require('/home/hatch/workspace/mm-wallet/node_modules/playwright-core');
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CHROME = '/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';

async function main() {
  const port = process.argv[2] || '8093';
  const server = spawn('node', [path.join(ROOT, 'tools/serve.cjs'), port], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1200));
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    await page.goto(`http://localhost:${port}/game/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__PRISMWAKE_READY__, null, { timeout: 30000 });
    for (const diff of ['dusk', 'ember', 'dawn']) {
      const rep = await page.evaluate((d) => {
        const w = window.__PRISMWAKE__;
        return w.botPlayRun(d, 2013);
      }, diff);
      console.log(diff, JSON.stringify(rep));
    }
    // Cover condition probe on ember.
    const cover = await page.evaluate(() => {
      const w = window.__PRISMWAKE__;
      const { createState } = w; // not exported; use stageShot instead
      return w.stageShot('cover', 2013).note;
    });
    console.log('cover:', cover);
    console.log('pageerrors:', errors.length, errors.slice(0, 3));
  } finally {
    await browser.close();
    server.kill();
  }
}
main().catch((e) => { console.error('BOTCHECK CRASH:', e.message); process.exit(1); });
