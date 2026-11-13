/**
 * SmartESS Web - Chart.js Visualizations & Touch/Mouse Scrubbers
 */
(function (global) {
  let chartInstances = [];
  let scrubberCleanups = [];
  const canvasScrubberControllers = new Map();
  let currentLoadBatUnit = "w"; // "w" or "a"

  function setLoadBatUnit(unit) {
    currentLoadBatUnit = unit;
  }

  function cleanupScrubbers() {
    scrubberCleanups.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    scrubberCleanups = [];
    canvasScrubberControllers.clear();
  }

  function destroyCharts() {
    cleanupScrubbers();
    chartInstances.forEach((c) => {
      try {
        c.destroy();
      } catch {}
    });
    chartInstances = [];
    statsHourlyChartInstance = null;
    statsDailyChartInstance = null;
  }

  function lockYAxisScales(c) {
    if (!c || c._yScalesLocked) return;
    if (typeof c.isZoomedOrPanned === "function" && c.isZoomedOrPanned()) return;
    const scales = c.scales || {};
    const scaleOpts = c.options?.scales || {};
    let lockedAny = false;

    for (const [axisId, scale] of Object.entries(scales)) {
      if (axisId === "x" || !scale) continue;
      const opt = scaleOpts[axisId];
      if (!opt) continue;
      const hasChartArea = Boolean(c.chartArea && c.chartArea.height > 0);
      const hasValidBounds =
        Number.isFinite(scale.min) &&
        Number.isFinite(scale.max) &&
        scale.max >= scale.min &&
        (hasChartArea || (Array.isArray(scale.ticks) && scale.ticks.length > 0));
      if (!hasValidBounds) continue;

      if (opt.min === undefined) opt.min = scale.min;
      if (opt.max === undefined) opt.max = scale.max;
      lockedAny = true;
    }

    if (lockedAny) {
      c._yScalesLocked = true;
    }
  }

  function zoomChart(chartOrId, factor = 1.15) {
    const factorX = Number(factor);
    if (!factorX || factorX <= 0) return;

    const applyZoom = (c) => {
      if (c && typeof c.zoom === "function") {
        // Freeze full-day Y bounds before horizontal zooming so small windows (e.g. 200W) keep full scale (e.g. 0-1600W)
        lockYAxisScales(c);
        c.zoom({ x: factorX }, "none");
      }
    };

    if (typeof chartOrId === "string") {
      const target = chartInstances.find((c) => c.canvas && c.canvas.id === chartOrId);
      if (target) applyZoom(target);
      return;
    }
    chartInstances.forEach(applyZoom);
  }

  function resetZoom(chartOrId) {
    if (typeof chartOrId === "string") {
      const target = chartInstances.find((c) => c.canvas && c.canvas.id === chartOrId);
      if (target && typeof target.resetZoom === "function") {
        target.resetZoom();
        return;
      }
    }
    chartInstances.forEach((c) => {
      if (typeof c.resetZoom === "function") {
        c.resetZoom();
      }
    });
  }

  function resizeCharts() {
    chartInstances.forEach((c) => {
      if (typeof c.resize === "function") {
        c.resize();
        lockYAxisScales(c);
      }
    });
  }

  function setupScrubber({ chart, canvas, lineEl, readoutEl, records, onScrub }) {
    if (!canvas || !chart || !records || records.length === 0) return;

    if (canvas.id && canvasScrubberControllers.has(canvas.id)) {
      try {
        canvasScrubberControllers.get(canvas.id).abort();
      } catch {}
    }
    const ac = new AbortController();
    const signal = ac.signal;
    if (canvas.id) {
      canvasScrubberControllers.set(canvas.id, ac);
    }
    scrubberCleanups.push(() => ac.abort());

    function handleScrub(clientX) {
      const rect = canvas.getBoundingClientRect();
      const xInCanvas = clientX - rect.left;
      const chartArea = chart.chartArea;
      if (!chartArea) return;

      const clampedX = Math.max(chartArea.left, Math.min(chartArea.right, xInCanvas));

      if (lineEl) {
        lineEl.style.left = `${clampedX}px`;
        lineEl.style.top = `${chartArea.top}px`;
        lineEl.style.height = `${chartArea.bottom - chartArea.top}px`;
        lineEl.classList.add("is-visible");
      }

      if (typeof chart.scales?.x?.getValueForPixel === "function") {
        const dataIndex = Math.round(chart.scales.x.getValueForPixel(clampedX));
        const idx = Math.max(0, Math.min(records.length - 1, dataIndex));
        const rec = records[idx];
        if (onScrub && rec) onScrub(rec, idx);
      }
    }

    function handleEnd() {
      // User request: keep the white scrubber line visible at the selected/picked point!
      // Do not remove "is-visible", so the crosshair line remains pinned to the picked timestamp.
    }

    let isTouching = false;
    let isTwoFingerPan = false;
    let lastPanMidX = 0;
    let startX = 0;
    let startY = 0;
    let isHorizontal = false;

    const canPan = () => Boolean(chart.options?.plugins?.zoom?.pan?.enabled && typeof chart.pan === "function");

    canvas.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length === 1) {
          isTwoFingerPan = false;
          isTouching = true;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          isHorizontal = false;
          handleScrub(startX);
        } else if (e.touches.length === 2 && canPan()) {
          isTouching = false;
          isHorizontal = false;
          isTwoFingerPan = true;
          lastPanMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        } else {
          isTouching = false;
          isTwoFingerPan = false;
        }
      },
      { passive: true, signal }
    );

    canvas.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches.length === 2 && canPan()) {
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          if (!isTwoFingerPan) {
            isTouching = false;
            isHorizontal = false;
            isTwoFingerPan = true;
            lastPanMidX = midX;
            if (e.cancelable) e.preventDefault();
            return;
          }
          const dx = midX - lastPanMidX;
          lastPanMidX = midX;
          if (e.cancelable) e.preventDefault();
          if (Math.abs(dx) >= 0.5) {
            chart.pan({ x: dx }, undefined, "none");
          }
          return;
        }

        if (!isTouching || e.touches.length !== 1) return;
        const curX = e.touches[0].clientX;
        const curY = e.touches[0].clientY;
        const dx = Math.abs(curX - startX);
        const dy = Math.abs(curY - startY);

        if (!isHorizontal && (dx > 6 || dy > 6)) {
          if (dx >= dy) {
            isHorizontal = true;
          } else {
            isTouching = false;
            handleEnd();
            return;
          }
        }

        if (isHorizontal) {
          if (e.cancelable) e.preventDefault();
          handleScrub(curX);
        }
      },
      { passive: false, signal }
    );

    canvas.addEventListener(
      "touchend",
      (e) => {
        if (!e.touches || e.touches.length < 2) {
          isTwoFingerPan = false;
        }
        if (!e.touches || e.touches.length === 0) {
          isTouching = false;
          isHorizontal = false;
          handleEnd();
        }
      },
      { passive: true, signal }
    );

    canvas.addEventListener(
      "touchcancel",
      () => {
        isTouching = false;
        isHorizontal = false;
        isTwoFingerPan = false;
        handleEnd();
      },
      { passive: true, signal }
    );

    canvas.addEventListener(
      "mousemove",
      (e) => {
        handleScrub(e.clientX);
      },
      { signal }
    );

    canvas.addEventListener(
      "mouseleave",
      () => {
        handleEnd();
      },
      { signal }
    );

    canvas.addEventListener(
      "wheel",
      (e) => {
        if (!canPan()) return;
        const isZoomed = typeof chart.isZoomedOrPanned === "function" ? chart.isZoomedOrPanned() : false;
        if (!isZoomed) return;

        // Allow horizontal trackpad scroll (deltaX) or Shift+wheel to slide the zoomed graph;
        // normal vertical wheel passes through untouched so page scrolling is never hijacked.
        const useShiftY = e.shiftKey && Math.abs(e.deltaY) > 0;
        const useHorizX = Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 0;
        if (!useShiftY && !useHorizX) return;

        const delta = useHorizX ? e.deltaX : e.deltaY;
        if (e.cancelable) e.preventDefault();
        chart.pan({ x: -delta }, undefined, "none");
      },
      { passive: false, signal }
    );
  }

  /**
   * Expands sparse telemetry arrays with proportional placeholder slots whenever
   * consecutive samples are separated by > gapThresholdMin (e.g. Wi-Fi or inverter off),
   * so charts show broken lines + shaded missing-data bands instead of bridging across hours.
   */
  function expandRecordsWithGaps(records, gapThresholdMin = 15) {
    if (!records || records.length < 2) {
      return { plotRecords: records || [], gapRanges: [] };
    }

    const toLocalTs = (ms) => {
      const dt = new Date(ms);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      const hh = String(dt.getHours()).padStart(2, "0");
      const mm = String(dt.getMinutes()).padStart(2, "0");
      return `${y}-${m}-${d} ${hh}:${mm}:00`;
    };

    const thresholdMs = gapThresholdMin * 60 * 1000;
    const plotRecords = [records[0]];
    const gapRanges = [];

    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      const cur = records[i];
      const prevMs = new Date(String(prev.timestamp || "").replace(" ", "T")).getTime();
      const curMs = new Date(String(cur.timestamp || "").replace(" ", "T")).getTime();

      if (!isNaN(prevMs) && !isNaN(curMs) && curMs - prevMs > thresholdMs) {
        const gapMin = (curMs - prevMs) / 60000;
        const stepMin = Math.max(5, Math.ceil(gapMin / 120));
        const stepMs = stepMin * 60 * 1000;
        const gapStartIdx = plotRecords.length;
        const gapFrom = String(prev.timestamp || "").slice(11, 16);
        const gapTo = String(cur.timestamp || "").slice(11, 16);

        for (let tMs = prevMs + stepMs; tMs < curMs - 60000; tMs += stepMs) {
          plotRecords.push({
            isGap: true,
            timestamp: toLocalTs(tMs),
            gapFrom,
            gapTo,
          });
        }

        if (plotRecords.length > gapStartIdx) {
          gapRanges.push({
            startIdx: gapStartIdx,
            endIdx: plotRecords.length - 1,
            fromTime: gapFrom,
            toTime: gapTo,
          });
        }
      }
      plotRecords.push(cur);
    }

    return { plotRecords, gapRanges };
  }

  function buildGapShadingPlugin(gapRanges, gapText) {
    return {
      id: "gapShading",
      beforeDatasetsDraw(chart) {
        if (!gapRanges || gapRanges.length === 0) return;
        const { ctx, chartArea, scales } = chart;
        const xScale = scales?.x;
        if (!xScale || !chartArea) return;

        ctx.save();
        ctx.beginPath();
        ctx.rect(
          chartArea.left,
          chartArea.top,
          chartArea.right - chartArea.left,
          chartArea.bottom - chartArea.top
        );
        ctx.clip();

        for (const gap of gapRanges) {
          const xStartRaw = xScale.getPixelForValue(Math.max(0, gap.startIdx - 0.5));
          const xEndRaw = xScale.getPixelForValue(gap.endIdx + 0.5);
          if (isNaN(xStartRaw) || isNaN(xEndRaw)) continue;
          const left = Math.min(xStartRaw, xEndRaw);
          const width = Math.abs(xEndRaw - xStartRaw);
          if (width < 2) continue;

          ctx.fillStyle = "rgba(148, 163, 184, 0.11)";
          ctx.fillRect(left, chartArea.top, width, chartArea.bottom - chartArea.top);

          ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(left, chartArea.top);
          ctx.lineTo(left, chartArea.bottom);
          ctx.moveTo(left + width, chartArea.top);
          ctx.lineTo(left + width, chartArea.bottom);
          ctx.stroke();

          if (width >= 56) {
            ctx.setLineDash([]);
            ctx.fillStyle = "rgba(203, 213, 225, 0.72)";
            ctx.font = "600 11px Inter, system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(gapText, left + width / 2, chartArea.top + 8);
          }
        }
        ctx.restore();
      },
    };
  }

  function renderAllCharts(records) {
    destroyCharts();

    if (!records || records.length === 0) return;

    const t = window.SmartESS?.I18n?.t || window.t || ((k) => k);
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

    const { plotRecords, gapRanges } = expandRecordsWithGaps(records, 15);
    const gapShadingPlugin = buildGapShadingPlugin(gapRanges, t("gapChartLabel"));

    // Zoom limit: 4 hours minimum window (e.g. from 05:55 to 09:55)
    let minRangePoints = 48;
    if (plotRecords.length >= 2) {
      const t0 = new Date(plotRecords[0].timestamp.replace(" ", "T")).getTime();
      const tLast = new Date(plotRecords[plotRecords.length - 1].timestamp.replace(" ", "T")).getTime();
      const totalMs = tLast - t0;
      if (totalMs > 0) {
        const msPerPoint = totalMs / (plotRecords.length - 1);
        const fourHoursMs = 4 * 60 * 60 * 1000;
        const pts = Math.round(fourHoursMs / msPerPoint);
        if (pts > 1) {
          minRangePoints = Math.min(pts, plotRecords.length - 1);
        }
      }
    }

    const labels = plotRecords.map((r) => r.timestamp.slice(11, 16));

    const mapVal = (fn) => plotRecords.map((r) => (r.isGap ? null : fn(r)));
    const pvPower = mapVal((r) => Number(r.pvPower || 0));
    const loadActive = mapVal((r) => Math.max(0, Number(r.loadActive || 0)));
    const loadVA = mapVal((r) => Math.max(0, Number(r.loadVA || 0)));
    const batPower = mapVal((r) =>
      Math.round(Number(r.batVolt || 0) * Number(r.batCurr || 0))
    );

    const batSoc = mapVal((r) => Number(r.batSoc || 0));
    const batCurr = mapVal((r) => Number(r.batCurr || 0));

    // AC Load Current (Amperes): use hardware-fetched loadCurr if present, with fallback
    const loadCurr = mapVal((r) => {
      if (r.loadCurr !== undefined && r.loadCurr !== null && Number(r.loadCurr) > 0) {
        return Math.round(Number(r.loadCurr) * 10) / 10;
      }
      const v = Number(r.outVolt || 0);
      const va = Number(r.loadVA || 0);
      const w = Number(r.loadActive || 0);
      if (v >= 50) {
        return Math.round((Math.max(va, w) / v) * 10) / 10;
      }
      return Math.round((w / 230) * 10) / 10;
    });

    const isLoadBatAmps = currentLoadBatUnit === "a";
    const loadData = isLoadBatAmps ? loadCurr : loadActive;
    const batData = isLoadBatAmps
      ? batCurr.map((c) => (c === null ? null : Math.abs(c)))
      : batPower.map((p) => (p === null ? null : Math.abs(p)));
    const loadUnitStr = isLoadBatAmps ? t("unitA") : t("unitW");

    // Dynamic Title for Load & Battery History
    const loadBatTitleEl = document.getElementById("loadBatHistoryTitle");
    if (loadBatTitleEl) {
      const baseTitle = t("loadBatHistoryBase") || t("loadBatHistoryTitle");
      loadBatTitleEl.textContent = `${baseTitle} (${loadUnitStr})`;
    }

    const gridVolt = mapVal((r) => Number(r.gridVolt || 0));
    const gridFreq = mapVal((r) => Number(r.gridFreq || 0));

    const tempInv = mapVal((r) => Number(r.tempInv || 0));
    const tempB = mapVal((r) => Number(r.tempB || 0));
    const tempPv = mapVal((r) => Number(r.tempPv || 0));

    // Real-record arrays for card peak stats (excluding synthetic gap nulls)
    const realPvPower = records.map((r) => Number(r.pvPower || 0));
    const realLoadActive = records.map((r) => Math.max(0, Number(r.loadActive || 0)));
    const realLoadVA = records.map((r) => Math.max(0, Number(r.loadVA || 0)));
    const realBatPower = records.map((r) =>
      Math.round(Number(r.batVolt || 0) * Number(r.batCurr || 0))
    );
    const realBatCurr = records.map((r) => Number(r.batCurr || 0));
    const realLoadCurr = records.map((r) => {
      if (r.loadCurr !== undefined && r.loadCurr !== null && Number(r.loadCurr) > 0) {
        return Math.round(Number(r.loadCurr) * 10) / 10;
      }
      const v = Number(r.outVolt || 0);
      const va = Number(r.loadVA || 0);
      const w = Number(r.loadActive || 0);
      return v >= 50 ? Math.round((Math.max(va, w) / v) * 10) / 10 : Math.round((w / 230) * 10) / 10;
    });
    const realTempInv = records.map((r) => Number(r.tempInv || 0));
    const realTempPv = records.map((r) => Number(r.tempPv || 0));

    const maxVal = (arr) => (arr.length ? Math.max(...arr) : 0);

    // Stats updates for cards
    const loadBatStatsEl = document.getElementById("loadBatStats");
    if (loadBatStatsEl) {
      const maxLoadW = maxVal(realLoadActive);
      const maxLoadA = maxVal(realLoadCurr);
      const maxChgW = Math.max(0, ...realBatPower);
      const maxChgA = Math.max(0, ...realBatCurr);
      const maxDisW = Math.abs(Math.min(0, ...realBatPower));
      const maxDisA = Math.abs(Math.min(0, ...realBatCurr));

      if (isLoadBatAmps) {
        let batStatText = "";
        if (maxChgA > 0 && maxDisA > 0) {
          batStatText = `${t("charge")}: +${maxChgA.toFixed(1)} ${t("unitA")} · ${t("discharge")}: ${maxDisA.toFixed(1)} ${t("unitA")}`;
        } else if (maxChgA > 0) {
          batStatText = `${t("peakCharge")}: +${maxChgA.toFixed(1)} ${t("unitA")}`;
        } else if (maxDisA > 0) {
          batStatText = `${t("peakDischarge")}: ${maxDisA.toFixed(1)} ${t("unitA")}`;
        }
        loadBatStatsEl.textContent = `${t("peakLoad")}: ${maxLoadA.toFixed(1)} ${t("unitA")}${batStatText ? " · " + batStatText : ""}`;
      } else {
        let batStatText = "";
        if (maxChgW > 0 && maxDisW > 0) {
          batStatText = `${t("charge")}: +${maxChgW} ${t("unitW")} (${maxChgA.toFixed(1)} ${t("unitA")}) · ${t("discharge")}: ${maxDisW} ${t("unitW")} (${maxDisA.toFixed(1)} ${t("unitA")})`;
        } else if (maxChgW > 0) {
          batStatText = `${t("peakCharge")}: +${maxChgW} ${t("unitW")} (${maxChgA.toFixed(1)} ${t("unitA")})`;
        } else if (maxDisW > 0) {
          batStatText = `${t("peakDischarge")}: ${maxDisW} ${t("unitW")} (${maxDisA.toFixed(1)} ${t("unitA")})`;
        }
        loadBatStatsEl.textContent = `${t("peakLoad")}: ${maxLoadW} ${t("unitW")} (${maxLoadA.toFixed(1)} ${t("unitA")})${batStatText ? " · " + batStatText : ""}`;
      }
    }

    const powerStatsEl = document.getElementById("powerStats");
    if (powerStatsEl) {
      powerStatsEl.textContent = `${t("peakPv")}: ${maxVal(realPvPower)} ${t("unitW")} · ${t("peakLoad")}: ${maxVal(realLoadVA)} ${t("unitVa")}`;
    }

    const tempStatsEl = document.getElementById("tempStats");
    if (tempStatsEl) {
      tempStatsEl.textContent = `${t("maxInv")}: ${maxVal(realTempInv)} ${t("unitDeg")} · PV: ${maxVal(realTempPv)} ${t("unitDeg")}`;
    }

    // Base Options: Tooltips disabled completely on all devices since readouts are underneath
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          labels: { color: "#eef0f8", boxWidth: 12, font: { size: 12 } },
        },
        tooltip: {
          enabled: false, // Tooltips disabled completely; info is cleanly shown in the scrubber readouts underneath
        },
        zoom: {
          limits: {
            x: {
              min: "original",
              max: "original",
              minRange: minRangePoints,
            },
          },
          pan: {
            enabled: true,
            mode: "x",
            threshold: 6,
            onPanStart({ event }) {
              // Mobile 2-finger pan is handled directly in setupScrubber so 1-finger stays scrub-only;
              // Desktop mouse drag pans horizontally freely when zoomed.
              const isTouch = event?.pointerType === "touch" || Boolean(event?.srcEvent?.touches);
              return !isTouch;
            },
          },
          zoom: {
            wheel: { enabled: false },
            pinch: { enabled: false },
            drag: { enabled: false },
            mode: "x",
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#8c95b8", maxTicksLimit: 14 },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
      },
    };

    // 1. Grid Chart: Mains Voltage, Battery SoC % & Frequency (Main Tab)
    const gridCanvas = document.getElementById("gridChart");
    let gridChartInstance = null;
    if (gridCanvas) {
      gridChartInstance = new Chart(gridCanvas, {
        type: "line",
        plugins: [gapShadingPlugin],
        data: {
          labels,
          datasets: [
            {
              label: t("chartGridVolt"),
              data: gridVolt,
              borderColor: "#38bdf8",
              backgroundColor: "rgba(56, 189, 248, 0.12)",
              fill: true,
              yAxisID: "yVolt",
              tension: 0.2,
              pointRadius: 0,
              borderWidth: 2,
              spanGaps: false,
            },
            {
              label: t("chartBatSoc"),
              data: batSoc,
              borderColor: "#22c55e",
              backgroundColor: "rgba(34, 197, 94, 0.08)",
              fill: true,
              yAxisID: "ySoc",
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 2,
              spanGaps: false,
            },
            {
              label: t("chartGridFreq"),
              data: gridFreq,
              borderColor: "#f59e0b",
              yAxisID: "yFreq",
              tension: 0.2,
              pointRadius: 0,
              borderWidth: 1.5,
              borderDash: [3, 3],
              spanGaps: false,
            },
          ],
        },
        options: {
          ...baseOptions,
          scales: {
            ...baseOptions.scales,
            yVolt: {
              type: "linear",
              position: "left",
              min: 0,
              max: 260,
              ticks: {
                display: !isMobile,
                color: "#38bdf8",
                maxTicksLimit: 6,
                callback: (v) => v + " " + t("unitV"),
              },
              grid: { color: "rgba(255,255,255,0.05)" },
            },
            ySoc: {
              type: "linear",
              position: "right",
              min: 0,
              max: 100,
              display: false,
              ticks: {
                display: false,
                color: "#22c55e",
                maxTicksLimit: 5,
                callback: (v) => v + "%",
              },
              grid: { drawOnChartArea: false },
            },
            yFreq: {
              type: "linear",
              position: "right",
              min: 45,
              max: 55,
              display: false,
              ticks: {
                display: false,
                color: "#f59e0b",
                maxTicksLimit: 3,
                callback: (v) => v + " " + t("unitHz"),
              },
              grid: { drawOnChartArea: false },
            },
          },
        },
      });
      chartInstances.push(gridChartInstance);

      // Scrubber Setup for Grid Chart
      const gridLine = document.getElementById("gridScrubLine");
      const gridReadout = document.getElementById("gridScrubReadout");
      const gridTimeEl = document.getElementById("gridScrubTime");
      const gridVoltEl = document.getElementById("gridScrubVolt");
      const gridSocEl = document.getElementById("gridScrubSoc");
      const gridFreqEl = document.getElementById("gridScrubFreq");
      const gridModeEl = document.getElementById("gridScrubMode");

      function updateGridReadout(rec) {
        if (!rec) return;
        if (gridTimeEl) gridTimeEl.textContent = rec.timestamp.slice(11, 16);
        if (rec.isGap) {
          if (gridVoltEl) {
            gridVoltEl.textContent = t("gapScrubLabel", { from: rec.gapFrom, to: rec.gapTo });
            gridVoltEl.className = "val-muted";
          }
          if (gridSocEl) gridSocEl.textContent = "🔋 —";
          if (gridFreqEl) gridFreqEl.textContent = "〰️ —";
          if (gridModeEl) gridModeEl.textContent = "—";
          if (gridReadout) gridReadout.classList.add("is-active");
          return;
        }
        if (gridVoltEl) {
          const v = Number(rec.gridVolt || 0);
          if (v < 50) {
            gridVoltEl.textContent = `🔴 0 ${t("unitV")} (${t("statusOffline")})`;
            gridVoltEl.className = "val-red";
          } else if (v < 180) {
            gridVoltEl.textContent = `⚠️ ${v} ${t("unitV")}`;
            gridVoltEl.className = "val-amber";
          } else {
            gridVoltEl.textContent = `⚡ ${v} ${t("unitV")}`;
            gridVoltEl.className = "val-blue";
          }
        }
        if (gridSocEl) {
          gridSocEl.textContent = `🔋 ${rec.batSoc}%`;
        }
        if (gridFreqEl) {
          gridFreqEl.textContent = `〰️ ${rec.gridFreq} ${t("unitHz")}`;
        }
        if (gridModeEl) {
          const m = window.SmartESS?.I18n?.translateMode
            ? window.SmartESS.I18n.translateMode(rec.mode)
            : rec.mode;
          gridModeEl.textContent = m || "—";
        }
        if (gridReadout) gridReadout.classList.add("is-active");
      }

      updateGridReadout(records[records.length - 1]);

      setupScrubber({
        chart: gridChartInstance,
        canvas: gridCanvas,
        lineEl: gridLine,
        readoutEl: gridReadout,
        records: plotRecords,
        onScrub: updateGridReadout,
      });
    }

    // 2. Load & Battery Power Chart (Main Tab)
    const loadBatCanvas = document.getElementById("loadBatChart");
    let loadBatChartInstance = null;
    if (loadBatCanvas) {
      loadBatChartInstance = new Chart(loadBatCanvas, {
        type: "line",
        plugins: [gapShadingPlugin],
        data: {
          labels,
          datasets: [
            {
              label: isLoadBatAmps
                ? `${t("chartLoadCurrOnly")} (${t("unitA")})`
                : `${t("chartLoadOnly")} (${t("unitW")})`,
              data: loadData,
              borderColor: "#7c5cff",
              backgroundColor: "rgba(124, 92, 255, 0.16)",
              fill: true,
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 2,
              spanGaps: false,
            },
            {
              label: isLoadBatAmps
                ? `${t("chartBatCurrOnly")} (${t("unitA")})`
                : `${t("chartBatPowerOnly")} (${t("unitW")})`,
              data: batData,
              borderColor: "#22c55e",
              segment: {
                borderColor: (ctx) => {
                  const rawVal = isLoadBatAmps
                    ? batCurr[ctx.p0DataIndex]
                    : batPower[ctx.p0DataIndex];
                  return rawVal === null || rawVal < 0 ? "#f59e0b" : "#22c55e";
                },
              },
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 1.8,
              spanGaps: false,
            },
          ],
        },
        options: {
          ...baseOptions,
          scales: {
            ...baseOptions.scales,
            y: {
              min: 0,
              ticks: {
                display: !isMobile,
                color: "#8c95b8",
                callback: (v) => v + " " + loadUnitStr,
              },
              grid: { color: "rgba(255,255,255,0.05)" },
            },
          },
        },
      });
      chartInstances.push(loadBatChartInstance);
      lockYAxisScales(loadBatChartInstance);

      // Scrubber Setup for Load & Bat Chart
      const loadBatLine = document.getElementById("loadBatScrubLine");
      const loadBatReadout = document.getElementById("loadBatScrubReadout");
      const loadBatTimeEl = document.getElementById("loadBatScrubTime");
      const loadBatLoadEl = document.getElementById("loadBatScrubLoad");
      const loadBatBatEl = document.getElementById("loadBatScrubBat");
      const loadBatModeEl = document.getElementById("loadBatScrubMode");

      function updateLoadBatReadout(rec) {
        if (!rec) return;
        if (loadBatTimeEl) loadBatTimeEl.textContent = rec.timestamp.slice(11, 16);
        if (rec.isGap) {
          if (loadBatLoadEl) {
            loadBatLoadEl.textContent = t("gapScrubLabel", { from: rec.gapFrom, to: rec.gapTo });
            loadBatLoadEl.className = "val-muted";
          }
          if (loadBatBatEl) {
            loadBatBatEl.textContent = "🔋 —";
            loadBatBatEl.className = "val-muted";
          }
          if (loadBatModeEl) loadBatModeEl.textContent = "—";
          if (loadBatReadout) loadBatReadout.classList.add("is-active");
          return;
        }

        const rawLoadA = Number(rec.loadCurr || 0);
        const vOut = Number(rec.outVolt || 0);
        const loadW = Math.max(0, Number(rec.loadActive || 0));
        const loadVA = Math.max(0, Number(rec.loadVA || 0));
        const loadA = rawLoadA > 0
          ? rawLoadA.toFixed(1)
          : (vOut >= 50 ? (Math.max(loadVA, loadW) / vOut).toFixed(1) : (loadW / 230).toFixed(1));

        if (loadBatLoadEl) {
          loadBatLoadEl.textContent = `🏠 ${loadW} ${t("unitW")} · ${loadA} ${t("unitA")}`;
          loadBatLoadEl.className = loadW > 3000 ? "val-amber" : "val-purple";
        }

        const rawBatA = Number(rec.batCurr || 0);
        const batV = Number(rec.batVolt || 0);
        const bp = Math.round(batV * Math.abs(rawBatA));
        const aAbs = Math.abs(rawBatA).toFixed(1);

        if (loadBatBatEl) {
          if (rawBatA > 0) {
            loadBatBatEl.textContent = `🔋 +${bp} ${t("unitW")} · ${aAbs} ${t("unitA")} (${t("charge")})`;
            loadBatBatEl.className = "val-green";
          } else if (rawBatA < 0) {
            loadBatBatEl.textContent = `🔋 ${bp} ${t("unitW")} · ${aAbs} ${t("unitA")} (${t("discharge")})`;
            loadBatBatEl.className = bp > 2000 ? "val-red" : "val-amber";
          } else {
            loadBatBatEl.textContent = `🔋 0 ${t("unitW")} · 0.0 ${t("unitA")} (${t("buffer")})`;
            loadBatBatEl.className = "val-blue";
          }
        }

        if (loadBatModeEl) {
          const m = window.SmartESS?.I18n?.translateMode
            ? window.SmartESS.I18n.translateMode(rec.mode)
            : rec.mode;
          loadBatModeEl.textContent = m || "—";
        }
        if (loadBatReadout) loadBatReadout.classList.add("is-active");
      }

      updateLoadBatReadout(records[records.length - 1]);

      setupScrubber({
        chart: loadBatChartInstance,
        canvas: loadBatCanvas,
        lineEl: loadBatLine,
        readoutEl: loadBatReadout,
        records: plotRecords,
        onScrub: updateLoadBatReadout,
      });
    }

    // 3. Full Power Balance Chart (Advanced Tab)
    const powerCanvas = document.getElementById("powerChart");
    let powerChartInstance = null;
    if (powerCanvas) {
      powerChartInstance = new Chart(powerCanvas, {
        type: "line",
        plugins: [gapShadingPlugin],
        data: {
          labels,
          datasets: [
            {
              label: t("chartPv"),
              data: pvPower,
              borderColor: "#f59e0b",
              backgroundColor: "rgba(245, 158, 11, 0.16)",
              fill: true,
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 2,
              spanGaps: false,
            },
            {
              label: t("chartLoadVA"),
              data: loadVA,
              borderColor: "#7c5cff",
              backgroundColor: "rgba(124, 92, 255, 0.14)",
              fill: true,
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 2,
              spanGaps: false,
            },
            {
              label: t("chartLoadActive"),
              data: loadActive,
              borderColor: "#38bdf8",
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 1.5,
              borderDash: [4, 3],
              spanGaps: false,
            },
            {
              label: t("chartBat"),
              data: batPower,
              borderColor: "#22c55e",
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 1.8,
              spanGaps: false,
            },
          ],
        },
        options: {
          ...baseOptions,
          scales: {
            ...baseOptions.scales,
            y: {
              ticks: { color: "#8c95b8" },
              grid: { color: "rgba(255,255,255,0.05)" },
            },
          },
        },
      });
      chartInstances.push(powerChartInstance);
      lockYAxisScales(powerChartInstance);

      // Scrubber Setup for Full Power Balance Chart
      const powerLine = document.getElementById("powerScrubLine");
      const powerReadout = document.getElementById("powerScrubReadout");
      const powerTimeEl = document.getElementById("powerScrubTime");
      const powerPvEl = document.getElementById("powerScrubPv");
      const powerVaEl = document.getElementById("powerScrubVa");
      const powerLoadEl = document.getElementById("powerScrubLoad");
      const powerBatEl = document.getElementById("powerScrubBat");
      const powerModeEl = document.getElementById("powerScrubMode");

      function updatePowerReadout(rec) {
        if (!rec) return;
        if (powerTimeEl) powerTimeEl.textContent = rec.timestamp.slice(11, 16);
        if (rec.isGap) {
          if (powerPvEl) powerPvEl.textContent = t("gapScrubLabel", { from: rec.gapFrom, to: rec.gapTo });
          if (powerVaEl) powerVaEl.textContent = "⚡ —";
          if (powerLoadEl) {
            powerLoadEl.textContent = "🏠 —";
            powerLoadEl.className = "val-muted";
          }
          if (powerBatEl) {
            powerBatEl.textContent = "🔋 —";
            powerBatEl.className = "val-muted";
          }
          if (powerModeEl) powerModeEl.textContent = "—";
          if (powerReadout) powerReadout.classList.add("is-active");
          return;
        }
        if (powerPvEl) {
          const pvA = Number(rec.pvCurr || 0);
          const pvW = Number(rec.pvPower || 0);
          const pvStr = pvA > 0 ? `${pvW} ${t("unitW")} · ${pvA.toFixed(1)} ${t("unitA")}` : `${pvW} ${t("unitW")}`;
          powerPvEl.textContent = `☀️ ${t("scrubPv")}: ${pvStr}`;
        }
        if (powerVaEl) {
          powerVaEl.textContent = `⚡ ${t("scrubVa")}: ${rec.loadVA} ${t("unitVa")}`;
        }
        if (powerLoadEl) {
          const rawLoadA = Number(rec.loadCurr || 0);
          const loadW = Math.max(0, Number(rec.loadActive || 0));
          const vOut = Number(rec.outVolt || 0);
          const loadVA = Math.max(0, Number(rec.loadVA || 0));
          const loadA = rawLoadA > 0
            ? rawLoadA.toFixed(1)
            : (vOut >= 50 ? (Math.max(loadVA, loadW) / vOut).toFixed(1) : (loadW / 230).toFixed(1));
          powerLoadEl.textContent = `🏠 ${t("scrubLoad")}: ${loadW} ${t("unitW")} · ${loadA} ${t("unitA")}`;
          powerLoadEl.className = loadW > 3000 ? "val-amber" : "val-blue";
        }
        if (powerBatEl) {
          const bp = Math.round(Number(rec.batVolt || 0) * Number(rec.batCurr || 0));
          const aAbs = Math.abs(Number(rec.batCurr || 0)).toFixed(1);
          if (bp > 0) {
            powerBatEl.textContent = `🔋 ${t("scrubBat")}: +${bp} ${t("unitW")} · ${aAbs} ${t("unitA")}`;
            powerBatEl.className = "val-green";
          } else if (bp < 0) {
            powerBatEl.textContent = `🔋 ${t("scrubBat")}: ${bp} ${t("unitW")} · ${aAbs} ${t("unitA")}`;
            powerBatEl.className = Math.abs(bp) > 2000 ? "val-red" : "val-amber";
          } else {
            powerBatEl.textContent = `🔋 ${t("scrubBat")}: 0 ${t("unitW")} · 0.0 ${t("unitA")}`;
            powerBatEl.className = "val-blue";
          }
        }
        if (powerModeEl) {
          const m = window.SmartESS?.I18n?.translateMode
            ? window.SmartESS.I18n.translateMode(rec.mode)
            : rec.mode;
          powerModeEl.textContent = m || "—";
        }
        if (powerReadout) powerReadout.classList.add("is-active");
      }

      updatePowerReadout(records[records.length - 1]);

      setupScrubber({
        chart: powerChartInstance,
        canvas: powerCanvas,
        lineEl: powerLine,
        readoutEl: powerReadout,
        records: plotRecords,
        onScrub: updatePowerReadout,
      });
    }

    // 4. Thermal Profile Chart (Advanced Tab)
    const tempCanvas = document.getElementById("tempChart");
    let tempChartInstance = null;
    if (tempCanvas) {
      tempChartInstance = new Chart(tempCanvas, {
        type: "line",
        plugins: [gapShadingPlugin],
        data: {
          labels,
          datasets: [
            {
              label: t("chartTempInv"),
              data: tempInv,
              borderColor: "#ef4444",
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 2,
              spanGaps: false,
            },
            {
              label: t("chartTempB"),
              data: tempB,
              borderColor: "#7c5cff",
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 2,
              spanGaps: false,
            },
            {
              label: t("chartTempPv"),
              data: tempPv,
              borderColor: "#f59e0b",
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 2,
              spanGaps: false,
            },
          ],
        },
        options: {
          ...baseOptions,
          scales: {
            ...baseOptions.scales,
            y: {
              ticks: { color: "#8c95b8" },
              grid: { color: "rgba(255,255,255,0.05)" },
            },
          },
        },
      });
      chartInstances.push(tempChartInstance);
      lockYAxisScales(tempChartInstance);

      // Scrubber Setup for Thermal Profile Chart
      const tempLine = document.getElementById("tempScrubLine");
      const tempReadout = document.getElementById("tempScrubReadout");
      const tempTimeEl = document.getElementById("tempScrubTime");
      const tempInvEl = document.getElementById("tempScrubInv");
      const tempBEl = document.getElementById("tempScrubB");
      const tempPvEl = document.getElementById("tempScrubPv");

      function updateTempReadout(rec) {
        if (!rec) return;
        if (tempTimeEl) tempTimeEl.textContent = rec.timestamp.slice(11, 16);
        if (rec.isGap) {
          if (tempInvEl) tempInvEl.textContent = t("gapScrubLabel", { from: rec.gapFrom, to: rec.gapTo });
          if (tempBEl) tempBEl.textContent = "🌡️ —";
          if (tempPvEl) tempPvEl.textContent = "☀️ —";
          if (tempReadout) tempReadout.classList.add("is-active");
          return;
        }
        if (tempInvEl) {
          tempInvEl.textContent = `🌡️ ${t("scrubInv")}: ${rec.tempInv} ${t("unitDeg")}`;
        }
        if (tempBEl) {
          tempBEl.textContent = `🌡️ ${t("scrubSinkB")}: ${rec.tempB} ${t("unitDeg")}`;
        }
        if (tempPvEl) {
          tempPvEl.textContent = `☀️ ${t("scrubPv")}: ${rec.tempPv} ${t("unitDeg")}`;
        }
        if (tempReadout) tempReadout.classList.add("is-active");
      }

      updateTempReadout(records[records.length - 1]);

      setupScrubber({
        chart: tempChartInstance,
        canvas: tempCanvas,
        lineEl: tempLine,
        readoutEl: tempReadout,
        records: plotRecords,
        onScrub: updateTempReadout,
      });
    }

    // 5. Hourly Battery Energy Distribution Chart (Statistics Tab)
    renderHourlyStatsChart(records, currentStatsUnit);
  }

  let statsHourlyChartInstance = null;
  let statsDailyChartInstance = null;
  let currentStatsUnit = "wh";

  function setStatsUnit(unit) {
    currentStatsUnit = unit;
  }

  /**
   * Renders the Daily Breakdown Bar Chart for multi-day views (Week / 14 Days / 30 Days).
   * Automatically hides the section when viewing a single day.
   */
  function renderDailyStatsChart(dailySeries, unit = currentStatsUnit) {
    currentStatsUnit = unit;
    const section = document.getElementById("statsDailySection");
    const canvas = document.getElementById("statsDailyChart");

    if (statsDailyChartInstance) {
      try {
        statsDailyChartInstance.destroy();
      } catch {}
      statsDailyChartInstance = null;
    }

    if (!Array.isArray(dailySeries) || dailySeries.length <= 1) {
      if (section) section.style.display = "none";
      return;
    }

    if (section) section.style.display = "";
    if (!canvas) return;

    const t = window.SmartESS?.I18n?.t || window.t || ((k) => k);
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

    const subBadge = document.getElementById("statsDailySubBadge");
    if (subBadge) {
      subBadge.textContent = t("statsDailySubBadge", { days: dailySeries.length });
    }

    // Format labels compactly as MM-DD (or DD.MM)
    const labels = dailySeries.map((d) => {
      const parts = String(d.date || "").split("-");
      return parts.length === 3 ? `${parts[2]}.${parts[1]}` : d.date;
    });

    const chargedData = dailySeries.map((d) =>
      unit === "ah" ? Number((d.chgAh || 0).toFixed(1)) : Math.round(d.chgWh || 0)
    );
    const dischargedData = dailySeries.map((d) =>
      unit === "ah" ? Number((d.disAh || 0).toFixed(1)) : Math.round(d.disWh || 0)
    );

    const unitLabel = unit === "ah" ? t("unitAh") : t("unitWh");

    statsDailyChartInstance = new Chart(canvas, {
      data: {
        labels,
        datasets: [
          {
            type: "bar",
            label: `${t("charge")} (${unitLabel})`,
            data: chargedData,
            backgroundColor: "rgba(34, 197, 94, 0.78)",
            borderColor: "#22c55e",
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            type: "bar",
            label: `${t("discharge")} (${unitLabel})`,
            data: dischargedData,
            backgroundColor: "rgba(245, 158, 11, 0.78)",
            borderColor: "#f59e0b",
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#eef0f8", boxWidth: 12, font: { size: 12 } },
          },
          tooltip: { enabled: false },
        },
        scales: {
          x: {
            ticks: {
              color: "#8c95b8",
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: isMobile ? 7 : 15,
            },
            grid: { display: false },
          },
          y: {
            min: 0,
            ticks: {
              display: !isMobile,
              color: "#8c95b8",
              callback: (v) => v + " " + unitLabel,
            },
            grid: { color: "rgba(255,255,255,0.05)" },
          },
        },
      },
    });

    chartInstances.push(statsDailyChartInstance);

    const dailyLine = document.getElementById("statsDailyScrubLine");
    const dailyReadout = document.getElementById("statsDailyScrubReadout");
    const dailyDateEl = document.getElementById("statsDailyDate");
    const dailyChgEl = document.getElementById("statsDailyCharge");
    const dailyDisEl = document.getElementById("statsDailyDischarge");

    function updateDailyReadout(idx) {
      if (idx < 0 || idx >= dailySeries.length) return;
      const item = dailySeries[idx];
      const cVal = chargedData[idx];
      const dVal = dischargedData[idx];

      if (dailyDateEl) dailyDateEl.textContent = item.date;
      if (dailyChgEl) {
        dailyChgEl.textContent = `⚡ +${cVal.toLocaleString()} ${unitLabel} (${t("charge")})`;
        dailyChgEl.className = cVal > 0 ? "val-green" : "val-muted";
      }
      if (dailyDisEl) {
        dailyDisEl.textContent = `🔋 ${dVal.toLocaleString()} ${unitLabel} (${t("discharge")})`;
        dailyDisEl.className = dVal > 0 ? "val-amber" : "val-muted";
      }
      if (dailyReadout) dailyReadout.classList.add("is-active");
    }

    updateDailyReadout(dailySeries.length - 1);

    setupScrubber({
      chart: statsDailyChartInstance,
      canvas,
      lineEl: dailyLine,
      readoutEl: dailyReadout,
      records: dailySeries,
      onScrub: (_, idx) => updateDailyReadout(idx),
    });
  }

  function renderHourlyStatsChart(dataOrRecords, unit = currentStatsUnit) {
    currentStatsUnit = unit;
    const canvas = document.getElementById("statsHourlyChart");
    if (!canvas) return;

    if (statsHourlyChartInstance) {
      try {
        statsHourlyChartInstance.destroy();
      } catch {}
      statsHourlyChartInstance = null;
    }

    const isAggregated =
      dataOrRecords &&
      !Array.isArray(dataOrRecords) &&
      dataOrRecords.isAggregated === true;

    if (!isAggregated && (!Array.isArray(dataOrRecords) || dataOrRecords.length === 0)) {
      return;
    }

    const t = window.SmartESS?.I18n?.t || window.t || ((k) => k);
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

    // Hourly aggregation for 24 hours (00 to 23)
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const labels = hours.map((h) => String(h).padStart(2, "0") + ":00");
    let charged = new Array(24).fill(0);
    let discharged = new Array(24).fill(0);
    let load = new Array(24).fill(0);
    let pv = new Array(24).fill(0);
    let dayCount = 1;

    if (isAggregated) {
      dayCount = Math.max(1, Number(dataOrRecords.dayCount || 1));
      charged = unit === "ah" ? [...dataOrRecords.chargedAh] : [...dataOrRecords.chargedWh];
      discharged = unit === "ah" ? [...dataOrRecords.dischargedAh] : [...dataOrRecords.dischargedWh];
      load = [...dataOrRecords.loadWh];
      pv = [...dataOrRecords.pvWh];
    } else {
      const dt = 5 / 60; // 5 min interval in hours
      for (const r of dataOrRecords) {
        const h = Number(r.timestamp.slice(11, 13));
        if (h < 0 || h > 23) continue;

        const v = Number(r.batVolt || 0);
        const a = Number(r.batCurr || 0);
        const l = Number(r.loadActive || 0);
        const pPv = Math.max(0, Number(r.pvPower || 0));

        load[h] += l * dt;
        pv[h] += pPv * dt;

        if (unit === "ah") {
          if (a > 0) {
            charged[h] += a * dt;
          } else if (a < 0) {
            discharged[h] += Math.abs(a) * dt;
          }
        } else {
          const p = v * Math.abs(a);
          if (a > 0) {
            charged[h] += p * dt;
          } else if (a < 0) {
            discharged[h] += p * dt;
          }
        }
      }

      const uniqueDays = new Set(
        dataOrRecords.map((r) => r.timestamp.slice(0, 10)).filter(Boolean)
      );
      dayCount = Math.max(1, uniqueDays.size);
    }

    // Update subtitle badge
    const subBadge = document.getElementById("statsHourlySubBadge");
    if (subBadge) {
      if (dayCount > 1) {
        subBadge.textContent = t("statsHourlyAvgDaily", { days: dayCount });
      } else {
        subBadge.textContent = t("statsHourlyTotalPerHour");
      }
    }

    const divisor = dayCount;
    const factor = unit === "ah" ? 10 : 1;
    const chargedData = charged.map((val) => Math.round((val / divisor) * factor) / factor);
    const dischargedData = discharged.map((val) => Math.round((val / divisor) * factor) / factor);
    const loadData = load.map((val) => (unit === "ah" ? 0 : Math.round(val / divisor)));

    const datasets = [
      {
        type: "bar",
        label: `${t("charge")} (${unit === "ah" ? t("unitAh") : t("unitWh")})`,
        data: chargedData,
        backgroundColor: "rgba(34, 197, 94, 0.75)",
        borderColor: "#22c55e",
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        type: "bar",
        label: `${t("discharge")} (${unit === "ah" ? t("unitAh") : t("unitWh")})`,
        data: dischargedData,
        backgroundColor: "rgba(245, 158, 11, 0.75)",
        borderColor: "#f59e0b",
        borderWidth: 1,
        borderRadius: 4,
      },
    ];

    if (unit !== "ah") {
      datasets.push({
        type: "line",
        label: `${t("loadTitle")} (${t("unitWh")})`,
        data: loadData,
        borderColor: "#7c5cff",
        backgroundColor: "rgba(124, 92, 255, 0.1)",
        borderWidth: 2,
        tension: 0.25,
        pointRadius: 0,
        fill: false,
      });
    }

    statsHourlyChartInstance = new Chart(canvas, {
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#eef0f8", boxWidth: 12, font: { size: 12 } },
          },
          tooltip: { enabled: false },
        },
        scales: {
          x: {
            ticks: {
              color: "#8c95b8",
              maxRotation: 0,
              callback: (val, idx) => (idx % 2 === 0 ? labels[idx] : ""),
            },
            grid: { display: false },
          },
          y: {
            min: 0,
            ticks: {
              display: !isMobile,
              color: "#8c95b8",
              callback: (v) => v + " " + (unit === "ah" ? t("unitAh") : t("unitWh")),
            },
            grid: { color: "rgba(255,255,255,0.05)" },
          },
        },
      },
    });

    chartInstances.push(statsHourlyChartInstance);

    // Setup Touch Scrubber & Readout Panel Underneath Hourly Bar Chart
    const hourlyLine = document.getElementById("statsHourlyScrubLine");
    const hourlyReadout = document.getElementById("statsHourlyScrubReadout");
    const hourlyTimeEl = document.getElementById("statsHourlyTime");
    const hourlyChgEl = document.getElementById("statsHourlyCharge");
    const hourlyDisEl = document.getElementById("statsHourlyDischarge");
    const hourlyLoadEl = document.getElementById("statsHourlyLoad");
    const hourlyPvEl = document.getElementById("statsHourlyPv");

    function updateHourlyReadout(hourIdx) {
      if (hourIdx < 0 || hourIdx > 23) return;
      const nextHour = (hourIdx + 1) % 24;
      if (hourlyTimeEl) {
        hourlyTimeEl.textContent = `${String(hourIdx).padStart(2, "0")}:00 – ${String(nextHour).padStart(2, "0")}:00`;
      }
      if (hourlyChgEl) {
        const cVal = chargedData[hourIdx];
        hourlyChgEl.textContent = `⚡ +${cVal} ${unit === "ah" ? t("unitAh") : t("unitWh")} (${t("charge")})`;
        hourlyChgEl.className = cVal > 0 ? "val-green" : "val-muted";
      }
      if (hourlyDisEl) {
        const dVal = dischargedData[hourIdx];
        hourlyDisEl.textContent = `🔋 ${dVal} ${unit === "ah" ? t("unitAh") : t("unitWh")} (${t("discharge")})`;
        hourlyDisEl.className = dVal > 0 ? "val-amber" : "val-muted";
      }
      if (hourlyLoadEl) {
        const lVal = Math.round(load[hourIdx] / divisor);
        hourlyLoadEl.textContent = `🏠 ${lVal} ${t("unitWh")}`;
      }
      if (hourlyPvEl) {
        hourlyPvEl.textContent = `☀️ ${Math.round(pv[hourIdx] / divisor)} ${t("unitWh")}`;
      }
      if (hourlyReadout) hourlyReadout.classList.add("is-active");
    }

    const activeHour = new Date().getHours();
    updateHourlyReadout(activeHour);

    setupScrubber({
      chart: statsHourlyChartInstance,
      canvas: canvas,
      lineEl: hourlyLine,
      readoutEl: hourlyReadout,
      records: hours.map((h) => ({ hour: h })),
      onScrub: (_, idx) => updateHourlyReadout(idx),
    });
  }

  // Global namespace export
  global.SmartESS = global.SmartESS || {};
  global.SmartESS.Charts = {
    renderAllCharts,
    renderDailyStatsChart,
    renderHourlyStatsChart,
    setStatsUnit,
    setLoadBatUnit,
    getLoadBatUnit: () => currentLoadBatUnit,
    zoomChart,
    resetZoom,
    resizeCharts,
    destroyCharts,
    getInstances: () => chartInstances,
  };
})(typeof window !== "undefined" ? window : globalThis);
