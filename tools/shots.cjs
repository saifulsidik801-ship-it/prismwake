// shots.cjs — staged screenshots: title, cover, draft, win.
// Loads each ?shot= frame in headless Chromium, waits for the staged
// render, measures luminance on the live canvas (cover mean >= 0.45, no
// 64x64 block < 0.15), truth-checks the HUD numbers from the replay, and
// writes the JPEGs to screenshots/ plus the record to shots.json.
// Usage: node tools/shots.cjs [port]
const { chromium } = require('/home/hatch/workspace/mm-wallet/node_modules/playwright-core');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = [
  { file: '1-cover.jpg', shot: 'cover' },
  { file: '2-title.jpg', shot: 'title' },
  { file: '3-draft.jpg', shot: 'draft' },
  { file: '4-win.jpg', shot: 'win' },
];
const CHROME = '/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';

async function main() {
  const port = process.argv[2] || '8091';
  const server = spawn('node', [path.join(ROOT, 'tools/serve.cjs'), port], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1200));
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const record = { seed: 2013, shots: {} };
  let failed = false;
  try {
    for (const s of SHOTS) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(String(e.message || e)));
      await page.goto(`http://localhost:${port}/game/index.html?shot=${s.shot}&seed=2013`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => window.__PRISMWAKE_READY__, null, { timeout: 120000 });
      await page.waitForTimeout(400);
      const info = await page.evaluate(() => {
        const canvas = document.getElementById('game');
        const off = document.createElement('canvas');
        off.width = 320; off.height = 200;
        const octx = off.getContext('2d');
        octx.drawImage(canvas, 0, 0, 320, 200);
        const data = octx.getImageData(0, 0, 320, 200).data;
        let sum = 0; let n = 0;
        const block = 16; // 16px blocks on the 320x200 downscale ~ 64px on full
        let minBlock = 1;
        for (let by = 0; by < 200; by += block) {
          for (let bx = 0; bx < 320; bx += block) {
            let bs = 0; let bn = 0;
            for (let y = by; y < Math.min(by + block, 200); y++) {
              for (let x = bx; x < Math.min(bx + block, 320); x++) {
                const i = (y * 320 + x) * 4;
                bs += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                bn++;
              }
            }
            minBlock = Math.min(minBlock, bs / bn / 255);
          }
        }
        for (let i = 0; i < data.length; i += 4) {
          sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          n++;
        }
        const w = window.__PRISMWAKE__;
        return {
          meanLuminance: sum / n / 255,
          minBlockLuminance: minBlock,
          note: w.note,
          truth: w.truth(),
          errors: window.__PRISMWAKE_ERRORS__,
        };
      });
      const outPath = path.join(ROOT, 'screenshots', s.file);
      await page.screenshot({ path: outPath, type: 'jpeg', quality: 95 });
      const bytes = fs.statSync(outPath).size;
      record.shots[s.shot] = {
        file: s.file, bytes, meanLuminance: +info.meanLuminance.toFixed(3),
        minBlockLuminance: +info.minBlockLuminance.toFixed(3),
        note: info.note, truthPass: info.truth.pass,
        truthChecks: info.truth.checks, consoleErrors: errors.concat(info.errors),
      };
      console.log(s.shot, '->', s.file, bytes + 'B', 'lum', info.meanLuminance.toFixed(3), 'minBlock', info.minBlockLuminance.toFixed(3), 'truth', info.truth.pass ? 'PASS' : 'FAIL', 'errors', errors.length);
      if (!info.truth.pass) { console.log('  TRUTH FAIL:', JSON.stringify(info.truth.checks)); failed = true; }
      if (info.meanLuminance < 0.45 && s.shot === 'cover') { console.log('  COVER LUMINANCE GATE FAIL'); failed = true; }
      if (bytes > 262144) { console.log('  SIZE GATE FAIL (>256KiB)'); failed = true; }
      if (errors.length) { console.log('  CONSOLE ERRORS:', errors.slice(0, 5)); failed = true; }
      await page.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }
  fs.writeFileSync(path.join(ROOT, 'shots.json'), JSON.stringify(record, null, 2));
  console.log(failed ? 'SHOTS: FAILED (see above)' : 'SHOTS: ALL PASS');
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error('SHOTS CRASH:', e.message); process.exit(1); });
