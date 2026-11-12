/**
 * SmartESS Web - Chart.js Visualizations & Touch/Mouse Scrubbers
 */
(function (global) {
  let chartInstances = [];
  let scrubberCleanups = [];

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

  function resetZoom() {
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
      if (lineEl) {
        lineEl.classList.remove("is-visible");
      }
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
    const isMobile =
      typeof window !== "undefined" &&
      (window.innerWidth <= 768 || "ontouchstart" in window);

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

    const gridVolt = records.map((r) => Number(r.gridVolt || 0));
    const gridFreq = records.map((r) => Number(r.gridFreq || 0));

    const tempInv = records.map((r) => Number(r.tempInv || 0));
    const tempB = records.map((r) => Number(r.tempB || 0));
    const tempPv = records.map((r) => Number(r.tempPv || 0));

    const maxVal = (arr) => (arr.length ? Math.max(...arr) : 0);

    // Stats updates for cards
    const loadBatStatsEl = document.getElementById("loadBatStats");
    if (loadBatStatsEl) {
      const maxChg = Math.max(0, ...batPower);
      const maxDis = Math.abs(Math.min(0, ...batPower));
      let batStatText = "";
      if (maxChg > 0 && maxDis > 0) {
        batStatText = `${t("charge")}: +${maxChg} ${t("unitW")} · ${t("discharge")}: -${maxDis} ${t("unitW")}`;
      } else if (maxChg > 0) {
        batStatText = `${t("peakCharge")}: +${maxChg} ${t("unitW")}`;
      } else if (maxDis > 0) {
        batStatText = `${t("peakDischarge")}: -${maxDis} ${t("unitW")}`;
      }
      loadBatStatsEl.textContent = `${t("peakLoad")}: ${maxVal(loadActive)} ${t("unitW")}${batStatText ? " · " + batStatText : ""}`;
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
          pan: {
            enabled: !isMobile,
            mode: "x",
          },
          zoom: {
            pinch: {
              enabled: false,
            },
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
              ticks: {
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
              ticks: {
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
              label: t("chartLoad"),
              data: loadActive,
              borderColor: "#7c5cff",
              backgroundColor: "rgba(124, 92, 255, 0.16)",
              fill: true,
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 2,
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
        if (loadBatLoadEl) {
          const loadW = Math.max(0, Number(rec.loadActive || 0));
          loadBatLoadEl.textContent = `🏠 ${loadW} ${t("unitW")}`;
          loadBatLoadEl.className = loadW > 3000 ? "val-amber" : "val-purple";
        }
        if (loadBatBatEl) {
          const bp = Math.round(Number(rec.batVolt || 0) * Number(rec.batCurr || 0));
          if (bp > 0) {
            loadBatBatEl.textContent = `🔋 +${bp} ${t("unitW")} (${t("charge")})`;
            loadBatBatEl.className = "val-green";
          } else if (bp < 0) {
            loadBatBatEl.textContent = `🔋 ${bp} ${t("unitW")} (${t("discharge")})`;
            loadBatBatEl.className = Math.abs(bp) > 2000 ? "val-red" : "val-amber";
          } else {
            loadBatBatEl.textContent = `🔋 0 ${t("unitW")} (${t("buffer")})`;
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
          powerPvEl.textContent = `☀️ ${t("scrubPv")}: ${rec.pvPower} ${t("unitW")}`;
        }
        if (powerVaEl) {
          powerVaEl.textContent = `⚡ ${t("scrubVa")}: ${rec.loadVA} ${t("unitVa")}`;
        }
        if (powerLoadEl) {
          const loadW = Math.max(0, Number(rec.loadActive || 0));
          powerLoadEl.textContent = `🏠 ${t("scrubLoad")}: ${loadW} ${t("unitW")}`;
          powerLoadEl.className = loadW > 3000 ? "val-amber" : "val-blue";
        }
        if (powerBatEl) {
          const bp = Math.round(Number(rec.batVolt || 0) * Number(rec.batCurr || 0));
          if (bp > 0) {
            powerBatEl.textContent = `🔋 ${t("scrubBat")}: +${bp} ${t("unitW")}`;
            powerBatEl.className = "val-green";
          } else if (bp < 0) {
            powerBatEl.textContent = `🔋 ${t("scrubBat")}: ${bp} ${t("unitW")}`;
            powerBatEl.className = Math.abs(bp) > 2000 ? "val-red" : "val-amber";
          } else {
            powerBatEl.textContent = `🔋 ${t("scrubBat")}: 0 ${t("unitW")}`;
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
  }

  // Global namespace export
  global.SmartESS = global.SmartESS || {};
  global.SmartESS.Charts = {
    renderAllCharts,
    resetZoom,
    resizeCharts,
    destroyCharts,
    getInstances: () => chartInstances,
  };
})(typeof window !== "undefined" ? window : globalThis);
