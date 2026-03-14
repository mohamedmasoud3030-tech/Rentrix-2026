const fs = require('fs');
const glob = require('glob');
const { execSync } = require('child_process');

const mojibakeRe = /[ÃØÙÂâ]/;
const arabicRe = /[\u0600-\u06FF]/;
const cp1252Extra =
  '\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D' +
  '\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178';
const chunkRe = new RegExp(
  `[\\u0080-\\u00FF${cp1252Extra}][\\u0080-\\u00FF${cp1252Extra}\\s0-9.,:;!?()\\-–—/\\\\'\"%+#=…]*`,
  'gu',
);

const cp1252Map = new Map([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

const decodeCp1252 = (s) => {
  const bytes = [];
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }
    const mapped = cp1252Map.get(code);
    if (mapped === undefined) return s;
    bytes.push(mapped);
  }
  return Buffer.from(bytes).toString('utf8');
};

const readWithBom = (filePath) => {
  const buf = fs.readFileSync(filePath);
  const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  const text = buf.toString('utf8', hasBom ? 3 : 0);
  return { text, hasBom };
};

const writeWithBom = (filePath, text, hasBom) => {
  if (!hasBom) {
    fs.writeFileSync(filePath, text, 'utf8');
    return;
  }
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  const body = Buffer.from(text, 'utf8');
  fs.writeFileSync(filePath, Buffer.concat([bom, body]));
};

const normalizeAscii = (line) => line.replace(/[^\x00-\x7F]/g, '#');

const fixMojibakeInText = (text) => {
  let changed = false;
  const next = text.replace(chunkRe, (chunk) => {
    if (!mojibakeRe.test(chunk)) return chunk;
    const fixed = decodeCp1252(chunk);
    if (fixed === chunk) return chunk;
    if (!arabicRe.test(fixed) && !/[—–…]/.test(fixed)) return chunk;
    changed = true;
    return fixed;
  });
  return { text: next, changed };
};

const mergeUsingHead = (currentText, headFixedText) => {
  const currentLines = currentText.split('\n');
  const headLines = headFixedText.split('\n');
  if (currentLines.length !== headLines.length) {
    return { text: currentText, changed: false };
  }
  let changed = false;
  const merged = currentLines.map((line, idx) => {
    if (normalizeAscii(line) === normalizeAscii(headLines[idx])) {
      if (line !== headLines[idx]) {
        changed = true;
        return headLines[idx];
      }
    }
    return line;
  });
  return { text: merged.join('\n'), changed };
};

const files = [
  ...glob.sync('src/**/*.{ts,tsx,js}'),
  ...glob.sync('vite.config.ts'),
];

let count = 0;
for (const f of files) {
  const { text, hasBom } = readWithBom(f);
  let next = text;
  let changed = false;
  const needsRepair = next.includes('\uFFFD') || mojibakeRe.test(next);
  if (needsRepair) {
    try {
      const gitPath = f.replace(/\\/g, '/');
      const headText = execSync(`git show HEAD:${gitPath}`, { encoding: 'utf8' });
      const headFixed = fixMojibakeInText(headText).text;
      if (next.includes('\uFFFD')) {
        next = headFixed;
        changed = changed || next !== text;
      } else {
        const merged = mergeUsingHead(next, headFixed);
        next = merged.text;
        changed = changed || merged.changed;
      }
    } catch {
      // ignore missing HEAD
    }
  }
  const fixed = fixMojibakeInText(next);
  next = fixed.text;
  changed = changed || fixed.changed;
  if (changed) {
    writeWithBom(f, next, hasBom);
    count++;
  }
}
console.log('fixed', count, 'files');
