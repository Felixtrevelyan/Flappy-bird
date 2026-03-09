(() => {
  const now = new Date();

  function patternFallback(total, direction) {
    return {
      "1D": {
        total,
        success: 52.4,
        failure: 47.6,
        avgMove: direction === "bullish" ? 0.25 : 0.27,
        series: [41, 44, 45, 47, 46, 50, 52, 52],
        rows: sampleRows(direction)
      },
      "3D": {
        total,
        success: 54.1,
        failure: 45.9,
        avgMove: direction === "bullish" ? 0.48 : 0.51,
        series: [42, 45, 47, 49, 51, 53, 54, 54],
        rows: sampleRows(direction)
      },
      "5D": {
        total,
        success: 56.5,
        failure: 43.5,
        avgMove: direction === "bullish" ? 0.74 : 0.73,
        series: [43, 47, 50, 52, 54, 56, 57, 57],
        rows: sampleRows(direction)
      },
      "10D": {
        total,
        success: 58.8,
        failure: 41.2,
        avgMove: direction === "bullish" ? 1.02 : 1.01,
        series: [45, 49, 52, 54, 56, 58, 59, 59],
        rows: sampleRows(direction)
      }
    };
  }

  function sampleRows(direction) {
    const up = direction === "bullish";
    return [
      {
        date: "2026-02-28",
        direction: up ? "Long" : "Short",
        entry: "2,041.20",
        exit: "2,053.60",
        outcome: "Success",
        ret: up ? "+0.61%" : "+0.55%"
      },
      {
        date: "2026-02-14",
        direction: up ? "Long" : "Short",
        entry: "2,018.90",
        exit: "2,012.40",
        outcome: "Failure",
        ret: up ? "-0.32%" : "-0.28%"
      },
      {
        date: "2026-01-29",
        direction: up ? "Long" : "Short",
        entry: "1,997.00",
        exit: "2,007.90",
        outcome: "Success",
        ret: up ? "+0.55%" : "+0.48%"
      },
      {
        date: "2026-01-11",
        direction: up ? "Long" : "Short",
        entry: "1,978.10",
        exit: "1,971.30",
        outcome: "Failure",
        ret: up ? "-0.34%" : "-0.31%"
      },
      {
        date: "2025-12-19",
        direction: up ? "Long" : "Short",
        entry: "1,955.40",
        exit: "1,968.70",
        outcome: "Success",
        ret: up ? "+0.68%" : "+0.64%"
      },
      {
        date: "2025-12-03",
        direction: up ? "Long" : "Short",
        entry: "1,942.80",
        exit: "1,936.00",
        outcome: "Failure",
        ret: up ? "-0.35%" : "-0.30%"
      }
    ];
  }

  const MOCK_DATA = {
    XAUUSD: {
      label: "Gold Spot",
      window: "1995-01-01 to Present",
      patterns: {
        bullish_engulfing: patternFallback(214, "bullish"),
        bearish_engulfing: patternFallback(198, "bearish"),
        pin_bar: patternFallback(162, "bullish"),
        inside_day: patternFallback(177, "bullish")
      }
    },
    FTSE100: {
      label: "FTSE 100 Index",
      window: "1995-01-01 to Present",
      patterns: {
        bullish_engulfing: patternFallback(143, "bullish"),
        bearish_engulfing: patternFallback(155, "bearish"),
        pin_bar: patternFallback(208, "bullish"),
        inside_day: patternFallback(232, "bullish")
      }
    },
    EURUSD: {
      label: "Euro / US Dollar",
      window: "1999-01-01 to Present",
      patterns: {
        bullish_engulfing: patternFallback(324, "bullish"),
        bearish_engulfing: patternFallback(316, "bearish"),
        pin_bar: patternFallback(289, "bullish"),
        inside_day: patternFallback(451, "bullish")
      }
    },
    BTCUSD: {
      label: "Bitcoin / US Dollar",
      window: "2014-01-01 to Present",
      patterns: {
        bullish_engulfing: patternFallback(196, "bullish"),
        bearish_engulfing: patternFallback(184, "bearish"),
        pin_bar: patternFallback(232, "bullish"),
        inside_day: patternFallback(274, "bullish")
      }
    }
  };

  function normalizeModelData(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    if (raw.securities && typeof raw.securities === "object") {
      return raw.securities;
    }
    return raw;
  }

  const externalData = normalizeModelData(window.MODEL_DATA);
  const DATA = externalData && Object.keys(externalData).length ? externalData : MOCK_DATA;

  const securitySelect = document.getElementById("security-select");
  const patternSelect = document.getElementById("pattern-select");
  const horizonSelect = document.getElementById("horizon-select");
  const showFailures = document.getElementById("show-failures");
  const refreshBtn = document.getElementById("refresh-btn");
  const feedStatus = document.getElementById("feed-status");
  const marketsBtn = document.getElementById("markets-btn");
  const sessionsBtn = document.getElementById("sessions-btn");

  const selectionTitle = document.getElementById("selection-title");
  const windowValue = document.getElementById("window-value");
  const syncValue = document.getElementById("sync-value");
  const metricTotal = document.getElementById("metric-total");
  const metricSuccess = document.getElementById("metric-success");
  const metricFailure = document.getElementById("metric-failure");
  const metricMove = document.getElementById("metric-move");
  const chartCaption = document.getElementById("chart-caption");
  const trendLine = document.getElementById("trend-line");
  const eventsBody = document.getElementById("events-body");

  function toPatternTitle(patternKey) {
    return patternKey
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function setSelectOptions(selectEl, values, labelFn) {
    selectEl.innerHTML = values
      .map((value) => `<option value="${value}">${labelFn(value)}</option>`)
      .join("");
  }

  function getSecurities() {
    return Object.keys(DATA);
  }

  function getPatterns(security) {
    return Object.keys(DATA[security].patterns);
  }

  function getHorizons(security, pattern) {
    return Object.keys(DATA[security].patterns[pattern]);
  }

  function toTrendPoints(series) {
    const points = series && series.length ? series : [45, 48, 50, 53, 55, 57, 58, 59];
    const baseX = 40;
    const step = 580 / (points.length - 1);
    return points
      .map((value, idx) => {
        const x = baseX + idx * step;
        const y = 235 - ((value - 35) / 35) * 190;
        return `${x.toFixed(1)},${Math.max(35, Math.min(235, y)).toFixed(1)}`;
      })
      .join(" ");
  }

  function updateRows(rows) {
    const sourceRows = Array.isArray(rows) ? rows : [];
    const showFailuresOn = showFailures.checked;
    const filtered = showFailuresOn
      ? sourceRows
      : sourceRows.filter((row) => row.outcome === "Success");

    eventsBody.innerHTML = filtered
      .map((row) => {
        const success = row.outcome === "Success";
        return `
          <tr>
            <td>${row.date || "--"}</td>
            <td>${row.direction || "--"}</td>
            <td>${row.entry || "--"}</td>
            <td>${row.exit || "--"}</td>
            <td><span class="badge ${success ? "success" : "failure"}">${row.outcome || "--"}</span></td>
            <td class="${success ? "value-up" : "value-down"}">${row.ret || "--"}</td>
          </tr>
        `;
      })
      .join("");
  }

  function applyView() {
    const security = securitySelect.value;
    const pattern = patternSelect.value;
    const horizon = horizonSelect.value;

    const securityData = DATA[security];
    const stats = securityData.patterns[pattern][horizon];

    selectionTitle.textContent = `${securityData.label || security} · ${toPatternTitle(pattern)} · ${horizon}`;
    windowValue.textContent = securityData.window || "--";
    syncValue.textContent = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;

    const total = Number(stats.total || 0);
    metricTotal.textContent = `${total}`;
    metricSuccess.textContent = `${Number(stats.success || 0).toFixed(1)}%`;
    metricFailure.textContent = `${Number(stats.failure || 0).toFixed(1)}%`;
    metricMove.textContent = `${Number(stats.avgMove || 0).toFixed(2)}%`;

    chartCaption.textContent = `Model output for ${security} ${toPatternTitle(pattern)} ${horizon}`;

    trendLine.setAttribute("points", toTrendPoints(stats.series));
    trendLine.style.opacity = "1";

    updateRows(stats.rows);
  }

  function syncPatternOptions() {
    const security = securitySelect.value;
    const patterns = getPatterns(security);
    const current = patternSelect.value;

    setSelectOptions(patternSelect, patterns, toPatternTitle);
    patternSelect.value = patterns.includes(current) ? current : patterns[0];
  }

  function syncHorizonOptions() {
    const security = securitySelect.value;
    const pattern = patternSelect.value;
    const horizons = getHorizons(security, pattern);
    const current = horizonSelect.value;

    setSelectOptions(horizonSelect, horizons, (h) => h.replace("D", " Day"));
    horizonSelect.value = horizons.includes(current) ? current : horizons[0];
  }

  function initializeSelectors() {
    const securities = getSecurities();
    setSelectOptions(securitySelect, securities, (s) => DATA[s].label || s);
    securitySelect.value = securities[0];
    syncPatternOptions();
    syncHorizonOptions();
  }

  securitySelect.addEventListener("change", () => {
    syncPatternOptions();
    syncHorizonOptions();
    applyView();
  });

  patternSelect.addEventListener("change", () => {
    syncHorizonOptions();
    applyView();
  });

  [horizonSelect, showFailures].forEach((el) => {
    el.addEventListener("change", applyView);
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

  function setTopNav(active) {
    marketsBtn.classList.toggle("is-active", active === "markets");
    sessionsBtn.classList.toggle("is-active", active === "sessions");
  }

  marketsBtn.addEventListener("click", () => setTopNav("markets"));
  sessionsBtn.addEventListener("click", () => setTopNav("sessions"));

  initializeSelectors();
  applyView();

  feedStatus.textContent = externalData
    ? "Model feed: live file"
    : "Model feed: simulated";
})();
