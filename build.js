// Pemakaian: node build.js ../index-v4.html
// Memecah template Apps Script (Index.html) menjadi: index.html (kerangka) + site-template.js (isi halaman)
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || '../index-v4.html', 'utf8').replace(/\r/g, '');
const bi = src.indexOf('<body');
const bTag = src.slice(bi, src.indexOf('>', bi) + 1);
const head = src.slice(0, bi);
const inner = src.slice(src.indexOf('>', bi) + 1, src.lastIndexOf('</body>'));
if (/<\?/.test(head)) throw new Error('Ada scriptlet <? ?> di <head>; pindahkan ke body.');
fs.writeFileSync('site-template.js', 'window.__TPL = ' + JSON.stringify(inner) + ';\n');
const out = head + bTag + '\n<div id="boot" style="min-height:100vh;display:flex;align-items:center;justify-content:center;font:14px monospace;color:#888">Loading…</div>\n' +
  '<script src="config.js"></script>\n<script src="site-template.js"></script>\n<script src="app.js"></script>\n</body>\n</html>\n';
fs.writeFileSync('index.html', out);
console.log('OK: index.html + site-template.js');
