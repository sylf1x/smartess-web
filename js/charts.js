/**
 * SmartESS Web - Chart.js Visualizations & Zoom Controls
 */
(function (global) {
  let chartInstances = [];

function destroyCharts() {
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

function renderAllCharts(records) {
  destroyCharts();

  if (!records || records.length === 0) return;

  const t = (window.SmartESS?.I18n?.t) || window.t || ((k) => k);

  const labels = records.map((r) => r.timestamp.slice(11, 16));
  const modes = records.map((r) =>
    window.SmartESS?.I18n?.translateMode ? window.SmartESS.I18n.translateMode(r.mode) : r.mode
  );

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
  const minVal = (arr) => (arr.length ? Math.min(...arr) : 0);

  // Stats updates for cards
  const loadBatStatsEl = document.getElementById("loadBatStats");
  if (loadBatStatsEl) {
    const maxChg = Math.max(0, ...batPower);
    const maxDis = Math.abs(Math.min(0, ...batPower));
    let batStatText = "";
    if (maxChg > 0 && maxDis > 0) {
      batStatText = `${t("charge")}: +${maxChg} Вт · ${t("discharge")}: -${maxDis} Вт`;
    } else if (maxChg > 0) {
      batStatText = `${t("peakCharge")}: +${maxChg} Вт`;
    } else if (maxDis > 0) {
      batStatText = `${t("peakDischarge")}: -${maxDis} Вт`;
    }
    loadBatStatsEl.textContent = `${t("peakLoad")}: ${maxVal(loadActive)} Вт${batStatText ? " · " + batStatText : ""}`;
  }

  const powerStatsEl = document.getElementById("powerStats");
  if (powerStatsEl) {
    powerStatsEl.textContent = `${t("peakPv")}: ${maxVal(pvPower)} Вт · ${t("peakLoad")}: ${maxVal(loadVA)} ВА`;
  }

  const tempStatsEl = document.getElementById("tempStats");
  if (tempStatsEl) {
    tempStatsEl.textContent = `${t("maxInv")}: ${maxVal(tempInv)} °C · PV: ${maxVal(tempPv)} °C`;
  }

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: { color: "#eef0f8", boxWidth: 12, font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: "#141829",
        borderColor: "#262d4a",
        borderWidth: 1,
        titleColor: "#eef0f8",
        bodyColor: "#cfd5ec",
        callbacks: {
          afterTitle: (items) => {
            const idx = items[0]?.dataIndex ?? 0;
            return modes[idx] ? `${t("modeCol")}: ${modes[idx]}` : "";
          },
        },
      },
      zoom: {
        zoom: {
          drag: {
            enabled: true,
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
  if (gridCanvas) {
    chartInstances.push(
      new Chart(gridCanvas, {
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
          plugins: {
            ...baseOptions.plugins,
            tooltip: {
              ...baseOptions.plugins.tooltip,
              callbacks: {
                ...baseOptions.plugins.tooltip.callbacks,
                label: (context) => {
                  const val = context.parsed.y;
                  const label = context.dataset.label;
                  if (label === t("chartBatSoc")) {
                    return t("tooltipBatSoc", { soc: val });
                  }
                  if (label === t("chartGridVolt")) {
                    return val < 50
                      ? t("tooltipGridOffline")
                      : t("tooltipGridOnline", { v: val });
                  }
                  if (label === t("chartGridFreq")) {
                    return t("tooltipGridFreq", { f: val });
                  }
                  return `${label}: ${val}`;
                },
              },
            },
          },
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
                callback: (v) => v + " В",
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
                callback: (v) => v + " Гц",
              },
              grid: { drawOnChartArea: false },
            },
          },
        },
      })
    );
  }

  // 2. Load & Battery Power Chart (Main Tab)
  const loadBatCanvas = document.getElementById("loadBatChart");
  if (loadBatCanvas) {
    chartInstances.push(
      new Chart(loadBatCanvas, {
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
          plugins: {
            ...baseOptions.plugins,
            tooltip: {
              ...baseOptions.plugins.tooltip,
              callbacks: {
                ...baseOptions.plugins.tooltip.callbacks,
                label: (context) => {
                  const val = context.parsed.y;
                  if (context.dataset.label === t("chartBat")) {
                    if (val > 0) return t("tooltipBatCharge", { w: val });
                    if (val < 0) return t("tooltipBatDischarge", { w: val });
                    return t("tooltipBatBuffer");
                  }
                  return `${context.dataset.label}: ${val} Вт`;
                },
              },
            },
          },
          scales: {
            ...baseOptions.scales,
            y: {
              ticks: { color: "#8c95b8" },
              grid: { color: "rgba(255,255,255,0.05)" },
            },
          },
        },
      })
    );
  }

  // 3. Full Power Balance Chart (Advanced Tab)
  const powerCanvas = document.getElementById("powerChart");
  if (powerCanvas) {
    chartInstances.push(
      new Chart(powerCanvas, {
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
      })
    );
  }

  // 4. Thermal Profile Chart (Advanced Tab)
  const tempCanvas = document.getElementById("tempChart");
  if (tempCanvas) {
    chartInstances.push(
      new Chart(tempCanvas, {
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
      })
    );
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
