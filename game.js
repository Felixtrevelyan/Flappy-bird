(() => {
  const now = new Date();
  const TIMEFRAMES = ["15m", "1H", "4H", "1D", "1W"];

  function sampleRows(direction) {
    const up = direction === "bullish";
    return [
      { date: "2026-02-28", direction: up ? "Long" : "Short", entry: "--", exit: "--", outcome: "Success", ret: up ? "+0.61%" : "+0.55%", move: up ? 0.61 : 0.55 },
      { date: "2026-02-14", direction: up ? "Long" : "Short", entry: "--", exit: "--", outcome: "Failure", ret: up ? "-0.32%" : "-0.28%", move: up ? -0.32 : -0.28 },
      { date: "2026-01-29", direction: up ? "Long" : "Short", entry: "--", exit: "--", outcome: "Success", ret: up ? "+0.55%" : "+0.48%", move: up ? 0.55 : 0.48 }
    ];
  }

  function block(total, success, failure, move, direction) {
    return {
      total,
      success,
      failure,
      avgMove: move,
      rows: sampleRows(direction)
    };
  }

  const FALLBACK = {
    XAUUSD: {
      label: "XAUUSD",
      window: "2007-01-01 to Present",
      patterns: {
        bullish_engulfing: {
          "1D": block(226, 82.3, 17.7, 0.01, "bullish"),
          "3D": block(225, 68.9, 31.1, 0.08, "bullish"),
          "5D": block(224, 61.2, 38.8, 0.17, "bullish")
        },
        bearish_engulfing: {
          "1D": block(194, 79.9, 20.1, 0.02, "bearish"),
          "3D": block(193, 66.8, 33.2, 0.07, "bearish"),
          "5D": block(191, 60.7, 39.3, 0.14, "bearish")
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
  const candleSvg = document.getElementById("candle-svg");

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

  function seeded(seed) {
    let t = seed % 2147483647;
    if (t <= 0) t += 2147483646;
    return () => {
      t = (t * 16807) % 2147483647;
      return (t - 1) / 2147483646;
    };
  }

  function renderCandles(seedStats) {
    const width = 940;
    const height = 230;
    const pad = 22;
    const floor = height - pad;
    const top = pad;
    const bars = 24;
    const gap = (width - pad * 2) / bars;
    const bodyW = gap * 0.48;

    const random = seeded(Number(seedStats.total || 0) + Math.round(Number(seedStats.success || 0) * 10));
    let price = 46;

    const parts = [];
    for (let i = 0; i < 5; i += 1) {
      const y = top + ((floor - top) / 4) * i;
      parts.push(`<line x1="${pad}" y1="${y.toFixed(1)}" x2="${width - pad}" y2="${y.toFixed(1)}" stroke="rgba(142,164,204,0.18)" stroke-width="1"/>`);
    }

    for (let i = 0; i < bars; i += 1) {
      const drift = (random() - 0.48) * 5;
      const open = price;
      const close = open + drift;
      const wickUp = Math.max(open, close) + random() * 2.8;
      const wickDown = Math.min(open, close) - random() * 2.8;
      price = close;

      const scale = 2.45;
      const x = pad + i * gap + (gap - bodyW) / 2;
      const yo = floor - open * scale;
      const yc = floor - close * scale;
      const ywHi = floor - wickUp * scale;
      const ywLo = floor - wickDown * scale;
      const up = close >= open;

      const stroke = up ? "#43d9b7" : "#d76f8f";
      const fill = up ? "rgba(67,217,183,0.6)" : "rgba(215,111,143,0.63)";
      const y = Math.min(yo, yc);
      const h = Math.max(2, Math.abs(yo - yc));

      parts.push(`<line x1="${(x + bodyW / 2).toFixed(1)}" y1="${ywHi.toFixed(1)}" x2="${(x + bodyW / 2).toFixed(1)}" y2="${ywLo.toFixed(1)}" stroke="${stroke}" stroke-width="1.3"/>`);
      parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bodyW.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="1" rx="1"/>`);
    }

    candleSvg.innerHTML = parts.join("");
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

    chartCaption.textContent = `Filtered output for ${market} ${titleize(pattern)} · ${timeframe} · ${duration}`;
    renderRows(filtered);
    renderCandles({ total, success: successRate });
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
