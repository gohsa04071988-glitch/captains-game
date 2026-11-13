/* План перетаскивания v1.3 (универсальный): найти неперекрытую верхнюю
   деталь в подносе, точку захвата и её целевую клетку на поле. */
(() => {
  const tray = document.querySelector('.pz-tray');
  const area = tray.parentElement;
  const A = area.getBoundingClientRect();
  const els = [...document.querySelectorAll('.pz-piece')];
  const boardPx = parseFloat(area.style.width);
  const cols = els.length === 6 ? 3 : els.length === 12 ? 4 : els.length === 24 ? 6 : 8;
  const rows = els.length === 6 ? 2 : els.length === 12 ? 3 : els.length === 24 ? 4 : 6;
  const pw = boardPx / cols, ph = boardPx / rows;
  const fullW = parseFloat(els[0].style.width);
  const fullH = parseFloat(els[0].style.height);
  const mgX = (fullW - pw) / 2, mgY = (fullH - ph) / 2;
  const bodies = els.map((el) => ({
    x: parseFloat(el.style.left) + mgX,
    y: parseFloat(el.style.top) + mgY,
    w: pw, h: ph, z: +el.style.zIndex,
  }));
  const overlaps = (b, o) =>
    !(b.x + b.w < o.x || o.x + o.w < b.x || b.y + b.h < o.y || o.y + o.h < b.y);
  let pick = -1;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const alone = !bodies.some((o, j) => j !== i && overlaps(b, o));
    if (alone) { pick = i; break; }
  }
  if (pick < 0) pick = bodies.findIndex((b) => b.z === Math.max(...bodies.map((q) => q.z)));
  const b = bodies[pick];
  const col = pick % cols, row = Math.floor(pick / cols);
  return JSON.stringify({
    pick, cols, rows, pw: Math.round(pw), ph: Math.round(ph),
    grab: { x: Math.round(A.left + b.x + b.w / 2), y: Math.round(A.top + b.y + b.h / 2) },
    drop: { x: Math.round(A.left + col * pw + pw / 2), y: Math.round(A.top + row * ph + ph / 2) },
  });
})()
