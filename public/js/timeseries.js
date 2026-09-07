// Reusable small-multiple time-series line chart (SVG), used for the three
// Patterns panels (pressure / Kp-index / symptoms). One axis per chart —
// panels are stacked and share the same x-axis (date) rather than forcing
// unrelated units onto one y-scale.
//
// Wrapped in an IIFE (rather than plain top-level `const`s) since this file
// is loaded as a classic <script>, sharing global scope with dial.js/calendar.js.
(function () {
const SVG_NS = "http://www.w3.org/2000/svg";

const SURFACE = "#171e28";
const GRID_COLOR = "#2a3441";
const TEXT_MUTED = "#8a93a3";
const TEXT_PRIMARY = "#e9e4d8";

const VB_WIDTH = 880;
const PAD_LEFT = 36;
const PAD_RIGHT = 86;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;

function el(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function fmt(v, decimals) {
  return typeof v === "number" ? v.toFixed(decimals) : "—";
}

function getTooltip() {
  let tip = document.getElementById("chart-tooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "chart-tooltip";
    tip.className = "chart-tooltip";
    tip.hidden = true;
    document.body.appendChild(tip);
  }
  return tip;
}

function buildLegend(container, lines) {
  if (!container) return;
  container.innerHTML = "";
  if (lines.length < 2) return;
  for (const line of lines) {
    const item = document.createElement("span");
    item.className = "legend-item";
    const key = document.createElement("i");
    key.className = "legend-key";
    key.style.background = line.color;
    item.appendChild(key);
    item.appendChild(document.createTextNode(line.label));
    container.appendChild(item);
  }
}

/**
 * @param {SVGSVGElement} svg
 * @param {object} options
 * @param {Array<object>} options.series - [{date, [key]: number|null, ...}]
 * @param {Array<{key: string, label: string, color: string}>} options.lines
 * @param {[number, number]} options.yDomain
 * @param {number[]} options.yTicks
 * @param {number} [options.decimals=1]
 * @param {string} [options.unit=""]
 * @param {{value: number, label: string, color: string}} [options.threshold]
 * @param {HTMLElement} [options.legendEl]
 * @param {number} [options.height=190]
 */
function renderTimeSeriesChart(svg, options) {
  const { series, lines, yDomain, yTicks, decimals = 1, unit = "", threshold, legendEl, height = 190 } = options;

  buildLegend(legendEl, lines);
  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${VB_WIDTH} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const plotW = VB_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const [yMin, yMax] = yDomain;

  const n = series.length;
  const xFor = (i) => PAD_LEFT + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yFor = (v) => PAD_TOP + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  if (n === 0) {
    const msg = el("text", {
      x: PAD_LEFT,
      y: PAD_TOP + plotH / 2,
      fill: TEXT_MUTED,
      style: "font-size: 12px;",
    });
    msg.textContent = "No data logged yet";
    svg.appendChild(msg);
    return;
  }

  // gridlines + y-axis labels
  for (const tick of yTicks) {
    const y = yFor(tick);
    svg.appendChild(
      el("line", { x1: PAD_LEFT, y1: y, x2: PAD_LEFT + plotW, y2: y, stroke: GRID_COLOR, "stroke-width": 1 })
    );
    const label = el("text", {
      x: PAD_LEFT - 8,
      y: y + 3,
      "text-anchor": "end",
      fill: TEXT_MUTED,
      style: "font-size: 10px;",
    });
    label.textContent = tick;
    svg.appendChild(label);
  }

  // threshold reference line
  if (threshold) {
    const y = yFor(threshold.value);
    svg.appendChild(
      el("line", {
        x1: PAD_LEFT,
        y1: y,
        x2: PAD_LEFT + plotW,
        y2: y,
        stroke: threshold.color,
        "stroke-width": 1.5,
        opacity: 0.8,
      })
    );
    const label = el("text", {
      x: PAD_LEFT + plotW,
      y: y - 5,
      "text-anchor": "end",
      fill: threshold.color,
      style: "font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em;",
    });
    label.textContent = threshold.label;
    svg.appendChild(label);
  }

  // x-axis date labels
  const labelEvery = Math.max(1, Math.ceil(n / 7));
  series.forEach((point, i) => {
    if (i % labelEvery !== 0 && i !== n - 1) return;
    const label = el("text", {
      x: xFor(i),
      y: height - 6,
      "text-anchor": "middle",
      fill: TEXT_MUTED,
      style: "font-size: 10px;",
    });
    label.textContent = point.date.slice(5);
    svg.appendChild(label);
  });

  // lines + end markers
  const endPoints = [];
  for (const line of lines) {
    let d = "";
    let drawing = false;
    let lastPoint = null;
    series.forEach((point, i) => {
      const v = point[line.key];
      if (typeof v !== "number") {
        drawing = false;
        return;
      }
      const x = xFor(i);
      const y = yFor(v);
      d += drawing ? ` L ${x} ${y}` : ` M ${x} ${y}`;
      drawing = true;
      lastPoint = { x, y, v };
    });
    if (d) {
      svg.appendChild(
        el("path", {
          d: d.trim(),
          fill: "none",
          stroke: line.color,
          "stroke-width": 2,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        })
      );
    }
    if (lastPoint) {
      svg.appendChild(el("circle", { cx: lastPoint.x, cy: lastPoint.y, r: 6.5, fill: SURFACE }));
      svg.appendChild(el("circle", { cx: lastPoint.x, cy: lastPoint.y, r: 4.5, fill: line.color }));
      endPoints.push({ line, x: lastPoint.x, y: lastPoint.y, labelY: lastPoint.y, v: lastPoint.v });
    }
  }

  // Direct end-labels never stack when values collide (e.g. two series both end at "3"):
  // space them apart vertically and connect each to its true value with a thin leader.
  const MIN_LABEL_GAP = 13;
  endPoints.sort((a, b) => a.y - b.y);
  for (let i = 1; i < endPoints.length; i++) {
    const minY = endPoints[i - 1].labelY + MIN_LABEL_GAP;
    if (endPoints[i].labelY < minY) endPoints[i].labelY = minY;
  }
  for (const ep of endPoints) {
    if (Math.abs(ep.labelY - ep.y) > 1) {
      svg.appendChild(
        el("line", {
          x1: ep.x + 8,
          y1: ep.y,
          x2: ep.x + 8,
          y2: ep.labelY,
          stroke: ep.line.color,
          "stroke-width": 1,
          opacity: 0.5,
        })
      );
    }
    // A short line-key beside each label keeps identity readable when several
    // labels sit close together after dodging (text itself stays neutral ink).
    svg.appendChild(
      el("line", {
        x1: ep.x + 11,
        y1: ep.labelY,
        x2: ep.x + 17,
        y2: ep.labelY,
        stroke: ep.line.color,
        "stroke-width": 2,
        "stroke-linecap": "round",
      })
    );
    const endLabel = el("text", {
      x: ep.x + 21,
      y: ep.labelY + 3.5,
      fill: TEXT_PRIMARY,
      style: "font-size: 11px; font-variant-numeric: tabular-nums;",
    });
    endLabel.textContent = `${fmt(ep.v, decimals)}${unit}`;
    svg.appendChild(endLabel);
  }

  attachHover(svg, { series, lines, xFor, plotTop: PAD_TOP, plotHeight: plotH, plotLeft: PAD_LEFT, plotWidth: plotW, decimals, unit });
}

function attachHover(svg, { series, lines, xFor, plotTop, plotHeight, plotLeft, plotWidth, decimals, unit }) {
  const n = series.length;
  if (n === 0) return;

  const crosshair = el("line", {
    x1: 0,
    y1: plotTop,
    x2: 0,
    y2: plotTop + plotHeight,
    stroke: TEXT_MUTED,
    "stroke-width": 1,
    opacity: 0,
  });
  svg.appendChild(crosshair);

  const hitArea = el("rect", {
    x: plotLeft,
    y: plotTop,
    width: plotWidth,
    height: plotHeight,
    fill: "transparent",
    tabindex: 0,
    style: "cursor: crosshair; outline: none;",
  });
  svg.appendChild(hitArea);

  function nearestIndex(x) {
    if (n === 1) return 0;
    const ratio = (x - plotLeft) / plotWidth;
    return Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
  }

  function showAt(index, clientX, clientY) {
    const point = series[index];
    const x = xFor(index);
    crosshair.setAttribute("x1", x);
    crosshair.setAttribute("x2", x);
    crosshair.setAttribute("opacity", 1);

    const tip = getTooltip();
    tip.innerHTML = "";
    const dateEl = document.createElement("div");
    dateEl.className = "chart-tooltip-date";
    dateEl.textContent = point.date;
    tip.appendChild(dateEl);

    for (const line of lines) {
      const v = point[line.key];
      const row = document.createElement("div");
      row.className = "chart-tooltip-row";
      const key = document.createElement("i");
      key.className = "chart-tooltip-key";
      key.style.background = line.color;
      const label = document.createElement("span");
      label.className = "chart-tooltip-label";
      label.textContent = line.label;
      const value = document.createElement("span");
      value.className = "chart-tooltip-value";
      value.textContent = typeof v === "number" ? `${fmt(v, decimals)}${unit}` : "—";
      row.append(key, label, value);
      tip.appendChild(row);
    }

    tip.hidden = false;
    const offsetX = 16;
    const offsetY = 16;
    let left = clientX + offsetX;
    let top = clientY + offsetY;
    const rect = tip.getBoundingClientRect();
    if (left + rect.width > window.innerWidth - 8) left = clientX - rect.width - offsetX;
    if (top + rect.height > window.innerHeight - 8) top = clientY - rect.height - offsetY;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function hide() {
    crosshair.setAttribute("opacity", 0);
    getTooltip().hidden = true;
  }

  hitArea.addEventListener("pointermove", (e) => {
    const svgPoint = svg.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    const userPoint = svgPoint.matrixTransform(svg.getScreenCTM().inverse());
    showAt(nearestIndex(userPoint.x), e.clientX, e.clientY);
  });
  hitArea.addEventListener("pointerleave", hide);

  let focusedIndex = n - 1;
  hitArea.addEventListener("focus", () => {
    const rect = hitArea.getBoundingClientRect();
    showAt(focusedIndex, rect.left + rect.width / 2, rect.top);
  });
  hitArea.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      focusedIndex = Math.max(0, focusedIndex - 1);
    } else if (e.key === "ArrowRight") {
      focusedIndex = Math.min(n - 1, focusedIndex + 1);
    } else if (e.key === "Escape") {
      hide();
      return;
    } else {
      return;
    }
    e.preventDefault();
    const rect = hitArea.getBoundingClientRect();
    showAt(focusedIndex, rect.left + rect.width / 2, rect.top);
  });
  hitArea.addEventListener("blur", hide);
}

window.renderTimeSeriesChart = renderTimeSeriesChart;
})();
