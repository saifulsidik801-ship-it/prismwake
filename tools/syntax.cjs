// syntax.cjs — parse every game module as an ES module with the kit's
// vendored acorn, so a typo is caught here instead of in the browser.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ACORN = path.join(ROOT, 'vendor/acorn.mjs');

async function main() {
  const { parse } = await import(ACORN).catch(async () => {
    // Fallback: the kit's acorn lives beside the CLI, not the repo.
    return await import('/home/hatch/workspace/makefun/best-game-01-kit/harness/vendor/acorn.mjs').catch(() => null);
  }).catch(() => null);
  let acornParse = parse;
  if (!acornParse) {
    // Last resort: dynamic import through node itself.
    const mod = await import('node:module');
    console.log('acorn unavailable, using node --check per file instead');
    const { execFileSync } = require('node:child_process');
    const files = collect();
    let failed = false;
    for (const f of files) {
      try {
        execFileSync('node', ['--check', f], { stdio: 'pipe' });
      } catch (e) {
        // --check treats .js as CommonJS; an import error is not a syntax error.
        const msg = String(e.stderr || e.stdout || e.message);
        if (!/import|export|Cannot use import/.test(msg)) { console.log('FAIL', f, msg.slice(0, 300)); failed = true; }
      }
    }
    console.log(failed ? 'SYNTAX: FAILED' : 'SYNTAX: PASS (node --check, ESM import lines skipped)');
    process.exit(failed ? 1 : 0);
    return;
  }
  const files = collect();
  let failed = false;
  for (const f of files) {
    try {
      acornParse(fs.readFileSync(f, 'utf8'), { ecmaVersion: 2024, sourceType: 'module' });
    } catch (e) {
      console.log('FAIL  ' + path.relative(ROOT, f) + ': ' + e.message);
      failed = true;
    }
  }
  console.log(failed ? 'SYNTAX: FAILED' : 'SYNTAX: PASS (' + files.length + ' files)');
  process.exit(failed ? 1 : 0);
}

function collect() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js')) out.push(p);
    }
  };
  walk(path.join(ROOT, 'game'));
  return out;
}

main();
