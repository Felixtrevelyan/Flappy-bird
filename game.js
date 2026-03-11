(() => {
  const now = new Date();
  const TIMEFRAMES = ["1D", "1W"];

  const FALLBACK = {
    XAUUSD: {
      label: "XAUUSD",
      window: "2007-01-01 to Present",
      patterns: {
        bullish_engulfing: {
          "1D": { total: 226, success: 82.3, failure: 17.7, avgMove: 0.01, rows: [] },
          "3D": { total: 225, success: 68.9, failure: 31.1, avgMove: 0.16, rows: [] },
          "5D": { total: 224, success: 61.2, failure: 38.8, avgMove: 0.36, rows: [] }
        },
        bearish_engulfing: {
          "1D": { total: 194, success: 79.9, failure: 20.1, avgMove: 0.16, rows: [] },
          "3D": { total: 193, success: 66.8, failure: 33.2, avgMove: 0.16, rows: [] },
          "5D": { total: 191, success: 60.7, failure: 39.3, avgMove: 0.18, rows: [] }
        }
      }
    }
  };

  const DATA =
    window.MODEL_DATA && typeof window.MODEL_DATA === "object" && Object.keys(window.MODEL_DATA).length
      ? window.MODEL_DATA
      : FALLBACK;

  const marketSelect = document.getElementById("market-select");
  const patternSelect = document.getElementById("pattern-select");
  const durationSelect = document.getElementById("duration-select");
  const timeframeSelect = document.getElementById("timeframe-select");
  const dateFromInput = document.getElementById("date-from");
  const dateToInput = document.getElementById("date-to");
  const refreshBtn = document.getElementById("refresh-btn");
  const feedStatus = document.getElementById("feed-status");
  const sideLinks = document.querySelectorAll(".side-link");

  const selectionTitle = document.getElementById("selection-title");
  const windowValue = document.getElementById("window-value");
  const syncValue = document.getElementById("sync-value");
  const metricTotal = document.getElementById("metric-total");
  const metricSuccess = document.getElementById("metric-success");
  const metricFailure = document.getElementById("metric-failure");
  const metricMove = document.getElementById("metric-move");
  const chartCaption = document.getElementById("chart-caption");
  const eventsBody = document.getElementById("events-body");
  const qqSvg = document.getElementById("qq-svg");
  const histSvg = document.getElementById("hist-svg");

  function titleize(value) {
    return value
      .split("_")
      .map((v) => v.charAt(0).toUpperCase() + v.slice(1))
      .join(" ");
  }

  function setOptions(select, values, formatter) {
    select.innerHTML = values
      .map((value) => `<option value="${value}">${formatter(value)}</option>`)
      .join("");
  }

  function formatMove(value) {
    const n = Number(value || 0);
    return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
  }

  function parseDate(value) {
    if (!value) return null;
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function inDateWindow(rowDate, fromValue, toValue) {
    if (!rowDate) return false;
    const d = parseDate(rowDate);
    if (!d) return false;
    const from = parseDate(fromValue);
    const to = parseDate(toValue);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  function renderRows(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    eventsBody.innerHTML = safeRows
      .map((row) => {
        const ok = row.outcome === "Success";
        const ret = row.ret || formatMove(Number(row.move || 0));
        return `
          <tr>
            <td>${row.date || "--"}</td>
            <td>${row.direction || "--"}</td>
            <td>${row.entry || "--"}</td>
            <td>${row.exit || "--"}</td>
            <td><span class="badge ${ok ? "success" : "failure"}">${row.outcome || "--"}</span></td>
            <td class="${Number(row.move || 0) >= 0 ? "value-up" : "value-down"}">${ret}</td>
          </tr>
        `;
      })
      .join("");
  }

  function mean(values) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  function stdDev(values) {
    if (values.length < 2) return 0;
    const m = mean(values);
    const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  // Acklam inverse normal CDF approximation
  function normInv(p) {
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
    const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
    const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
    const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
    const plow = 0.02425;
    const phigh = 1 - plow;

    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;

    let q;
    let r;
    if (p < plow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }

    if (p > phigh) {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }

    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  function renderEmptyPlot(svgEl, message) {
    svgEl.innerHTML = `
      <rect x="0" y="0" width="440" height="210" fill="rgba(5,13,25,0.0)" />
      <text x="220" y="110" fill="rgba(142,164,204,0.9)" font-size="13" text-anchor="middle">${message}</text>
    `;
  }

  function renderQQPlot(moves) {
    if (!moves || moves.length < 3) {
      renderEmptyPlot(qqSvg, "Not enough data for Q-Q plot");
      return;
    }

    const w = 440;
    const h = 210;
    const m = 30;
    const sorted = [...moves].sort((a, b) => a - b);
    const n = sorted.length;
    const mu = mean(sorted);
    const sd = stdDev(sorted) || 1;

    const theoretical = sorted.map((_, i) => mu + sd * normInv((i + 0.5) / n));
    const minVal = Math.min(...sorted, ...theoretical);
    const maxVal = Math.max(...sorted, ...theoretical);
    const span = maxVal - minVal || 1;

    const sx = (x) => m + ((x - minVal) / span) * (w - 2 * m);
    const sy = (y) => h - m - ((y - minVal) / span) * (h - 2 * m);

    const pts = sorted
      .map((y, i) => `<circle cx="${sx(theoretical[i]).toFixed(2)}" cy="${sy(y).toFixed(2)}" r="2.7" fill="#7bc3ff" />`)
      .join("");

    const ref = `<line x1="${sx(minVal)}" y1="${sy(minVal)}" x2="${sx(maxVal)}" y2="${sy(maxVal)}" stroke="rgba(67,217,183,0.7)" stroke-width="1.4" stroke-dasharray="4 4"/>`;

    qqSvg.innerHTML = `
      <rect x="0" y="0" width="${w}" height="${h}" fill="rgba(5,13,25,0.0)"/>
      <line x1="${m}" y1="${h - m}" x2="${w - m}" y2="${h - m}" stroke="rgba(142,164,204,0.35)"/>
      <line x1="${m}" y1="${m}" x2="${m}" y2="${h - m}" stroke="rgba(142,164,204,0.35)"/>
      ${ref}
      ${pts}
      <text x="${w / 2}" y="${h - 8}" fill="rgba(142,164,204,0.8)" font-size="10" text-anchor="middle">Theoretical Quantiles</text>
      <text x="12" y="${h / 2}" fill="rgba(142,164,204,0.8)" font-size="10" transform="rotate(-90 12 ${h / 2})" text-anchor="middle">Sample Quantiles</text>
    `;
  }

  function renderHistogram(moves) {
    if (!moves || moves.length < 2) {
      renderEmptyPlot(histSvg, "Not enough data for histogram");
      return;
    }

    const w = 440;
    const h = 210;
    const m = 30;
    const min = Math.min(...moves);
    const max = Math.max(...moves);
    const bins = Math.max(6, Math.min(16, Math.round(Math.sqrt(moves.length))));
    const width = max - min || 1;
    const step = width / bins;
    const counts = Array.from({ length: bins }, () => 0);

    for (const v of moves) {
      let idx = Math.floor((v - min) / step);
      if (idx >= bins) idx = bins - 1;
      if (idx < 0) idx = 0;
      counts[idx] += 1;
    }

    const maxCount = Math.max(...counts, 1);
    const bw = (w - 2 * m) / bins;

    const bars = counts
      .map((c, i) => {
        const barH = (c / maxCount) * (h - 2 * m);
        const x = m + i * bw + 1;
        const y = h - m - barH;
        return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(bw - 2).toFixed(2)}" height="${barH.toFixed(2)}" fill="rgba(7,92,147,0.72)" stroke="rgba(123,195,255,0.8)" stroke-width="0.8"/>`;
      })
      .join("");

    histSvg.innerHTML = `
      <rect x="0" y="0" width="${w}" height="${h}" fill="rgba(5,13,25,0.0)"/>
      <line x1="${m}" y1="${h - m}" x2="${w - m}" y2="${h - m}" stroke="rgba(142,164,204,0.35)"/>
      <line x1="${m}" y1="${m}" x2="${m}" y2="${h - m}" stroke="rgba(142,164,204,0.35)"/>
      ${bars}
      <text x="${w / 2}" y="${h - 8}" fill="rgba(142,164,204,0.8)" font-size="10" text-anchor="middle">Directional Move (%)</text>
      <text x="12" y="${h / 2}" fill="rgba(142,164,204,0.8)" font-size="10" transform="rotate(-90 12 ${h / 2})" text-anchor="middle">Frequency</text>
    `;
  }

  function getDateBounds(rows) {
    const dates = rows
      .map((r) => r.date)
      .filter(Boolean)
      .sort();
    if (!dates.length) return null;
    return { min: dates[0], max: dates[dates.length - 1] };
  }

  function applyView() {
    const market = marketSelect.value;
    const pattern = patternSelect.value;
    const duration = durationSelect.value;
    const timeframe = timeframeSelect.value;

    const marketData = DATA[market];
    const stats = marketData.patterns[pattern][duration];
    const rows = Array.isArray(stats.rows) ? stats.rows : [];

    const filtered = rows.filter((row) => inDateWindow(row.date, dateFromInput.value, dateToInput.value));

    const total = filtered.length;
    const successCount = filtered.filter((r) => r.outcome === "Success").length;
    const successRate = total ? (successCount / total) * 100 : 0;
    const failureRate = total ? 100 - successRate : 0;

    const moves = filtered
      .map((r) => Number(r.move))
      .filter((n) => Number.isFinite(n));
    const avgMove = moves.length ? moves.reduce((a, b) => a + b, 0) / moves.length : 0;

    const fromTxt = dateFromInput.value || rows[rows.length - 1]?.date || "--";
    const toTxt = dateToInput.value || rows[0]?.date || "--";

    selectionTitle.textContent = `${marketData.label || market} · ${titleize(pattern)} · ${timeframe} · ${duration}`;
    windowValue.textContent = `${fromTxt} to ${toTxt}`;
    syncValue.textContent = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;

    metricTotal.textContent = `${total}`;
    metricSuccess.textContent = `${successRate.toFixed(1)}%`;
    metricFailure.textContent = `${failureRate.toFixed(1)}%`;
    metricMove.textContent = formatMove(avgMove);

    chartCaption.textContent = `Distribution for ${market} ${titleize(pattern)} · ${duration} (${total} events)`;
    renderRows(filtered);
    renderQQPlot(moves);
    renderHistogram(moves);
  }

  function syncPatterns() {
    const market = marketSelect.value;
    const patterns = Object.keys(DATA[market].patterns);
    const current = patternSelect.value;
    setOptions(patternSelect, patterns, titleize);
    patternSelect.value = patterns.includes(current) ? current : patterns[0];
  }

  function syncDurations() {
    const market = marketSelect.value;
    const pattern = patternSelect.value;
    const durations = Object.keys(DATA[market].patterns[pattern]);
    const current = durationSelect.value;
    setOptions(durationSelect, durations, (h) => h.replace("D", " Day"));
    durationSelect.value = durations.includes(current) ? current : durations[0];
  }

  function syncDateBounds(resetValues = false) {
    const market = marketSelect.value;
    const pattern = patternSelect.value;
    const duration = durationSelect.value;
    const rows = DATA[market].patterns[pattern][duration].rows || [];
    const bounds = getDateBounds(rows);

    if (!bounds) {
      dateFromInput.min = "";
      dateFromInput.max = "";
      dateToInput.min = "";
      dateToInput.max = "";
      return;
    }

    dateFromInput.min = bounds.min;
    dateFromInput.max = bounds.max;
    dateToInput.min = bounds.min;
    dateToInput.max = bounds.max;

    if (resetValues || !dateFromInput.value || dateFromInput.value < bounds.min || dateFromInput.value > bounds.max) {
      dateFromInput.value = bounds.min;
    }
    if (resetValues || !dateToInput.value || dateToInput.value < bounds.min || dateToInput.value > bounds.max) {
      dateToInput.value = bounds.max;
    }

    if (dateFromInput.value > dateToInput.value) {
      dateToInput.value = dateFromInput.value;
    }
  }

  function init() {
    const markets = Object.keys(DATA);
    setOptions(marketSelect, markets, (s) => DATA[s].label || s);
    marketSelect.value = markets[0];

    setOptions(timeframeSelect, TIMEFRAMES, (tf) => tf);
    timeframeSelect.value = "1D";

    syncPatterns();
    syncDurations();
    syncDateBounds(true);
    applyView();

    feedStatus.textContent =
      window.MODEL_DATA && typeof window.MODEL_DATA === "object" && Object.keys(window.MODEL_DATA).length
        ? "Model feed: live file"
        : "Model feed: simulated";
  }

  marketSelect.addEventListener("change", () => {
    syncPatterns();
    syncDurations();
    syncDateBounds(true);
    applyView();
  });

  patternSelect.addEventListener("change", () => {
    syncDurations();
    syncDateBounds(true);
    applyView();
  });

  durationSelect.addEventListener("change", () => {
    syncDateBounds(true);
    applyView();
  });

  timeframeSelect.addEventListener("change", applyView);

  dateFromInput.addEventListener("change", () => {
    if (dateToInput.value && dateFromInput.value > dateToInput.value) {
      dateToInput.value = dateFromInput.value;
    }
    applyView();
  });

  dateToInput.addEventListener("change", () => {
    if (dateFromInput.value && dateToInput.value < dateFromInput.value) {
      dateFromInput.value = dateToInput.value;
    }
    applyView();
  });

  refreshBtn.addEventListener("click", () => {
    applyView();
    refreshBtn.animate(
      [
        { transform: "translateY(0)", opacity: 1 },
        { transform: "translateY(-2px)", opacity: 0.8 },
        { transform: "translateY(0)", opacity: 1 }
      ],
      { duration: 320, easing: "ease-out" }
    );
  });

  sideLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      sideLinks.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
    });
  });

  init();
})();
