/* Генератор иконок PWA (v1.9): рисует SVG — градиентный скруглённый
   квадрат и белую деталь пазла — и сохраняет PNG 192/512/maskable.
   Служебный скрипт вне игры, CommonJS — линт тут отключён. */
/* eslint-disable @typescript-eslint/no-require-imports */
const sharp = require('sharp');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public');

/* Деталь пазла: тело + четыре ушка-кружка, всё белым силуэтом */
function pieceSvg(size, contentScale) {
  const s = size;
  const k = contentScale; // для maskable содержимое внутри безопасной зоны
  const cx = s / 2;
  const body = s * 0.42 * k;
  const knob = body * 0.34;
  const half = body / 2;
  const rx = s * 0.19;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8ce99a"/>
      <stop offset="0.55" stop-color="#38d9a9"/>
      <stop offset="1" stop-color="#12b886"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${s}" height="${s}" rx="${rx}" fill="url(#bg)"/>
  <g fill="#ffffff">
    <rect x="${cx - half}" y="${cx - half}" width="${body}" height="${body}" rx="${body * 0.18}"/>
    <circle cx="${cx}" cy="${cx - half}" r="${knob}"/>
    <circle cx="${cx + half}" cy="${cx}" r="${knob}"/>
    <circle cx="${cx}" cy="${cx + half}" r="${knob}"/>
    <circle cx="${cx - half}" cy="${cx}" r="${knob}"/>
  </g>
  <circle cx="${cx + half + knob * 1.6}" cy="${cx - half - knob * 1.4}" r="${s * 0.03 * k}" fill="#ffd43b"/>
  <circle cx="${cx - half - knob * 1.9}" cy="${cx + half + knob * 1.1}" r="${s * 0.022 * k}" fill="#ffdeeb"/>
</svg>`;
}

async function make(name, size, contentScale) {
  await sharp(Buffer.from(pieceSvg(size, contentScale)))
    .resize(size, size)
    .png()
    .toFile(path.join(OUT, name));
  console.log('ok:', name);
}

(async () => {
  await make('icon-192.png', 192, 0.92);
  await make('icon-512.png', 512, 0.92);
  await make('icon-maskable-512.png', 512, 0.74);
})();
