(() => {
  const now = new Date();

  function sampleRows(direction) {
    const up = direction === "bullish";
    return [
      { date: "2026-02-28", direction: up ? "Long" : "Short", entry: "2,041.20", exit: "2,053.60", outcome: "Success", ret: up ? "+0.61%" : "+0.55%" },
      { date: "2026-02-14", direction: up ? "Long" : "Short", entry: "2,018.90", exit: "2,012.40", outcome: "Failure", ret: up ? "-0.32%" : "-0.28%" },
      { date: "2026-01-29", direction: up ? "Long" : "Short", entry: "1,997.00", exit: "2,007.90", outcome: "Success", ret: up ? "+0.55%" : "+0.48%" },
      { date: "2026-01-11", direction: up ? "Long" : "Short", entry: "1,978.10", exit: "1,971.30", outcome: "Failure", ret: up ? "-0.34%" : "-0.31%" },
      { date: "2025-12-19", direction: up ? "Long" : "Short", entry: "1,955.40", exit: "1,968.70", outcome: "Success", ret: up ? "+0.68%" : "+0.64%" },
      { date: "2025-12-03", direction: up ? "Long" : "Short", entry: "1,942.80", exit: "1,936.00", outcome: "Failure", ret: up ? "-0.35%" : "-0.30%" }
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

  const securitySelect = document.getElementById("security-select");
  const patternSelect = document.getElementById("pattern-select");
  const horizonSelect = document.getElementById("horizon-select");
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

  function renderRows(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    eventsBody.innerHTML = safeRows
      .map((row) => {
        const ok = row.outcome === "Success";
        return `
          <tr>
            <td>${row.date || "--"}</td>
            <td>${row.direction || "--"}</td>
            <td>${row.entry || "--"}</td>
            <td>${row.exit || "--"}</td>
            <td><span class="badge ${ok ? "success" : "failure"}">${row.outcome || "--"}</span></td>
            <td class="${ok ? "value-up" : "value-down"}">${row.ret || "--"}</td>
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

  function renderCandles(stats) {
    const width = 1100;
    const height = 360;
    const pad = 30;
    const floor = height - pad;
    const top = pad;
    const bars = 36;
    const gap = (width - pad * 2) / bars;
    const bodyW = gap * 0.52;

    const random = seeded(Number(stats.total || 0) + Math.round(Number(stats.success || 0) * 10));
    let price = 100;

    const parts = [];
    for (let i = 0; i < 6; i += 1) {
      const y = top + ((floor - top) / 5) * i;
      parts.push(`<line x1="${pad}" y1="${y.toFixed(1)}" x2="${width - pad}" y2="${y.toFixed(1)}" stroke="rgba(142,164,204,0.18)" stroke-width="1"/>`);
    }

    for (let i = 0; i < bars; i += 1) {
      const drift = (random() - 0.48) * 8;
      const open = price;
      const close = open + drift;
      const wickUp = Math.max(open, close) + random() * 3.5;
      const wickDown = Math.min(open, close) - random() * 3.5;
      price = close;

      const scale = 2.35;
      const x = pad + i * gap + (gap - bodyW) / 2;
      const yo = floor - open * scale;
      const yc = floor - close * scale;
      const ywHi = floor - wickUp * scale;
      const ywLo = floor - wickDown * scale;
      const up = close >= open;

      const stroke = up ? "#43d9b7" : "#d76f8f";
      const fill = up ? "rgba(67,217,183,0.62)" : "rgba(215,111,143,0.65)";
      const y = Math.min(yo, yc);
      const h = Math.max(2, Math.abs(yo - yc));

      parts.push(`<line x1="${(x + bodyW / 2).toFixed(1)}" y1="${ywHi.toFixed(1)}" x2="${(x + bodyW / 2).toFixed(1)}" y2="${ywLo.toFixed(1)}" stroke="${stroke}" stroke-width="1.6"/>`);
      parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bodyW.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="1" rx="1"/>`);
    }

    candleSvg.innerHTML = parts.join("");
  }

  function applyView() {
    const security = securitySelect.value;
    const pattern = patternSelect.value;
    const horizon = horizonSelect.value;

    const securityData = DATA[security];
    const stats = securityData.patterns[pattern][horizon];

    selectionTitle.textContent = `${securityData.label || security} · ${titleize(pattern)} · ${horizon}`;
    windowValue.textContent = securityData.window || "--";
    syncValue.textContent = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;

    metricTotal.textContent = `${Number(stats.total || 0)}`;
    metricSuccess.textContent = `${Number(stats.success || 0).toFixed(1)}%`;
    metricFailure.textContent = `${Number(stats.failure || 0).toFixed(1)}%`;
    metricMove.textContent = `${Number(stats.avgMove || 0).toFixed(2)}%`;

    chartCaption.textContent = `Model output for ${security} ${titleize(pattern)} ${horizon}`;
    renderRows(stats.rows);
    renderCandles(stats);
  }

  function syncPatterns() {
    const security = securitySelect.value;
    const patterns = Object.keys(DATA[security].patterns);
    const current = patternSelect.value;
    setOptions(patternSelect, patterns, titleize);
    patternSelect.value = patterns.includes(current) ? current : patterns[0];
  }

  function syncHorizons() {
    const security = securitySelect.value;
    const pattern = patternSelect.value;
    const horizons = Object.keys(DATA[security].patterns[pattern]);
    const current = horizonSelect.value;
    setOptions(horizonSelect, horizons, (h) => h.replace("D", " Day"));
    horizonSelect.value = horizons.includes(current) ? current : horizons[0];
  }

  function init() {
    const securities = Object.keys(DATA);
    setOptions(securitySelect, securities, (s) => DATA[s].label || s);
    securitySelect.value = securities[0];

    syncPatterns();
    syncHorizons();
    applyView();

    feedStatus.textContent =
      window.MODEL_DATA && typeof window.MODEL_DATA === "object" && Object.keys(window.MODEL_DATA).length
        ? "Model feed: live file"
        : "Model feed: simulated";
  }

  securitySelect.addEventListener("change", () => {
    syncPatterns();
    syncHorizons();
    applyView();
  });

  patternSelect.addEventListener("change", () => {
    syncHorizons();
    applyView();
  });

  horizonSelect.addEventListener("change", applyView);

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
