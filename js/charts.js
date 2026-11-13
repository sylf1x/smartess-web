/**
 * SmartESS Web - Chart.js Visualizations & Touch/Mouse Scrubbers
 */
(function (global) {
  // Configure Hammer.js for 2-finger pinch & 2-finger pan on touch devices:
  // - 2 fingers: pinch-to-zoom in/out & slide (pan) the zoomed graph along X axis.
  // - 1 finger: strictly reserved for moving the white crosshair line without moving the graph.
  if (typeof Hammer !== "undefined" && Hammer.Pan && Hammer.Pan.prototype) {
    const origPanAttrTest = Hammer.Pan.prototype.attrTest;
    Hammer.Pan.prototype.attrTest = function (input) {
      const isTouch =
        input.pointerType === "touch" ||
        (input.srcEvent && input.srcEvent.type && input.srcEvent.type.startsWith("touch"));
      if (isTouch) {
        if (!input.pointers || input.pointers.length !== 2) {
          return false;
        }
        const stateBegan = Hammer.STATE_BEGAN || 2;
        return (this.state & stateBegan) || (!(this.state & stateBegan) && this.directionTest(input));
      }
      return origPanAttrTest.call(this, input);
    };

    if (Hammer.Manager && Hammer.Manager.prototype) {
      const origAdd = Hammer.Manager.prototype.add;
      Hammer.Manager.prototype.add = function (recognizer) {
        const res = origAdd.apply(this, arguments);
        const pinch = this.get("pinch");
        const pan = this.get("pan");
        if (pinch && pan) {
          pinch.recognizeWith(pan);
          pan.recognizeWith(pinch);
        }
        return res;
      };
    }
  }

  let chartInstances = [];
  let scrubberCleanups = [];
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
  }

  function destroyCharts() {
    cleanupScrubbers();
    chartInstances.forEach((c) => {
      try {
        c.destroy();
      } catch {}
    });
    chartInstances = [];
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
      }
    });
  }

  function setupScrubber({ chart, canvas, lineEl, readoutEl, records, onScrub }) {
    if (!canvas || !chart || !records || records.length === 0) return;

    const ac = new AbortController();
    const signal = ac.signal;
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
    let startX = 0;
    let startY = 0;
    let isHorizontal = false;

    canvas.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length === 1) {
          isTouching = true;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          isHorizontal = false;
          handleScrub(startX);
        } else {
          isTouching = false;
        }
      },
      { passive: true, signal }
    );

    canvas.addEventListener(
      "touchmove",
      (e) => {
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
      () => {
        isTouching = false;
        isHorizontal = false;
        handleEnd();
      },
      { passive: true, signal }
    );

    canvas.addEventListener(
      "touchcancel",
      () => {
        isTouching = false;
        isHorizontal = false;
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
  }

  function renderAllCharts(records) {
    destroyCharts();

    if (!records || records.length === 0) return;

    const t = window.SmartESS?.I18n?.t || window.t || ((k) => k);
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

    const labels = records.map((r) => r.timestamp.slice(11, 16));

    const pvPower = records.map((r) => Number(r.pvPower || 0));
    const loadActive = records.map((r) => Math.max(0, Number(r.loadActive || 0)));
    const loadVA = records.map((r) => Math.max(0, Number(r.loadVA || 0)));
    const batPower = records.map((r) =>
      Math.round(Number(r.batVolt || 0) * Number(r.batCurr || 0))
    );

    const batSoc = records.map((r) => Number(r.batSoc || 0));
    const batVolt = records.map((r) => Number(r.batVolt || 0));
    const batCurr = records.map((r) => Number(r.batCurr || 0));

    // AC Load Current (Amperes): use hardware-fetched loadCurr if present, with fallback
    const loadCurr = records.map((r) => {
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
      ? batCurr.map((c) => Math.abs(c))
      : batPower.map((p) => Math.abs(p));
    const loadUnitStr = isLoadBatAmps ? t("unitA") : t("unitW");

    // Dynamic Title for Load & Battery History
    const loadBatTitleEl = document.getElementById("loadBatHistoryTitle");
    if (loadBatTitleEl) {
      const baseTitle = t("loadBatHistoryBase") || t("loadBatHistoryTitle");
      loadBatTitleEl.textContent = `${baseTitle} (${loadUnitStr})`;
    }

    const gridVolt = records.map((r) => Number(r.gridVolt || 0));
    const gridFreq = records.map((r) => Number(r.gridFreq || 0));

    const tempInv = records.map((r) => Number(r.tempInv || 0));
    const tempB = records.map((r) => Number(r.tempB || 0));
    const tempPv = records.map((r) => Number(r.tempPv || 0));

    const maxVal = (arr) => (arr.length ? Math.max(...arr) : 0);

    // Stats updates for cards
    const loadBatStatsEl = document.getElementById("loadBatStats");
    if (loadBatStatsEl) {
      const maxLoadW = maxVal(loadActive);
      const maxLoadA = maxVal(loadCurr);
      const maxChgW = Math.max(0, ...batPower);
      const maxChgA = Math.max(0, ...batCurr);
      const maxDisW = Math.abs(Math.min(0, ...batPower));
      const maxDisA = Math.abs(Math.min(0, ...batCurr));

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
      powerStatsEl.textContent = `${t("peakPv")}: ${maxVal(pvPower)} ${t("unitW")} · ${t("peakLoad")}: ${maxVal(loadVA)} ${t("unitVa")}`;
    }

    const tempStatsEl = document.getElementById("tempStats");
    if (tempStatsEl) {
      tempStatsEl.textContent = `${t("maxInv")}: ${maxVal(tempInv)} ${t("unitDeg")} · PV: ${maxVal(tempPv)} ${t("unitDeg")}`;
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
            x: { min: "original", max: "original" },
          },
          pan: {
            enabled: true,
            mode: "x",
            threshold: 8,
            onPanStart({ event }) {
              if (
                event &&
                (event.pointerType === "touch" ||
                  (event.srcEvent && event.srcEvent.type && event.srcEvent.type.startsWith("touch")))
              ) {
                if (!event.pointers || event.pointers.length !== 2) {
                  return false;
                }
              }
            },
          },
          zoom: {
            wheel: { enabled: true, speed: 0.1 },
            pinch: { enabled: true },
            drag: {
              enabled: !isMobile,
              backgroundColor: "rgba(124, 92, 255, 0.2)",
              borderColor: "#7c5cff",
              borderWidth: 1,
            },
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
              display: !isMobile,
              ticks: {
                display: !isMobile,
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
              display: !isMobile,
              ticks: {
                display: !isMobile,
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
        records,
        onScrub: updateGridReadout,
      });
    }

    // 2. Load & Battery Power Chart (Main Tab)
    const loadBatCanvas = document.getElementById("loadBatChart");
    let loadBatChartInstance = null;
    if (loadBatCanvas) {
      loadBatChartInstance = new Chart(loadBatCanvas, {
        type: "line",
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
                  return rawVal < 0 ? "#f59e0b" : "#22c55e";
                },
              },
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 1.8,
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
        records,
        onScrub: updateLoadBatReadout,
      });
    }

    // 3. Full Power Balance Chart (Advanced Tab)
    const powerCanvas = document.getElementById("powerChart");
    let powerChartInstance = null;
    if (powerCanvas) {
      powerChartInstance = new Chart(powerCanvas, {
        type: "line",
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
            },
            {
              label: t("chartLoadActive"),
              data: loadActive,
              borderColor: "#38bdf8",
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 1.5,
              borderDash: [4, 3],
            },
            {
              label: t("chartBat"),
              data: batPower,
              borderColor: "#22c55e",
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 1.8,
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
        records,
        onScrub: updatePowerReadout,
      });
    }

    // 4. Thermal Profile Chart (Advanced Tab)
    const tempCanvas = document.getElementById("tempChart");
    let tempChartInstance = null;
    if (tempCanvas) {
      tempChartInstance = new Chart(tempCanvas, {
        type: "line",
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
            },
            {
              label: t("chartTempB"),
              data: tempB,
              borderColor: "#7c5cff",
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 2,
            },
            {
              label: t("chartTempPv"),
              data: tempPv,
              borderColor: "#f59e0b",
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 2,
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
        records,
        onScrub: updateTempReadout,
      });
    }

    // 5. Hourly Battery Energy Distribution Chart (Statistics Tab)
    renderHourlyStatsChart(records, currentStatsUnit);
  }

  let statsHourlyChartInstance = null;
  let currentStatsUnit = "wh";

  function setStatsUnit(unit) {
    currentStatsUnit = unit;
  }

  function renderHourlyStatsChart(records, unit = currentStatsUnit) {
    currentStatsUnit = unit;
    const canvas = document.getElementById("statsHourlyChart");
    if (!canvas) return;

    if (statsHourlyChartInstance) {
      try {
        statsHourlyChartInstance.destroy();
      } catch {}
      statsHourlyChartInstance = null;
    }

    if (!records || records.length === 0) return;

    const t = window.SmartESS?.I18n?.t || window.t || ((k) => k);
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

    // Hourly aggregation for 24 hours (00 to 23)
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const labels = hours.map((h) => String(h).padStart(2, "0") + ":00");
    const charged = new Array(24).fill(0);
    const discharged = new Array(24).fill(0);
    const load = new Array(24).fill(0);

    const dt = 5 / 60; // 5 min interval in hours

    for (const r of records) {
      const h = Number(r.timestamp.slice(11, 13));
      if (h < 0 || h > 23) continue;

      const v = Number(r.batVolt || 0);
      const a = Number(r.batCurr || 0);
      const l = Number(r.loadActive || 0);

      load[h] += l * dt;

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

    // Count unique days in records to handle multi-day vs single-day correctly
    const uniqueDays = new Set(
      records.map((r) => r.timestamp.slice(0, 10)).filter(Boolean)
    );
    const dayCount = Math.max(1, uniqueDays.size);

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
          tooltip: {
            enabled: true,
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "#e2e8f0",
            bodyColor: "#e2e8f0",
            borderColor: "rgba(255, 255, 255, 0.15)",
            borderWidth: 1,
            padding: 10,
            boxPadding: 4,
            callbacks: {
              title: (items) => {
                const hourIdx = items[0].dataIndex;
                const nextHour = (hourIdx + 1) % 24;
                const timeStr = `${String(hourIdx).padStart(2, "0")}:00 – ${String(nextHour).padStart(2, "0")}:00`;
                const modeStr = dayCount > 1
                  ? ` (${t("statsHourlyAvgDaily", { days: dayCount })})`
                  : ` (${t("statsHourlyTotalPerHour")})`;
                return `${timeStr} · ${modeStr}`;
              },
              label: (item) =>
                ` ${item.dataset.label}: ${item.parsed.y} ${unit === "ah" ? t("unitAh") : t("unitWh")}`,
            },
          },
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
        let pvSum = 0;
        for (const r of records) {
          if (Number(r.timestamp.slice(11, 13)) === hourIdx) {
            pvSum += Math.max(0, Number(r.pvPower || 0)) * (5 / 60);
          }
        }
        hourlyPvEl.textContent = `☀️ ${Math.round(pvSum / divisor)} ${t("unitWh")}`;
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
    renderHourlyStatsChart,
    setStatsUnit,
    setLoadBatUnit,
    getLoadBatUnit: () => currentLoadBatUnit,
    resetZoom,
    resizeCharts,
    destroyCharts,
    getInstances: () => chartInstances,
  };
})(typeof window !== "undefined" ? window : globalThis);
