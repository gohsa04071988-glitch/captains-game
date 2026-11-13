/* План перетаскивания: найти верхнюю неперекрытую деталь,
   точку захвата и её целевую клетку. Возвращает JSON. */
(() => {
  const area = document.querySelector('.pz-tray').parentElement;
  const rect = area.getBoundingClientRect();
  const A = { left: rect.left, top: rect.top };
  const els = [...document.querySelectorAll('.pz-piece')];
  const pw = 400 / 3, ph = 200, mg = 42.7;
  const bodies = els.map((el) => ({
    x: parseFloat(el.style.left) + mg,
    y: parseFloat(el.style.top) + mg,
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
  if (pick < 0) pick = bodies.findIndex(b => b.z === Math.max(...bodies.map(q => q.z)));
  const b = bodies[pick];
  const col = pick % 3, row = Math.floor(pick / 3);
  return JSON.stringify({
    pick,
    grab: { x: Math.round(A.left + b.x + b.w / 2), y: Math.round(A.top + b.y + b.h / 2) },
    drop: { x: Math.round(A.left + col * pw + pw / 2), y: Math.round(A.top + row * ph + ph / 2) },
  });
})()
