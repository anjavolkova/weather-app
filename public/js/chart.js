// Minimal dependency-free line chart for the 30-day fog/energy series.
function renderTrendChart(canvas, series) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 800;
  const cssHeight = 280;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const padding = { top: 16, right: 16, bottom: 28, left: 32 };
  const plotW = cssWidth - padding.left - padding.right;
  const plotH = cssHeight - padding.top - padding.bottom;

  ctx.strokeStyle = "#2a3441";
  ctx.lineWidth = 1;
  ctx.font = "10px sans-serif";
  ctx.fillStyle = "#8a93a3";
  for (let v = 1; v <= 5; v++) {
    const y = padding.top + plotH - ((v - 1) / 4) * plotH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + plotW, y);
    ctx.stroke();
    ctx.fillText(String(v), 6, y + 3);
  }

  if (!series || series.length === 0) {
    ctx.fillStyle = "#8a93a3";
    ctx.fillText("No data logged yet", padding.left, padding.top + plotH / 2);
    return;
  }

  const n = series.length;
  const xFor = (i) => padding.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yFor = (v) => padding.top + plotH - ((v - 1) / 4) * plotH;

  function drawLine(key, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    series.forEach((point, i) => {
      const v = point[key];
      if (typeof v !== "number") {
        started = false;
        return;
      }
      const x = xFor(i);
      const y = yFor(v);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    ctx.fillStyle = color;
    series.forEach((point, i) => {
      const v = point[key];
      if (typeof v !== "number") return;
      ctx.beginPath();
      ctx.arc(xFor(i), yFor(v), 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawLine("fog", "#B1503F");
  drawLine("energy", "#6FA87E");

  ctx.fillStyle = "#8a93a3";
  const labelEvery = Math.max(1, Math.ceil(n / 8));
  series.forEach((point, i) => {
    if (i % labelEvery !== 0) return;
    const label = point.date.slice(5);
    ctx.fillText(label, xFor(i) - 12, cssHeight - 8);
  });
}
