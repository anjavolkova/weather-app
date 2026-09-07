// Barometer-style dial rendering the day's fog severity (1-5) as a gauge.
const FOG_COLORS = {
  1: "#6FA87E",
  2: "#9AAE72",
  3: "#C69A4E",
  4: "#C4824D",
  5: "#B1503F",
};

const SVG_NS = "http://www.w3.org/2000/svg";

function polarPoint(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// angle sweeps clockwise from 180deg (left) through 270deg (top) to 360deg (right)
function angleForValue(value) {
  const clamped = Math.max(1, Math.min(5, value));
  return 180 + ((clamped - 1) / 4) * 180;
}

function el(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function renderBarometer(svg, fogValue) {
  const cx = 120;
  const cy = 140;
  const r = 96;
  const bandWidth = 20;

  svg.innerHTML = "";

  for (let v = 1; v <= 5; v++) {
    const start = 180 + (v - 1) * 36;
    const end = 180 + v * 36;
    const p1 = polarPoint(cx, cy, r, start);
    const p2 = polarPoint(cx, cy, r, end);
    const path = el("path", {
      d: `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`,
      fill: "none",
      stroke: FOG_COLORS[v],
      "stroke-width": bandWidth,
      opacity: fogValue == null ? 0.35 : v === Math.round(fogValue) ? 1 : 0.45,
    });
    svg.appendChild(path);
  }

  const labelStyle = 'font-family: Georgia, serif; font-size: 9px; fill: #8a93a3; text-transform: uppercase; letter-spacing: 0.05em;';
  const clearLabel = el("text", { x: cx - r - 6, y: cy + 16, style: labelStyle, "text-anchor": "middle" });
  clearLabel.textContent = "Clear";
  svg.appendChild(clearLabel);
  const severeLabel = el("text", { x: cx + r + 8, y: cy + 16, style: labelStyle, "text-anchor": "middle" });
  severeLabel.textContent = "Severe";
  svg.appendChild(severeLabel);

  if (typeof fogValue === "number") {
    const needleAngle = angleForValue(fogValue);
    const tip = polarPoint(cx, cy, r - bandWidth / 2 - 6, needleAngle);
    svg.appendChild(
      el("line", {
        x1: cx,
        y1: cy,
        x2: tip.x,
        y2: tip.y,
        stroke: "#e9e4d8",
        "stroke-width": 2.5,
        "stroke-linecap": "round",
      })
    );
  }

  svg.appendChild(el("circle", { cx, cy, r: 7, fill: "#e9e4d8" }));
  svg.appendChild(el("circle", { cx, cy, r: 3, fill: "#10151c" }));

  const valueText = el("text", {
    x: cx,
    y: cy - 22,
    "text-anchor": "middle",
    style: "font-family: Georgia, serif; font-style: italic; font-size: 22px; fill: #c69a4e;",
  });
  valueText.textContent = typeof fogValue === "number" ? fogValue : "–";
  svg.appendChild(valueText);
}
