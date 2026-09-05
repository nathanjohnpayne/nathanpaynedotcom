import { scanJs } from './scan-dev.mjs';
const spans = (s) => { const out = []; scanJs(s, (k, a, b) => out.push([k, s.slice(a, b)])); return out; };
const cover = (s) => { let at = 0, ok = true; scanJs(s, (k, a, b) => { if (a !== at) ok = false; at = b; }); return ok && at === s.length; };
const cases = [
  "const a = 'x'; // c",
  "const r = /a,b/.test(v);",
  "throw /a,b/.test(v) ? 'S' : s",
  "const t = `a${ 'b' }c`;",
  "const t = `a${ f(`d${e}f`) }c`;",
  "<dt>Nathan's topics</dt>\nclass={stateMarkerClass(s, 'p-status')}",
  "const u = 'https://x/y'; // gone",
  "stateMarkerClass(/[(]/.test(v) ? 'SHIPPED' : s, 'p-status')",
  "a / b / c",
  "`unterminated",
];
for (const c of cases) {
  console.log(cover(c) ? 'COVER ok ' : 'COVER BAD', JSON.stringify(c));
  console.log('   ', JSON.stringify(spans(c)));
}
