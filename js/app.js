/**
 * SmartESS Web - Application UI & Orchestration Logic
 */
(function (global) {
  let fullChronoRecords = [];
let activeRange = "all";
let lastLiveRecord = null;
let currentDev = null;

// Element references
const datePicker = document.getElementById("datePicker");
const dateDisplayWrap = document.getElementById("dateDisplayWrap");
const dateDisplayText = document.getElementById("dateDisplayText");
const prevDayBtn = document.getElementById("prevDayBtn");
const nextDayBtn = document.getElementById("nextDayBtn");
const todayBtn = document.getElementById("todayBtn");
const infographicDateLabel = document.getElementById("infographicDateLabel");
const langSelect = document.getElementById("langSelect");
const deviceSelect = document.getElementById("deviceSelect");
const errorBox = document.getElementById("errorBox");
const loginModal = document.getElementById("loginModal");
const loginError = document.getElementById("loginError");
const inpUser = document.getElementById("inpUser");
const inpPass = document.getElementById("inpPass");
const loginSubmit = document.getElementById("loginSubmit");
const logoutBtn = document.getElementById("logoutBtn");
const closeModal = document.getElementById("closeModal");
const accountBtn = document.getElementById("accountBtn");
const refreshBtn = document.getElementById("refreshBtn");
const resetZoomBtn = document.getElementById("resetZoomBtn");
const rangeButtons = document.getElementById("rangeButtons");

// Tab Elements
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanes = {
  tabMain: document.getElementById("tabMain"),
  tabAdvanced: document.getElementById("tabAdvanced"),
};

// Power Banner Elements
const powerBanner = document.getElementById("powerBanner");
const bannerIcon = document.getElementById("bannerIcon");
const bannerTitle = document.getElementById("bannerTitle");
const bannerSub = document.getElementById("bannerSub");
const bannerBadge = document.getElementById("bannerBadge");

// Main KPI Elements
const gridVoltEl = document.getElementById("gridVolt");
const gridDetailsEl = document.getElementById("gridDetails");
const gridStatusBadge = document.getElementById("gridStatusBadge");

const batSocEl = document.getElementById("batSoc");
const batBarFill = document.getElementById("batBarFill");
const batVisualFill = document.getElementById("batVisualFill");
const batChargeIcon = document.getElementById("batChargeIcon");
const batPowerRate = document.getElementById("batPowerRate");
const batStateBadge = document.getElementById("batStateBadge");
const batDetailsEl = document.getElementById("batDetails");

const loadPowerEl = document.getElementById("loadPower");
const loadDetailsEl = document.getElementById("loadDetails");
const loadBadge = document.getElementById("loadBadge");

// Grid Infographic Elements
const statGridOnline = document.getElementById("statGridOnline");
const statGridOffline = document.getElementById("statGridOffline");
const statGridVoltRange = document.getElementById("statGridVoltRange");
const statGridBatRange = document.getElementById("statGridBatRange");
const gridTimelineRibbon = document.getElementById("gridTimelineRibbon");

// Initialize localization
if (window.SmartESS?.I18n) {
  SmartESS.I18n.initLanguage();
  SmartESS.I18n.applyI18nToDOM();
}

const t = (k, p) =>
  window.SmartESS?.I18n?.t ? window.SmartESS.I18n.t(k, p) : k;

// Set default date to today and limit max date to today
const todayInitialStr = new Date().toLocaleDateString("en-CA");
if (datePicker) {
  datePicker.value = todayInitialStr;
  datePicker.max = todayInitialStr;
}

function showError(msg) {
  if (!errorBox) return;
  errorBox.textContent = msg;
  errorBox.style.display = msg ? "block" : "none";
}

function openLoginModal() {
  const s = SmartESS.API.getState();
  if (inpUser) inpUser.value = s.usr || "";
  if (inpPass) inpPass.value = s.pwd || "";
  if (loginError) loginError.style.display = "none";
  if (loginModal && !loginModal.open) loginModal.showModal();
}
global.openLoginModal = openLoginModal;

function closeLoginModal() {
  if (loginModal && loginModal.open) loginModal.close();
}

function renderDeviceSelector(devices, selectedIdx) {
  if (!deviceSelect) return;
  deviceSelect.innerHTML = "";
  devices.forEach((d, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    const snTail = String(d.sn || "").slice(-6);
    opt.textContent = snTail ? `${d.alias} (${snTail})` : d.alias;
    if (idx === selectedIdx) opt.selected = true;
    deviceSelect.appendChild(opt);
  });
  deviceSelect.style.display = devices.length > 1 ? "inline-block" : "none";
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} ${t("unitMin")}`;
  return m > 0
    ? `${h} ${t("unitHours")} ${m} ${t("unitMin")}`
    : `${h} ${t("unitHours")}`;
}

function getMinuteOfDay(ts) {
  const parts = ts.split(" ");
  if (parts.length < 2) return 0;
  const [h, m] = parts[1].split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatDateDisplay(dateStr) {
  const todayStr = new Date().toLocaleDateString("en-CA");
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date(todayStr + "T00:00:00");
  const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));

  const months = window.SmartESS?.I18n?.getMonths
    ? window.SmartESS.I18n.getMonths()
    : [
        "янв.",
        "февр.",
        "марта",
        "апр.",
        "мая",
        "июня",
        "июля",
        "авг.",
        "сент.",
        "окт.",
        "нояб.",
        "дек.",
      ];
  const formatted = `${d.getDate()} ${months[d.getMonth()]}`;

  if (diffDays === 0) return `${t("today")}, ${formatted}`;
  if (diffDays === -1) return `${t("yesterday")}, ${formatted}`;
  if (diffDays === -2) return `${t("beforeYesterday")}, ${formatted}`;
  return `${formatted}${d.getFullYear() !== today.getFullYear() ? " " + d.getFullYear() : ""}`;
}

function updateDateControls(dateStr) {
  const todayStr = new Date().toLocaleDateString("en-CA");
  if (dateDisplayText) {
    dateDisplayText.textContent = formatDateDisplay(dateStr);
  }
  if (infographicDateLabel) {
    infographicDateLabel.textContent = formatDateDisplay(dateStr);
  }
  if (todayBtn) {
    todayBtn.classList.toggle("is-today", dateStr === todayStr);
  }
  if (nextDayBtn) {
    nextDayBtn.disabled = dateStr >= todayStr;
  }
}

function stepDate(days) {
  const cur = new Date(
    (datePicker.value || new Date().toLocaleDateString("en-CA")) + "T00:00:00",
  );
  cur.setDate(cur.getDate() + days);
  const nextStr = cur.toLocaleDateString("en-CA");
  const todayStr = new Date().toLocaleDateString("en-CA");
  if (nextStr > todayStr) return;
  datePicker.value = nextStr;
  updateDateControls(nextStr);
  loadDashboard();
}

/**
 * Always fetches the current reading at this moment for the live status cards
 */
async function fetchLiveTelemetry(dev) {
  const today = new Date().toLocaleDateString("en-CA");
  const todayDat = await SmartESS.API.publicApiCall(
    `action=queryDeviceDataOneDayPaging&pn=${dev.pn}&sn=${dev.sn}&devcode=${dev.devcode}&devaddr=${dev.devaddr}&date=${today}&page=0&pagesize=5&i18n=en_US`,
  );
  if (!todayDat) return null;
  const rows = SmartESS.API.parseRows(todayDat);
  return rows[0] || null;
}

/**
 * Updates the Hero Banner and KPI Cards
 */
function renderKPI(latest, dev) {
  lastLiveRecord = latest;
  currentDev = dev;

  const model = latest.model || dev.alias;
  const lastUpdateEl = document.getElementById("lastUpdate");
  if (lastUpdateEl) {
    lastUpdateEl.textContent = `${model} (${dev.sn || "—"}) · ${t("updatedAt")}: ${latest.timestamp}`;
  }

  const gridV = Number(latest.gridVolt || 0);
  const gridF = Number(latest.gridFreq || 0);
  const gridA = Number(latest.gridCurr || 0);

  const batV = Number(latest.batVolt || 0);
  const batA = Number(latest.batCurr || 0);
  const batW = Math.round(batV * batA);
  const batSoc = Number(latest.batSoc || 0);

  const activeW = Math.max(0, Number(latest.loadActive || 0));

  const isGridAvailable = gridV >= 50;

  // 1. Power Source Banner
  if (powerBanner) {
    if (isGridAvailable) {
      powerBanner.className = "power-banner mode-grid";
      if (bannerIcon) bannerIcon.textContent = "⚡";
      if (bannerTitle) bannerTitle.textContent = t("bannerGridTitle");
      if (bannerSub) {
        const chgNote = batW > 25 ? t("bannerGridChg", { w: batW }) : "";
        const modeDesc = window.SmartESS?.I18n?.translateMode
          ? window.SmartESS.I18n.translateMode(latest.mode)
          : latest.mode || "Line Mode";
        bannerSub.textContent = t("bannerGridSub", {
          v: gridV,
          f: gridF,
          chg: chgNote,
          mode: modeDesc,
        });
      }
      if (bannerBadge) {
        bannerBadge.textContent = t("bannerGridBadge");
      }
    } else {
      powerBanner.className = "power-banner mode-battery";
      if (bannerIcon) bannerIcon.textContent = "🔋";
      if (bannerTitle) bannerTitle.textContent = t("bannerBatTitle");
      if (bannerSub) {
        bannerSub.textContent = t("bannerBatSub", { load: activeW, bat: batW });
      }
      if (bannerBadge) {
        bannerBadge.textContent = t("bannerBatBadge");
      }
    }
  }

  // 2. Grid Card
  if (gridVoltEl) {
    gridVoltEl.textContent = `${gridV} В`;
    gridVoltEl.className = isGridAvailable
      ? "card-value val-blue"
      : "card-value val-red";
  }
  if (gridDetailsEl) {
    gridDetailsEl.textContent = t("gridDetails", { f: gridF, a: gridA });
  }
  if (gridStatusBadge) {
    gridStatusBadge.textContent = isGridAvailable
      ? t("gridOnline")
      : t("gridOffline");
    gridStatusBadge.className = isGridAvailable
      ? "card-badge badge-green"
      : "card-badge badge-red";
  }

  // 3. Battery Card & Visual Representation
  if (batSocEl) batSocEl.textContent = `${batSoc} %`;
  const fillPct = `${Math.min(100, Math.max(0, batSoc))}%`;
  let fillColor = "var(--green)";
  if (batSoc < 20) {
    fillColor = "var(--red)";
  } else if (batSoc < 50) {
    fillColor = "var(--amber)";
  }

  if (batVisualFill) {
    batVisualFill.style.width = fillPct;
    batVisualFill.style.background = fillColor;
  }
  if (batBarFill) {
    batBarFill.style.width = fillPct;
    batBarFill.style.background = fillColor;
  }

  const isCharging = batW > 25;
  const isDischarging = batW < -25;

  if (batChargeIcon) {
    batChargeIcon.style.display = isCharging ? "block" : "none";
  }

  if (batPowerRate) {
    if (isCharging) {
      batPowerRate.textContent = t("chargingState", { w: batW });
      batPowerRate.className = "battery-sub-state val-green";
    } else if (isDischarging) {
      batPowerRate.textContent = t("dischargingState", { w: batW });
      batPowerRate.className =
        batSoc < 25
          ? "battery-sub-state val-red"
          : "battery-sub-state val-amber";
    } else {
      batPowerRate.textContent = t("bufferState");
      batPowerRate.className = "battery-sub-state val-blue";
    }
  }

  if (batStateBadge) {
    if (isCharging) {
      batStateBadge.textContent = `${t("charge")} (+${batW} Вт)`;
      batStateBadge.className = "card-badge badge-green";
    } else if (isDischarging) {
      batStateBadge.textContent = `${t("discharge")} (${batW} Вт)`;
      batStateBadge.className =
        batSoc < 25 ? "card-badge badge-red" : "card-badge badge-amber";
    } else {
      batStateBadge.textContent = t("buffer");
      batStateBadge.className = "card-badge badge-blue";
    }
  }

  if (batDetailsEl) {
    batDetailsEl.textContent = t("batteryDetails", {
      v: batV.toFixed(1),
      a: (batA > 0 ? "+" : "") + batA,
    });
  }

  // 4. Load Card
  if (loadPowerEl) loadPowerEl.textContent = `${activeW} Вт`;
  if (loadDetailsEl) {
    loadDetailsEl.textContent = t("loadDetails", { v: latest.outVolt });
  }
  if (loadBadge) {
    if (activeW > 4500) {
      loadBadge.textContent = t("loadHigh");
      loadBadge.className = "card-badge badge-red";
    } else {
      loadBadge.textContent = t("loadNormal");
      loadBadge.className = "card-badge badge-blue";
    }
  }

  // 5. Advanced KPIs
  const pvPowerEl = document.getElementById("pvPower");
  if (pvPowerEl) pvPowerEl.textContent = `${latest.pvPower} Вт`;
  const pvDetailsEl = document.getElementById("pvDetails");
  if (pvDetailsEl) {
    pvDetailsEl.textContent = t("pvDetails", {
      v: latest.pvVolt,
      a: latest.pvCurr,
    });
  }

  const dayEnergyEl = document.getElementById("dayEnergy");
  if (dayEnergyEl) dayEnergyEl.textContent = `PV: ${latest.dayPvKwh} кВт·год`;
  const dayEnergyDetailsEl = document.getElementById("dayEnergyDetails");
  if (dayEnergyDetailsEl) {
    const batChg = (Number(latest.dayBatChgWh || 0) / 1000).toFixed(2);
    const batDis = (Number(latest.dayBatDisWh || 0) / 1000).toFixed(2);
    dayEnergyDetailsEl.textContent = t("dayEnergyDetails", {
      g: latest.dayGridKwh,
      c: batChg,
      d: batDis,
    });
  }

  const invTempEl = document.getElementById("invTemp");
  if (invTempEl) invTempEl.textContent = `${latest.tempInv} °C`;
  const tempDetailsEl = document.getElementById("tempDetails");
  if (tempDetailsEl) {
    tempDetailsEl.textContent = t("tempDetails", {
      pv: latest.tempPv,
      b: latest.tempB,
    });
  }

  const machineStateEl = document.getElementById("machineState");
  if (machineStateEl) {
    machineStateEl.textContent = window.SmartESS?.I18n?.translateMode
      ? window.SmartESS.I18n.translateMode(latest.mode)
      : latest.mode || "Online";
  }
}

/**
 * Builds the 24-Hour Grid Availability Ribbon & Statistics
 */
function renderGridInfographic(records) {
  if (!records || records.length === 0) return;

  let totalOnlineMinutes = 0;
  let totalOfflineMinutes = 0;
  let outageIncidents = 0;
  let inOutage = false;

  let minVolt = 999;
  let maxVolt = 0;

  const segments = [];
  let currentSegment = null;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const volt = Number(r.gridVolt || 0);
    const minute = getMinuteOfDay(r.timestamp);

    let state = "online";
    if (volt < 50) {
      state = "offline";
    } else if (volt < 180 || volt > 255) {
      state = "warning";
    }

    if (volt >= 50) {
      minVolt = Math.min(minVolt, volt);
      maxVolt = Math.max(maxVolt, volt);
      totalOnlineMinutes += 5;
      if (inOutage) {
        inOutage = false;
      }
    } else {
      totalOfflineMinutes += 5;
      if (!inOutage) {
        inOutage = true;
        outageIncidents++;
      }
    }

    if (!currentSegment || currentSegment.state !== state) {
      if (currentSegment) {
        currentSegment.endMinute = minute;
        segments.push(currentSegment);
      }
      currentSegment = {
        state,
        startMinute: minute,
        endMinute: minute + 5,
        startTime: r.timestamp.slice(11, 16),
        endTime: r.timestamp.slice(11, 16),
      };
    } else {
      currentSegment.endMinute = minute + 5;
      currentSegment.endTime = r.timestamp.slice(11, 16);
    }
  }

  if (currentSegment) {
    segments.push(currentSegment);
  }

  // Update summary stats
  if (statGridOnline) {
    statGridOnline.textContent = t("statGridOnline", {
      val: formatDuration(totalOnlineMinutes),
    });
  }
  if (statGridOffline) {
    statGridOffline.textContent = t("statGridOffline", {
      val: formatDuration(totalOfflineMinutes),
      n: outageIncidents,
    });
  }
  if (statGridVoltRange) {
    statGridVoltRange.textContent =
      minVolt < 999
        ? t("statGridVoltRange", { min: minVolt, max: maxVolt })
        : t("statGridVoltRange", { min: 0, max: 0 });
  }
  if (statGridBatRange) {
    const allSocs = records
      .map((r) => Number(r.batSoc || 0))
      .filter((v) => !isNaN(v));
    if (allSocs.length > 0) {
      const minSoc = Math.min(...allSocs);
      const maxSoc = Math.max(...allSocs);
      const valStr = minSoc === maxSoc ? `${maxSoc}%` : `${minSoc}–${maxSoc}%`;
      statGridBatRange.textContent = t("statGridBatRange", { val: valStr });
    } else {
      statGridBatRange.textContent = t("statGridBatRange", { val: "— %" });
    }
  }

  // Render Visual Ribbon
  if (gridTimelineRibbon) {
    gridTimelineRibbon.innerHTML = "";
    const totalDayMinutes = 1440;

    segments.forEach((seg) => {
      const segDuration = Math.max(5, seg.endMinute - seg.startMinute);
      const leftPct = (seg.startMinute / totalDayMinutes) * 100;
      const widthPct = (segDuration / totalDayMinutes) * 100;

      const el = document.createElement("div");
      el.className = `timeline-segment seg-${seg.state}`;
      el.style.left = `${leftPct.toFixed(2)}%`;
      el.style.width = `${widthPct.toFixed(2)}%`;

      const statusDesc =
        seg.state === "online"
          ? t("statusOnline")
          : seg.state === "warning"
            ? t("statusWarning")
            : t("statusOffline");

      el.title = `${seg.startTime} – ${seg.endTime} (${formatDuration(segDuration)}): ${statusDesc}`;
      gridTimelineRibbon.appendChild(el);
    });
  }
}

function renderRawTable(descRecords) {
  const rowCountLabel = document.getElementById("rowCountLabel");
  if (rowCountLabel) rowCountLabel.textContent = descRecords.length;

  const tbody = document.getElementById("rawTableBody");
  if (!tbody) return;

  tbody.innerHTML = descRecords
    .map(
      (r) => `
    <tr>
      <td>${r.timestamp.slice(11)}</td>
      <td>${window.SmartESS?.I18n?.translateMode ? window.SmartESS.I18n.translateMode(r.mode) : r.mode}</td>
      <td>${r.pvPower}</td>
      <td>${r.pvVolt}</td>
      <td>${r.loadVA} / ${Math.max(0, Number(r.loadActive || 0))}</td>
      <td>${r.batSoc}%</td>
      <td>${r.batVolt}</td>
      <td>${r.batCurr}</td>
      <td>${r.gridVolt} / ${r.gridFreq}</td>
      <td>${r.outVolt}</td>
      <td>${r.tempInv}</td>
    </tr>
  `,
    )
    .join("");
}

function applyRangeAndRender() {
  let filtered = fullChronoRecords;
  if (activeRange !== "all") {
    const [startH, endH] = activeRange.split("-").map(Number);
    filtered = fullChronoRecords.filter((r) => {
      const hour = Number(r.timestamp.slice(11, 13));
      return hour >= startH && hour < endH;
    });
  }
  SmartESS.Charts.renderAllCharts(filtered);
  renderGridInfographic(fullChronoRecords);
  renderRawTable([...filtered].reverse());
}

async function loadDashboard() {
  const state = SmartESS.API.getState();
  if (!state.usr || !state.pwd) {
    openLoginModal();
    return;
  }

  showError("");
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = t("loading");
  }

  try {
    const devices = await SmartESS.API.discoverDevices();
    if (!devices.length) return;

    const idx = Math.min(state.selectedIdx || 0, devices.length - 1);
    renderDeviceSelector(devices, idx);
    const dev = devices[idx];

    const todayStr = new Date().toLocaleDateString("en-CA");
    const selectedDate = datePicker ? datePicker.value : todayStr;
    updateDateControls(selectedDate);

    if (selectedDate === todayStr) {
      // 1. Current Day: row[0] is the live telemetry reading at this exact moment
      const dat = await SmartESS.API.fetchFullDayData(dev, todayStr);
      if (!dat) return;
      const records = SmartESS.API.parseRows(dat);

      if (records.length === 0) {
        showError(t("noDataForDate", { date: todayStr }));
        SmartESS.Charts.destroyCharts();
        renderRawTable([]);
        return;
      }

      renderKPI(records[0], dev);
      fullChronoRecords = [...records].reverse();
      applyRangeAndRender();
    } else {
      // 2. History Mode (past date chosen):
      // Keep top Live Status cards & Banner strictly reflecting the current moment
      try {
        const live = await fetchLiveTelemetry(dev);
        if (live) {
          renderKPI(live, dev);
        }
      } catch {}

      // Fetch historical data for the chosen date for charts, infographic ribbon, and table
      const dat = await SmartESS.API.fetchFullDayData(dev, selectedDate);
      if (!dat) return;
      const records = SmartESS.API.parseRows(dat);

      if (records.length === 0) {
        showError(t("noDataForDate", { date: selectedDate }));
        SmartESS.Charts.destroyCharts();
        renderRawTable([]);
        return;
      }

      fullChronoRecords = [...records].reverse();
      applyRangeAndRender();
    }
  } catch (err) {
    showError(err.message);
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = t("refresh");
    }
  }
}

// Language Switcher Handler
if (langSelect) {
  langSelect.onchange = (e) => {
    SmartESS.I18n.setLang(e.target.value);
    updateDateControls(
      datePicker ? datePicker.value : new Date().toLocaleDateString("en-CA"),
    );
    if (lastLiveRecord && currentDev) {
      renderKPI(lastLiveRecord, currentDev);
    }
    applyRangeAndRender();
  };
}

// Tab Switching Handler
tabButtons.forEach((btn) => {
  btn.onclick = () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const targetTab = btn.dataset.tab;
    Object.keys(tabPanes).forEach((key) => {
      if (tabPanes[key]) {
        tabPanes[key].classList.toggle("active", key === targetTab);
      }
    });

    // Resize Chart.js canvases in the newly active tab
    setTimeout(() => {
      SmartESS.Charts.resizeCharts();
    }, 50);
  };
});

// Range Filter Buttons
if (rangeButtons) {
  rangeButtons.onclick = (e) => {
    const btn = e.target.closest(".range-btn");
    if (!btn) return;
    document
      .querySelectorAll(".range-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeRange = btn.dataset.range;
    applyRangeAndRender();
  };
}

// Reset Zoom across all charts
const allResetZoomButtons = [
  resetZoomBtn,
  document.getElementById("resetZoomHeaderBtn"),
  document.getElementById("resetZoomGridBtn"),
  document.getElementById("resetZoomLoadBtn"),
];
allResetZoomButtons.forEach((btn) => {
  if (btn) {
    btn.onclick = () => {
      SmartESS.Charts.resetZoom();
    };
  }
});

if (accountBtn) accountBtn.onclick = openLoginModal;
if (closeModal) closeModal.onclick = closeLoginModal;

if (logoutBtn) {
  logoutBtn.onclick = () => {
    SmartESS.API.clearState();
    openLoginModal();
  };
}

if (loginSubmit) {
  loginSubmit.onclick = async () => {
    const usr = inpUser ? inpUser.value.trim() : "";
    const pwd = inpPass ? inpPass.value : "";

    if (!usr || !pwd) {
      if (loginError) {
        loginError.textContent = t("loginErrorEmpty");
        loginError.style.display = "block";
      }
      return;
    }

    loginSubmit.disabled = true;
    loginSubmit.textContent = t("discoveringDevices");
    if (loginError) loginError.style.display = "none";

    try {
      await SmartESS.API.authenticate(usr, pwd);
      await SmartESS.API.discoverDevices(true);
      closeLoginModal();
      await loadDashboard();
    } catch (err) {
      if (loginError) {
        loginError.textContent = err.message;
        loginError.style.display = "block";
      }
    } finally {
      loginSubmit.disabled = false;
      loginSubmit.textContent = t("loginSubmit");
    }
  };
}

if (deviceSelect) {
  deviceSelect.onchange = (e) => {
    SmartESS.API.setState({ selectedIdx: Number(e.target.value) });
    loadDashboard();
  };
}

function openCalendar() {
  if (!datePicker) return;
  if (typeof datePicker.showPicker === "function") {
    try {
      datePicker.showPicker();
      return;
    } catch (err) {}
  }
  datePicker.focus();
}

if (dateDisplayWrap) {
  dateDisplayWrap.onclick = openCalendar;
}

if (prevDayBtn) prevDayBtn.onclick = () => stepDate(-1);
if (nextDayBtn) nextDayBtn.onclick = () => stepDate(1);
if (todayBtn) {
  todayBtn.onclick = () => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    if (datePicker.value !== todayStr) {
      datePicker.value = todayStr;
      updateDateControls(todayStr);
      loadDashboard();
    }
  };
}

if (refreshBtn) refreshBtn.onclick = loadDashboard;
if (datePicker) {
  datePicker.onchange = () => {
    updateDateControls(datePicker.value);
    loadDashboard();
  };
}

  // Global namespace export
  global.SmartESS = global.SmartESS || {};
  global.SmartESS.App = {
    loadDashboard,
    openLoginModal,
    closeLoginModal,
    applyRangeAndRender,
  };
  global.openLoginModal = openLoginModal;

  // Initialize
  loadDashboard();
  setInterval(loadDashboard, 5 * 60 * 1000);
})(typeof window !== "undefined" ? window : globalThis);
