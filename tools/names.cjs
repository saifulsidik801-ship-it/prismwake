// names.cjs — the originality scan: fail if any banned word (commercial
// game names, characters, franchises, or rival entry titles) appears in
// game/, README.md or main.ts. The list lives in game/src/names.js.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const namesSrc = fs.readFileSync(path.join(ROOT, 'game/src/names.js'), 'utf8');
const block = namesSrc.slice(namesSrc.indexOf('BANNED_WORDS = ['), namesSrc.indexOf('];', namesSrc.indexOf('BANNED_WORDS = [')));
const banned = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((w) => /^[a-z0-9][a-z0-9 \-]+$/.test(w) && w.length > 2);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|html|css|md|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(path.join(ROOT, 'game'), []).filter((f) => !f.endsWith('names.js')).concat([
  path.join(ROOT, 'README.md'), path.join(ROOT, 'main.ts'),
]);
let failed = false;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8').toLowerCase();
  for (const w of banned) {
    if (text.includes(w)) {
      console.log('FAIL  ' + path.relative(ROOT, file) + ' contains banned word: ' + w);
      failed = true;
    }
  }
}
console.log(failed ? 'NAMES: FAILED' : 'NAMES: PASS (' + banned.length + ' words scanned over ' + files.length + ' files)');
process.exit(failed ? 1 : 0);
