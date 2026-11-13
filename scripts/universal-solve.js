/* Универсальный сборщик пазла: синтетические pointer-события
   для ЛЮБОЙ сложности (6/12/24/48). Деталь i идёт в клетку
   (floor(i/cols), i%cols), цель = (col*pw - margin, row*ph - margin).
   Делает до 3 проходов: если grabbed не та деталь (перекрытие
   в подносе), цель просто не прилипла — повторяем. */
(() => {
  const tray = document.querySelector('.pz-tray');
  if (!tray) return JSON.stringify({ error: 'no tray' });
  const area = tray.parentElement;
  const rect = area.getBoundingClientRect();
  const els = [...document.querySelectorAll('.pz-piece')];
  const total = els.length;
  const cols = { 6: 3, 12: 4, 24: 6, 48: 8 }[total];
  const rows = { 6: 2, 12: 3, 24: 4, 48: 6 }[total];
  if (!cols) return JSON.stringify({ error: 'unknown difficulty', total });
  const boardPx = parseFloat(area.style.width);
  const pw = boardPx / cols, ph = boardPx / rows;
  const fw = parseFloat(els[0].style.width), fh = parseFloat(els[0].style.height);
  const mgX = (fw - pw) / 2, mgY = (fh - ph) / 2;

  const ev = (type, lx, ly, id) => area.dispatchEvent(new PointerEvent(type, {
    clientX: rect.left + lx, clientY: rect.top + ly,
    pointerId: id, bubbles: true, cancelable: true, isPrimary: true,
  }));

  for (let round = 0; round < 3; round++) {
    els.forEach((p, i) => {
      if (p.classList.contains('pz-snapped')) return;
      const id = 100 + i + round * 50;
      const x0 = parseFloat(p.style.left), y0 = parseFloat(p.style.top);
      const col = i % cols, row = Math.floor(i / cols);
      const tx = col * pw - mgX, ty = row * ph - mgY;
      const gx = fw / 2, gy = fh / 2;
      ev('pointerdown', x0 + gx, y0 + gy, id);
      for (let st = 1; st <= 5; st++) {
        ev('pointermove', x0 + gx + ((tx + gx) - (x0 + gx)) * st / 5,
           y0 + gy + ((ty + gy) - (y0 + gy)) * st / 5, id);
      }
      ev('pointerup', tx + gx, ty + gy, id);
    });
  }
  return JSON.stringify({
    total,
    snapped: els.filter((p) => p.classList.contains('pz-snapped')).length,
    counter: document.body.textContent.match(/Собрано \d+ \/ \d+/)?.[0] ?? null,
  });
})()
