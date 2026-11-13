/* E2E-скрипт: собирает пазл синтетическими pointer-событиями.
   Логика прилипания проходит через настоящие обработчики игры. */
(() => {
  const area = document.querySelector('.kid-board');
  if (!area) return 'no area';
  const rect = area.getBoundingClientRect();
  const pieces = [...area.querySelectorAll('.pz-piece')];
  const borderComp = 6; // рамка 3px с двух сторон
  const boardPx = area.clientWidth + borderComp;
  const cols = 4, rows = 3;
  const pieceW = boardPx / cols;
  const pieceH = boardPx / rows;
  const m = Math.min(pieceW, pieceH) * 0.32; // как в jigsaw-engine
  const gx = m + pieceW / 2;
  const gy = m + pieceH / 2;

  const results = [];
  pieces.forEach((p, i) => {
    if (p.classList.contains('pz-snapped')) return;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const tx = col * pieceW - m;
    const ty = row * pieceH - m;
    const x0 = parseFloat(p.style.left);
    const y0 = parseFloat(p.style.top);

    // Поднимаем нужную деталь наверх, остальные опускаем
    pieces.forEach((q) => { if (!q.classList.contains('pz-snapped')) q.style.zIndex = '5'; });
    p.style.zIndex = '9999';

    const ev = (type, lx, ly) => area.dispatchEvent(
      new PointerEvent(type, {
        clientX: rect.left + lx, clientY: rect.top + ly,
        pointerId: 42, bubbles: true, cancelable: true, isPrimary: true,
      }),
    );

    ev('pointerdown', x0 + gx, y0 + gy);
    for (let step = 1; step <= 6; step++) {
      const sx = x0 + gx + ((tx + gx) - (x0 + gx)) * (step / 6);
      const sy = y0 + gy + ((ty + gy) - (y0 + gy)) * (step / 6);
      ev('pointermove', sx, sy);
    }
    ev('pointerup', tx + gx, ty + gy);
    results.push({ i, snapped: p.classList.contains('pz-snapped') });
  });

  const snappedTotal = pieces.filter((p) => p.classList.contains('pz-snapped')).length;
  return JSON.stringify({ total: pieces.length, snappedTotal, failed: results.filter((r) => !r.snapped).map((r) => r.i) });
})()
