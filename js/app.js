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
  tabStats: document.getElementById("tabStats"),
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
  const formatted = formatDateDisplay(dateStr);

  document.querySelectorAll(".date-display-text, #dateDisplayText, .date-display-text-stats, .date-display-text-adv").forEach((el) => {
    el.textContent = formatted;
  });
  if (infographicDateLabel) {
    infographicDateLabel.textContent = formatted;
  }
  document.querySelectorAll(".date-picker-input, #datePicker, #datePickerStats, #datePickerAdv").forEach((inp) => {
    inp.value = dateStr;
    inp.max = todayStr;
  });
  document.querySelectorAll(".today-btn, #todayBtn").forEach((btn) => {
    btn.classList.toggle("is-today", dateStr === todayStr);
  });
  document.querySelectorAll(".next-day-btn, #nextDayBtn").forEach((btn) => {
    btn.disabled = dateStr >= todayStr;
  });
}

function setDate(dateStr) {
  const todayStr = new Date().toLocaleDateString("en-CA");
  if (dateStr > todayStr) dateStr = todayStr;
  document.querySelectorAll(".date-picker-input, #datePicker, #datePickerStats, #datePickerAdv").forEach((inp) => {
    inp.value = dateStr;
    inp.max = todayStr;
  });
  updateDateControls(dateStr);

  // Automatically select the entire day (00:00 - 23:59) for Statistics tab
  statsDateFrom = dateStr;
  statsDateTo = dateStr;
  statsTimeFrom = "00:00";
  statsTimeTo = "23:59";
  statsRange = "all";

  const dFromInp = document.getElementById("statsDateFrom");
  const dToInp = document.getElementById("statsDateTo");
  const tFromInp = document.getElementById("statsTimeFrom");
  const tToInp = document.getElementById("statsTimeTo");
  if (dFromInp) {
    dFromInp.value = dateStr;
    dFromInp.max = todayStr;
  }
  if (dToInp) {
    dToInp.value = dateStr;
    dToInp.max = todayStr;
  }
  if (tFromInp) tFromInp.value = "00:00";
  if (tToInp) tToInp.value = "23:59";

  document.querySelectorAll("#statsPresetButtons .range-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.statsRange === "all");
  });
  document.querySelectorAll(".stats-outage-chip").forEach((c) => c.classList.remove("active"));

  loadDashboard();
}

function stepDate(days) {
  const currentVal = datePicker ? datePicker.value : new Date().toLocaleDateString("en-CA");
  const cur = new Date(
    (currentVal || new Date().toLocaleDateString("en-CA")) + "T00:00:00",
  );
  cur.setDate(cur.getDate() + days);
  const nextStr = cur.toLocaleDateString("en-CA");
  const todayStr = new Date().toLocaleDateString("en-CA");
  if (nextStr > todayStr) return;
  setDate(nextStr);
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

  const model = latest.model || dev.alias || "Inverter";
  const lastUpdateEl = document.getElementById("lastUpdate");
  if (lastUpdateEl) {
    const snHtml = dev.sn
      ? `<span class="dev-sn" title="S/N: ${dev.sn}">(${dev.sn})</span>`
      : "";
    lastUpdateEl.innerHTML = `
      <span class="header-dev-chip">
        <span class="dev-model">${model}</span>
        ${snHtml}
      </span>
      <span class="header-time-chip">
        <span class="time-dot"></span>
        <span class="time-label">${t("updatedAt")}:</span>
        <span class="time-val">${latest.timestamp}</span>
      </span>
    `;
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

  const rawMode = String(latest.mode || "").toLowerCase().trim();
  const isExplicitBatMode =
    rawMode.includes("battery") ||
    rawMode.includes("contravariant") ||
    rawMode.includes("inverter");
  const isExplicitLineMode =
    rawMode.includes("line") ||
    rawMode.includes("mains") ||
    rawMode.includes("bypass");

  // Determine actual power source powering the house:
  // - If grid is absent (< 50V): definitely on battery
  // - If inverter explicitly reports Battery Mode: powering from battery, even if grid voltage is present at input (e.g. SBU priority or reconnection timer)
  // - If inverter explicitly reports Line Mode: powering from grid
  // - Fallback: if battery is actively discharging into load (batW < -25), powering from battery
  const isPoweredByBattery =
    !isGridAvailable ||
    isExplicitBatMode ||
    (!isExplicitLineMode && batW < -25);

  const modeDesc = window.SmartESS?.I18n?.translateMode
    ? window.SmartESS.I18n.translateMode(latest.mode)
    : latest.mode || (isPoweredByBattery ? "Battery Mode" : "Line Mode");

  // 1. Power Source Banner
  if (powerBanner) {
    if (!isPoweredByBattery) {
      // Mains / Grid mode
      powerBanner.className = "power-banner mode-grid";
      if (bannerIcon) bannerIcon.textContent = "⚡";
      if (bannerTitle) bannerTitle.textContent = t("bannerGridTitle");
      if (bannerSub) {
        const chgNote = batW > 25 ? t("bannerGridChg", { w: batW }) : "";
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
    } else if (isGridAvailable) {
      // Battery mode, but grid voltage is present at input (e.g. SBU/SOL priority or reconnection timer)
      powerBanner.className = "power-banner mode-battery-standby";
      if (bannerIcon) bannerIcon.textContent = "🔋";
      if (bannerTitle) bannerTitle.textContent = t("bannerBatStandbyTitle");
      if (bannerSub) {
        bannerSub.textContent = t("bannerBatStandbySub", {
          load: activeW || Math.abs(batW),
          bat: Math.abs(batW),
          v: gridV,
          f: gridF,
          mode: modeDesc,
        });
      }
      if (bannerBadge) {
        bannerBadge.textContent = t("bannerBatStandbyBadge");
      }
    } else {
      // Outage mode (grid voltage is completely absent)
      powerBanner.className = "power-banner mode-battery";
      if (bannerIcon) bannerIcon.textContent = "🔴";
      if (bannerTitle) bannerTitle.textContent = t("bannerBatTitle");
      if (bannerSub) {
        bannerSub.textContent = t("bannerBatSub", {
          load: activeW || Math.abs(batW),
          bat: Math.abs(batW),
        });
      }
      if (bannerBadge) {
        bannerBadge.textContent = t("bannerBatBadge");
      }
    }
  }

  // 2. Grid Card
  if (gridVoltEl) {
    gridVoltEl.textContent = `${gridV} ${t("unitV")}`;
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
      batStateBadge.textContent = `${t("charge")} (+${batW} ${t("unitW")})`;
      batStateBadge.className = "card-badge badge-green";
    } else if (isDischarging) {
      batStateBadge.textContent = `${t("discharge")} (${batW} ${t("unitW")})`;
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
  if (loadPowerEl) loadPowerEl.textContent = `${activeW} ${t("unitW")}`;

  const rawLoadA = Number(latest.loadCurr || 0);
  const vOut = Number(latest.outVolt || 0);
  const loadVA = Number(latest.loadVA || 0);
  const loadA = rawLoadA > 0
    ? rawLoadA.toFixed(1)
    : (vOut >= 50 ? (Math.max(loadVA, activeW) / vOut).toFixed(1) : (activeW / 230).toFixed(1));

  if (loadDetailsEl) {
    loadDetailsEl.textContent = `${t("loadDetails", { v: latest.outVolt })} · ${loadA} ${t("unitA")}`;
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
  if (pvPowerEl) pvPowerEl.textContent = `${latest.pvPower} ${t("unitW")}`;
  const pvDetailsEl = document.getElementById("pvDetails");
  if (pvDetailsEl) {
    pvDetailsEl.textContent = t("pvDetails", {
      v: latest.pvVolt,
      a: latest.pvCurr,
    });
  }

  const dayEnergyEl = document.getElementById("dayEnergy");
  if (dayEnergyEl) dayEnergyEl.textContent = `PV: ${latest.dayPvKwh} ${t("unitKwh")}`;
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
  if (invTempEl) invTempEl.textContent = `${latest.tempInv} ${t("unitDeg")}`;
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
  renderStatsTab(
    fullChronoRecords,
    datePicker ? datePicker.value : new Date().toLocaleDateString("en-CA"),
  );
  renderRawTable([...filtered].reverse());
}

let statsDateFrom = new Date().toLocaleDateString("en-CA");
let statsTimeFrom = "00:00";
let statsDateTo = new Date().toLocaleDateString("en-CA");
let statsTimeTo = "23:59";
let statsRange = "all";
let currentStatsUnit = "wh";
let currentStatsRecords = [];

/**
 * Normalizes a single day's API rows (returned newest-first by server ingestion order)
 * into chronological oldest-first acquisition order. Preserving server acquisition order
 * avoids interleaving old/new timelines if the inverter clock was adjusted mid-day.
 */
function normalizeDayRecords(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const chrono = [...rows].reverse().filter(
    (r) => typeof r.timestamp === "string" && r.timestamp.length >= 16
  );
  const deduped = [];
  for (const r of chrono) {
    if (
      deduped.length === 0 ||
      deduped[deduped.length - 1].timestamp !== r.timestamp
    ) {
      deduped.push(r);
    } else {
      deduped[deduped.length - 1] = r;
    }
  }
  return deduped;
}

/**
 * Computes monotonic cumulative energy from a hardware accumulator register,
 * ignoring transient zero dropouts, tracking resets on the same calendar day,
 * and flagging oscillating/corrupted sequences (more than 3 resets in a day).
 */
function calculateAccumulatorDelta(records, fieldName, isStartOfDay = false) {
  if (!records || records.length === 0) return { total: 0, resets: 0, valid: false };
  const firstVal = Number(records[0][fieldName] || 0);
  let total = isStartOfDay && !isNaN(firstVal) && firstVal > 0 ? firstVal : 0;
  let prev = !isNaN(firstVal) && firstVal >= 0 ? firstVal : 0;
  let prevDate = String(records[0].timestamp || "").slice(0, 10);
  let resets = 0;

  for (let i = 1; i < records.length; i++) {
    const r = records[i];
    const val = Number(r[fieldName] || 0);
    if (isNaN(val) || val < 0) continue;
    const curDate = String(r.timestamp || "").slice(0, 10);

    // Ignore transient 0 dropout if subsequent non-zero reading on the same day is >= prev
    if (curDate === prevDate && val === 0 && prev > 0) {
      let nextNonZero = null;
      for (let j = i + 1; j < records.length; j++) {
        if (String(records[j].timestamp || "").slice(0, 10) !== curDate) break;
        const nv = Number(records[j][fieldName] || 0);
        if (!isNaN(nv) && nv > 0) {
          nextNonZero = nv;
          break;
        }
      }
      if (nextNonZero !== null && nextNonZero >= prev) {
        continue;
      }
    }

    if (curDate !== prevDate) {
      // Midnight boundary: new calendar day starts, accumulator rolls over
      total += val;
      prevDate = curDate;
    } else if (val >= prev) {
      // Normal accumulation within the same day
      total += (val - prev);
    } else {
      // Mid-day reset within the same day (val < prev)
      resets++;
      total += val;
    }
    prev = val;
  }
  return { total: Math.round(total), resets, valid: resets <= 3 };
}

async function getRecordsForDateRange(dev, dateFrom, dateTo) {
  if (!dev) return [];
  const selectedDate = datePicker ? datePicker.value : new Date().toLocaleDateString("en-CA");
  if (dateFrom === dateTo) {
    if (fullChronoRecords && fullChronoRecords.length > 0 && selectedDate === dateFrom) {
      return fullChronoRecords;
    }
    const dat = await SmartESS.API.fetchFullDayData(dev, dateFrom);
    if (!dat) return [];
    return normalizeDayRecords(SmartESS.API.parseRows(dat));
  }

  const cur = new Date(dateFrom + "T00:00:00");
  const end = new Date(dateTo + "T00:00:00");
  const dates = [];
  while (cur <= end) {
    dates.push(cur.toLocaleDateString("en-CA"));
    cur.setDate(cur.getDate() + 1);
    if (dates.length > 14) break;
  }

  const allDays = await Promise.all(
    dates.map(async (d) => {
      try {
        const dat = await SmartESS.API.fetchFullDayData(dev, d);
        if (!dat) return [];
        return normalizeDayRecords(SmartESS.API.parseRows(dat));
      } catch {
        return [];
      }
    })
  );

  return allDays.flat();
}

function calculateBatteryStats(records, fromStr = "00:00", toStr = "23:59") {
  if (!records || records.length === 0) return null;

  const filtered = records.filter((r) => {
    if (fromStr.length <= 5) {
      const time = r.timestamp.slice(11, 16);
      return time >= fromStr && time <= toStr;
    }
    const ts = r.timestamp.slice(0, 16);
    return ts >= fromStr && ts <= toStr;
  });

  if (filtered.length === 0) {
    return {
      count: 0,
      disWh: 0, disAh: 0, peakDisW: 0, peakDisA: 0, avgDisW: 0, avgDisA: 0, disMinutes: 0, avgDisV: 0,
      chgWh: 0, chgAh: 0, peakChgW: 0, peakChgA: 0, avgChgW: 0, avgChgA: 0, chgMinutes: 0, avgChgV: 0,
      netWh: 0, netAh: 0, whEfficiency: 0, ahEfficiency: 0,
      socStart: 0, socEnd: 0, socDelta: 0,
    };
  }

  let disWh = 0, disAh = 0, peakDisW = 0, peakDisA = 0, disMinutes = 0;
  let chgWh = 0, chgAh = 0, peakChgW = 0, peakChgA = 0, chgMinutes = 0;

  // High-precision Trapezoidal Numerical Integration:
  // - Uses actual dynamic delta-time (dt) between consecutive timestamps
  // - Performs linear trapezoidal interpolation to eliminate rectangular aliasing
  // - Accurately models zero-crossing transitions between charge and discharge
  for (let i = 0; i < filtered.length; i++) {
    const cur = filtered[i];
    const v = Number(cur.batVolt || 0);
    const a = Number(cur.batCurr || 0);
    const curW = v * Math.abs(a);
    const curA = Math.abs(a);

    if (a < 0) {
      if (curW > peakDisW) peakDisW = curW;
      if (curA > peakDisA) peakDisA = curA;
    } else if (a > 0) {
      if (curW > peakChgW) peakChgW = curW;
      if (curA > peakChgA) peakChgA = curA;
    }

    if (i === 0) {
      if (filtered.length === 1) {
        const dt = 5 / 60;
        if (a < 0) {
          disWh += curW * dt;
          disAh += curA * dt;
          disMinutes += 5;
        } else if (a > 0) {
          chgWh += curW * dt;
          chgAh += curA * dt;
          chgMinutes += 5;
        }
      }
      continue;
    }

    const prev = filtered[i - 1];
    const prevV = Number(prev.batVolt || 0);
    const prevA = Number(prev.batCurr || 0);

    const tPrev = new Date(prev.timestamp.replace(" ", "T")).getTime();
    const tCur = new Date(cur.timestamp.replace(" ", "T")).getTime();
    let dtHours = (tCur - tPrev) / (1000 * 3600);
    if (isNaN(dtHours) || dtHours <= 0 || dtHours > 0.25) {
      dtHours = 5 / 60;
    }

    const prevP = prevV * prevA;
    const curP = v * a;

    if (prevA <= 0 && a <= 0) {
      // Continuous discharge throughout interval
      const avgP = (Math.abs(prevP) + Math.abs(curP)) / 2;
      const avgA = (Math.abs(prevA) + Math.abs(a)) / 2;
      disWh += avgP * dtHours;
      disAh += avgA * dtHours;
      if (avgA > 0.1) disMinutes += dtHours * 60;
    } else if (prevA >= 0 && a >= 0) {
      // Continuous charge throughout interval
      const avgP = (prevP + curP) / 2;
      const avgA = (prevA + a) / 2;
      chgWh += avgP * dtHours;
      chgAh += avgA * dtHours;
      if (avgA > 0.1) chgMinutes += dtHours * 60;
    } else if (prevA < 0 && a > 0) {
      // Zero crossing: transition from discharge to charge
      const span = Math.abs(prevA) + a;
      const fDis = span > 0 ? Math.abs(prevA) / span : 0.5;
      const fChg = 1 - fDis;
      disWh += (Math.abs(prevP) / 2) * (fDis * dtHours);
      disAh += (Math.abs(prevA) / 2) * (fDis * dtHours);
      disMinutes += fDis * dtHours * 60;
      chgWh += (curP / 2) * (fChg * dtHours);
      chgAh += (a / 2) * (fChg * dtHours);
      chgMinutes += fChg * dtHours * 60;
    } else if (prevA > 0 && a < 0) {
      // Zero crossing: transition from charge to discharge
      const span = prevA + Math.abs(a);
      const fChg = span > 0 ? prevA / span : 0.5;
      const fDis = 1 - fChg;
      chgWh += (prevP / 2) * (fChg * dtHours);
      chgAh += (prevA / 2) * (fChg * dtHours);
      chgMinutes += fChg * dtHours * 60;
      disWh += (Math.abs(curP) / 2) * (fDis * dtHours);
      disAh += (Math.abs(a) / 2) * (fDis * dtHours);
      disMinutes += fDis * dtHours * 60;
    }
  }

  const disHours = disMinutes / 60;
  const chgHours = chgMinutes / 60;

  // 1. Monotonic Hardware Accumulator Delta with Dropout Immunity & Reset Detection
  const isStartOfDay =
    fromStr === "00:00" ||
    fromStr.endsWith(" 00:00") ||
    (filtered[0] && filtered[0].timestamp.slice(11, 16) <= "00:05");
  const hwDis = calculateAccumulatorDelta(filtered, "dayBatDisWh", isStartOfDay);
  const hwChg = calculateAccumulatorDelta(filtered, "dayBatChgWh", isStartOfDay);

  const trapDisWh = Math.round(disWh);
  const trapChgWh = Math.round(chgWh);

  // Physical Consistency Guards:
  // Reject hardware accumulator if oscillating (> 3 resets), contradicted by 0 active minutes/peak,
  // exceeding physical Peak Power * Duration limit, or diverging wildly from current integration.
  const isHwDisValid =
    hwDis.valid &&
    hwDis.total > 0 &&
    disMinutes > 0 &&
    peakDisW > 0 &&
    (disHours <= 0 || hwDis.total / disHours <= peakDisW * 1.15) &&
    hwDis.total <= Math.max(trapDisWh * 2.5, trapDisWh + 500);

  const isHwChgValid =
    hwChg.valid &&
    hwChg.total > 0 &&
    chgMinutes > 0 &&
    peakChgW > 0 &&
    (chgHours <= 0 || hwChg.total / chgHours <= peakChgW * 1.15) &&
    hwChg.total <= Math.max(trapChgWh * 2.5, trapChgWh + 500);

  const finalDisWh = isHwDisValid ? hwDis.total : trapDisWh;
  const finalChgWh = isHwChgValid ? hwChg.total : trapChgWh;

  const avgDisVNum = disAh > 0 ? disWh / disAh : 0;
  const avgDisV = avgDisVNum.toFixed(1);
  const finalDisAh = avgDisVNum > 0 && finalDisWh > 0 ? Number((finalDisWh / avgDisVNum).toFixed(1)) : Number(disAh.toFixed(1));
  const avgDisW = disHours > 0 ? Math.round(finalDisWh / disHours) : 0;
  const avgDisA = disHours > 0 ? (finalDisAh / disHours).toFixed(1) : "0.0";

  const avgChgVNum = chgAh > 0 ? chgWh / chgAh : 0;
  const avgChgV = avgChgVNum.toFixed(1);
  const finalChgAh = avgChgVNum > 0 && finalChgWh > 0 ? Number((finalChgWh / avgChgVNum).toFixed(1)) : Number(chgAh.toFixed(1));
  const avgChgW = chgHours > 0 ? Math.round(finalChgWh / chgHours) : 0;
  const avgChgA = chgHours > 0 ? (finalChgAh / chgHours).toFixed(1) : "0.0";

  const netWh = Math.round(finalChgWh - finalDisWh);
  const netAh = (finalChgAh - finalDisAh).toFixed(1);

  const whEfficiency = finalChgWh > 0 ? Math.min(100, Math.round((finalDisWh / finalChgWh) * 100)) : 0;
  const ahEfficiency = finalChgAh > 0 ? Math.min(100, Math.round((finalDisAh / finalChgAh) * 100)) : 0;

  const socStart = Number(filtered[0]?.batSoc ?? 0);
  const socEnd = Number(filtered[filtered.length - 1]?.batSoc ?? 0);
  const socDelta = socEnd - socStart;

  return {
    count: filtered.length,
    disWh: finalDisWh,
    disAh: finalDisAh,
    hwDisWh: hwDis.total,
    trapDisWh,
    peakDisW: Math.round(peakDisW),
    peakDisA: Number(peakDisA.toFixed(1)),
    avgDisW,
    avgDisA,
    avgDisV,
    disMinutes: Math.round(disMinutes),
    chgWh: finalChgWh,
    chgAh: finalChgAh,
    hwChgWh: hwChg.total,
    trapChgWh,
    peakChgW: Math.round(peakChgW),
    peakChgA: Number(peakChgA.toFixed(1)),
    avgChgW,
    avgChgA,
    avgChgV,
    chgMinutes: Math.round(chgMinutes),
    netWh,
    netAh,
    whEfficiency,
    ahEfficiency,
    socStart,
    socEnd,
    socDelta,
  };
}

function renderStatsTab(records, selectedDate) {
  if (!records || records.length === 0) return;
  currentStatsRecords = records;

  const todayStr = new Date().toLocaleDateString("en-CA");

  // If date was changed or not in custom range, ensure statsDateFrom/To match selectedDate for the whole day
  if (statsRange !== "custom" && statsDateFrom !== selectedDate) {
    statsDateFrom = selectedDate;
    statsDateTo = selectedDate;
    statsTimeFrom = "00:00";
    statsTimeTo = "23:59";
    statsRange = "all";
    document.querySelectorAll("#statsPresetButtons .range-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.statsRange === "all");
    });
    document.querySelectorAll(".stats-outage-chip").forEach((c) => c.classList.remove("active"));
  }

  // Keep input values in sync
  const dateFromInput = document.getElementById("statsDateFrom");
  const timeFromInput = document.getElementById("statsTimeFrom");
  const dateToInput = document.getElementById("statsDateTo");
  const timeToInput = document.getElementById("statsTimeTo");

  if (dateFromInput) {
    dateFromInput.value = statsDateFrom;
    dateFromInput.max = todayStr;
  }
  if (timeFromInput) timeFromInput.value = statsTimeFrom;
  if (dateToInput) {
    dateToInput.value = statsDateTo;
    dateToInput.max = todayStr;
  }
  if (timeToInput) timeToInput.value = statsTimeTo;

  // 1. Detect outages from records to populate Outage Preset Chips
  const outages = [];
  let curOutage = null;
  for (const r of records) {
    const v = Number(r.gridVolt || 0);
    const time = r.timestamp.slice(11, 16);
    if (v < 50) {
      if (!curOutage) {
        curOutage = { startTime: time, endTime: time, count: 1 };
      } else {
        curOutage.endTime = time;
        curOutage.count++;
      }
    } else {
      if (curOutage) {
        outages.push(curOutage);
        curOutage = null;
      }
    }
  }
  if (curOutage) outages.push(curOutage);

  const outageRow = document.getElementById("statsOutagesRow");
  const outageChips = document.getElementById("statsOutageChips");
  if (outageRow && outageChips) {
    if (outages.length > 0) {
      outageRow.style.display = "flex";
      outageChips.innerHTML = outages
        .map((out, idx) => {
          const durationMin = out.count * 5;
          const h = Math.floor(durationMin / 60);
          const m = durationMin % 60;
          const durStr =
            h > 0
              ? `${h} ${t("unitHours")} ${m} ${t("unitMin")}`
              : `${m} ${t("unitMin")}`;
          return `
            <button class="stats-outage-chip" data-start="${out.startTime}" data-end="${out.endTime}">
              🔴 #${idx + 1}: ${out.startTime}–${out.endTime} (${durStr})
            </button>
          `;
        })
        .join("");

      outageChips.querySelectorAll(".stats-outage-chip").forEach((chip) => {
        chip.onclick = () => {
          statsRange = "outage";
          statsDateFrom = selectedDate;
          statsDateTo = selectedDate;
          statsTimeFrom = chip.dataset.start;
          statsTimeTo = chip.dataset.end;
          document
            .querySelectorAll(".stats-outage-chip")
            .forEach((c) => c.classList.remove("active"));
          chip.classList.add("active");
          document
            .querySelectorAll("#statsPresetButtons .range-btn")
            .forEach((b) => b.classList.remove("active"));
          if (dateFromInput) dateFromInput.value = statsDateFrom;
          if (timeFromInput) timeFromInput.value = statsTimeFrom;
          if (dateToInput) dateToInput.value = statsDateTo;
          if (timeToInput) timeToInput.value = statsTimeTo;
          renderStatsTab(records, selectedDate);
        };
      });
    } else {
      outageRow.style.display = "none";
      outageChips.innerHTML = "";
    }
  }

  // 2. Compute statistics for current date + time range
  const fromDateTime = `${statsDateFrom} ${statsTimeFrom}`;
  const toDateTime = `${statsDateTo} ${statsTimeTo}`;
  const stats = calculateBatteryStats(records, fromDateTime, toDateTime);
  if (!stats) return;

  const formatDur = (mins) => {
    const totalMins = Math.round(Number(mins) || 0);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return h > 0
      ? `${h} ${t("unitHours")} ${m} ${t("unitMin")}`
      : `${m} ${t("unitMin")}`;
  };

  // Populate Discharged Card
  const disValEl = document.getElementById("statsDischargeVal");
  if (disValEl) {
    const kwhStr = (stats.disWh / 1000).toFixed(2);
    disValEl.textContent = `${stats.disWh.toLocaleString()} ${t("unitWh")} (${kwhStr} ${t("unitKwh")})`;
  }
  const disAhEl = document.getElementById("statsDischargeAhVal");
  if (disAhEl) {
    disAhEl.textContent = `⚡ ${stats.disAh} ${t("unitAh")} (${t("statsAvgAt")} ${stats.avgDisV} ${t("unitV")})`;
  }
  const peakDisWEl = document.getElementById("statsPeakDisW");
  if (peakDisWEl) peakDisWEl.textContent = `${stats.peakDisW.toLocaleString()} ${t("unitW")}`;
  const peakDisAEl = document.getElementById("statsPeakDisA");
  if (peakDisAEl) peakDisAEl.textContent = `${stats.peakDisA} ${t("unitA")}`;
  const avgDisWEl = document.getElementById("statsAvgDisW");
  if (avgDisWEl)
    avgDisWEl.textContent = `${stats.avgDisW} ${t("unitW")} (${stats.avgDisA} ${t("unitA")})`;
  const disDurEl = document.getElementById("statsDisDuration");
  if (disDurEl) disDurEl.textContent = formatDur(stats.disMinutes);

  // Populate Charged Card
  const chgValEl = document.getElementById("statsChargeVal");
  if (chgValEl) {
    const kwhStr = (stats.chgWh / 1000).toFixed(2);
    chgValEl.textContent = `${stats.chgWh.toLocaleString()} ${t("unitWh")} (${kwhStr} ${t("unitKwh")})`;
  }
  const chgAhEl = document.getElementById("statsChargeAhVal");
  if (chgAhEl) {
    chgAhEl.textContent = `⚡ ${stats.chgAh} ${t("unitAh")} (${t("statsAvgAt")} ${stats.avgChgV} ${t("unitV")})`;
  }
  const peakChgWEl = document.getElementById("statsPeakChgW");
  if (peakChgWEl) peakChgWEl.textContent = `${stats.peakChgW.toLocaleString()} ${t("unitW")}`;
  const peakChgAEl = document.getElementById("statsPeakChgA");
  if (peakChgAEl) peakChgAEl.textContent = `${stats.peakChgA} ${t("unitA")}`;
  const avgChgWEl = document.getElementById("statsAvgChgW");
  if (avgChgWEl)
    avgChgWEl.textContent = `${stats.avgChgW} ${t("unitW")} (${stats.avgChgA} ${t("unitA")})`;
  const chgDurEl = document.getElementById("statsChgDuration");
  if (chgDurEl) chgDurEl.textContent = formatDur(stats.chgMinutes);

  // Interval Badge
  const intervalBadge = document.getElementById("statsIntervalBadge");
  if (intervalBadge) {
    if (statsDateFrom === statsDateTo) {
      intervalBadge.textContent = `${statsDateFrom} · ${statsTimeFrom}–${statsTimeTo}`;
    } else {
      intervalBadge.textContent = `${statsDateFrom} ${statsTimeFrom} ➔ ${statsDateTo} ${statsTimeTo}`;
    }
  }

  // Update Hourly Bar Chart
  if (window.SmartESS?.Charts?.renderHourlyStatsChart) {
    window.SmartESS.Charts.renderHourlyStatsChart(records, currentStatsUnit);
  }
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
      // 1. Current Day: rawRecords[0] is the most recent telemetry ingested by the server
      const dat = await SmartESS.API.fetchFullDayData(dev, todayStr);
      if (!dat) return;
      const rawRecords = SmartESS.API.parseRows(dat);

      if (rawRecords.length === 0) {
        showError(t("noDataForDate", { date: todayStr }));
        SmartESS.Charts.destroyCharts();
        renderRawTable([]);
        return;
      }

      renderKPI(rawRecords[0], dev);
      fullChronoRecords = normalizeDayRecords(rawRecords);
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
      const rawRecords = SmartESS.API.parseRows(dat);

      if (rawRecords.length === 0) {
        showError(t("noDataForDate", { date: selectedDate }));
        SmartESS.Charts.destroyCharts();
        renderRawTable([]);
        return;
      }

      fullChronoRecords = normalizeDayRecords(rawRecords);
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
if (SmartESS?.I18n?.onLangChange) {
  SmartESS.I18n.onLangChange((lang) => {
    updateDateControls(
      datePicker ? datePicker.value : new Date().toLocaleDateString("en-CA"),
    );
    if (lastLiveRecord && currentDev) {
      renderKPI(lastLiveRecord, currentDev);
    }
    applyRangeAndRender();
  });
}

if (langSelect) {
  langSelect.onchange = (e) => {
    SmartESS.I18n.setLang(e.target.value);
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

    if (targetTab === "tabStats") {
      const curSelected = datePicker ? datePicker.value : new Date().toLocaleDateString("en-CA");
      if (statsRange !== "custom" && statsDateFrom !== curSelected && fullChronoRecords.length > 0) {
        statsDateFrom = curSelected;
        statsDateTo = curSelected;
        statsTimeFrom = "00:00";
        statsTimeTo = "23:59";
        statsRange = "all";
        renderStatsTab(fullChronoRecords, curSelected);
      }
    }

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

function openCalendar(targetInput) {
  const inp = targetInput || datePicker;
  if (!inp) return;
  if (typeof inp.showPicker === "function") {
    try {
      inp.showPicker();
      return;
    } catch (err) {}
  }
  try {
    inp.focus();
  } catch (err) {}
}

document.querySelectorAll(".date-display-wrap").forEach((wrap) => {
  wrap.addEventListener("click", (e) => {
    const inp = wrap.querySelector(".date-picker-input") || datePicker;
    // If the click directly hit the datePicker overlay, let the native browser picker open
    if (e.target === inp) return;
    openCalendar(inp);
  });
});

document.querySelectorAll(".date-picker-input").forEach((inp) => {
  inp.onchange = () => {
    setDate(inp.value);
  };
});

document.querySelectorAll(".prev-day-btn").forEach((btn) => {
  btn.onclick = () => stepDate(-1);
});

document.querySelectorAll(".next-day-btn").forEach((btn) => {
  btn.onclick = () => stepDate(1);
});

document.querySelectorAll(".today-btn").forEach((btn) => {
  btn.onclick = () => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    setDate(todayStr);
  };
});

// Direct element fallbacks for Overview
if (datePicker) {
  datePicker.onchange = () => setDate(datePicker.value);
}
if (prevDayBtn) prevDayBtn.onclick = () => stepDate(-1);
if (nextDayBtn) nextDayBtn.onclick = () => stepDate(1);
if (todayBtn) {
  todayBtn.onclick = () => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    setDate(todayStr);
  };
}

// Statistics Tab Controls
const statsPresetButtons = document.getElementById("statsPresetButtons");
if (statsPresetButtons) {
  statsPresetButtons.onclick = (e) => {
    const btn = e.target.closest(".range-btn");
    if (!btn) return;
    document
      .querySelectorAll("#statsPresetButtons .range-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".stats-outage-chip")
      .forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    const range = btn.dataset.statsRange;
    statsRange = range;
    const curDate = datePicker ? datePicker.value : new Date().toLocaleDateString("en-CA");
    statsDateFrom = curDate;
    statsDateTo = curDate;

    if (range === "all") {
      statsTimeFrom = "00:00";
      statsTimeTo = "23:59";
    } else if (range === "00-06") {
      statsTimeFrom = "00:00";
      statsTimeTo = "05:59";
    } else if (range === "06-12") {
      statsTimeFrom = "06:00";
      statsTimeTo = "11:59";
    } else if (range === "12-18") {
      statsTimeFrom = "12:00";
      statsTimeTo = "17:59";
    } else if (range === "18-24") {
      statsTimeFrom = "18:00";
      statsTimeTo = "23:59";
    }

    const dateFromInput = document.getElementById("statsDateFrom");
    const timeFromInput = document.getElementById("statsTimeFrom");
    const dateToInput = document.getElementById("statsDateTo");
    const timeToInput = document.getElementById("statsTimeTo");

    if (dateFromInput) dateFromInput.value = statsDateFrom;
    if (timeFromInput) timeFromInput.value = statsTimeFrom;
    if (dateToInput) dateToInput.value = statsDateTo;
    if (timeToInput) timeToInput.value = statsTimeTo;

    renderStatsTab(fullChronoRecords, curDate);
  };
}

const statsDateFromInp = document.getElementById("statsDateFrom");
const statsDateToInp = document.getElementById("statsDateTo");
const statsTimeFromInp = document.getElementById("statsTimeFrom");
const statsTimeToInp = document.getElementById("statsTimeTo");
const statsApplyTimeBtn = document.getElementById("statsApplyTimeBtn");

async function applyCustomStatsRange(autoDefaultWholeDay = false) {
  const dFrom = statsDateFromInp?.value;
  let tFrom = statsTimeFromInp?.value;
  let dTo = statsDateToInp?.value;
  let tTo = statsTimeToInp?.value;

  if (dFrom) statsDateFrom = dFrom;
  if (dTo) statsDateTo = dTo;

  if (autoDefaultWholeDay) {
    statsTimeFrom = "00:00";
    statsTimeTo = "23:59";
    if (statsTimeFromInp) statsTimeFromInp.value = statsTimeFrom;
    if (statsTimeToInp) statsTimeToInp.value = statsTimeTo;
  } else {
    if (tFrom) statsTimeFrom = tFrom;
    if (tTo) statsTimeTo = tTo;
  }

  if (statsDateFrom > statsDateTo) {
    statsDateTo = statsDateFrom;
    if (statsDateToInp) statsDateToInp.value = statsDateTo;
  }

  const isWholeDay = statsTimeFrom === "00:00" && statsTimeTo === "23:59";
  statsRange = (statsDateFrom === statsDateTo && isWholeDay) ? "all" : "custom";

  document
    .querySelectorAll("#statsPresetButtons .range-btn")
    .forEach((b) => b.classList.toggle("active", statsRange === "all" && b.dataset.statsRange === "all"));
  document
    .querySelectorAll(".stats-outage-chip")
    .forEach((c) => c.classList.remove("active"));

  const curSelected = datePicker ? datePicker.value : "";
  if (
    statsDateFrom === statsDateTo &&
    statsDateFrom === curSelected &&
    fullChronoRecords.length > 0
  ) {
    renderStatsTab(fullChronoRecords, statsDateFrom);
  } else if (statsDateFrom === statsDateTo) {
    setDate(statsDateFrom);
  } else {
    if (statsApplyTimeBtn) {
      statsApplyTimeBtn.disabled = true;
      statsApplyTimeBtn.textContent = t("loading");
    }
    try {
      const records = await getRecordsForDateRange(
        currentDev,
        statsDateFrom,
        statsDateTo,
      );
      renderStatsTab(records, statsDateFrom);
    } finally {
      if (statsApplyTimeBtn) {
        statsApplyTimeBtn.disabled = false;
        statsApplyTimeBtn.textContent = t("statsApply");
      }
    }
  }
}

if (statsDateFromInp) {
  statsDateFromInp.onchange = () => {
    const val = statsDateFromInp.value;
    if (!val) return;
    statsDateFrom = val;
    if (!statsDateToInp?.value || statsDateToInp.value <= val || statsDateTo === statsDateFrom) {
      if (statsDateToInp) statsDateToInp.value = val;
      statsDateTo = val;
    }
    applyCustomStatsRange(true);
  };
}

if (statsDateToInp) {
  statsDateToInp.onchange = () => {
    const val = statsDateToInp.value;
    if (!val) return;
    statsDateTo = val;
    if (statsDateTo < statsDateFrom) {
      statsDateFrom = statsDateTo;
      if (statsDateFromInp) statsDateFromInp.value = statsDateTo;
    }
    applyCustomStatsRange(true);
  };
}

if (statsApplyTimeBtn) {
  statsApplyTimeBtn.onclick = () => applyCustomStatsRange(false);
}

const unitWhBtn = document.getElementById("statsUnitWhBtn");
const unitAhBtn = document.getElementById("statsUnitAhBtn");
if (unitWhBtn && unitAhBtn) {
  unitWhBtn.onclick = () => {
    currentStatsUnit = "wh";
    unitWhBtn.classList.add("active");
    unitAhBtn.classList.remove("active");
    if (window.SmartESS?.Charts?.renderHourlyStatsChart) {
      const recs = currentStatsRecords.length > 0 ? currentStatsRecords : fullChronoRecords;
      window.SmartESS.Charts.renderHourlyStatsChart(recs, "wh");
    }
  };
  unitAhBtn.onclick = () => {
    currentStatsUnit = "ah";
    unitAhBtn.classList.add("active");
    unitWhBtn.classList.remove("active");
    if (window.SmartESS?.Charts?.renderHourlyStatsChart) {
      const recs = currentStatsRecords.length > 0 ? currentStatsRecords : fullChronoRecords;
      window.SmartESS.Charts.renderHourlyStatsChart(recs, "ah");
    }
  };
}

const loadBatUnitWBtn = document.getElementById("loadBatUnitWBtn");
const loadBatUnitABtn = document.getElementById("loadBatUnitABtn");
if (loadBatUnitWBtn && loadBatUnitABtn) {
  loadBatUnitWBtn.onclick = () => {
    loadBatUnitWBtn.classList.add("active");
    loadBatUnitABtn.classList.remove("active");
    if (window.SmartESS?.Charts?.setLoadBatUnit) {
      window.SmartESS.Charts.setLoadBatUnit("w");
    }
    applyRangeAndRender();
  };
  loadBatUnitABtn.onclick = () => {
    loadBatUnitABtn.classList.add("active");
    loadBatUnitWBtn.classList.remove("active");
    if (window.SmartESS?.Charts?.setLoadBatUnit) {
      window.SmartESS.Charts.setLoadBatUnit("a");
    }
    applyRangeAndRender();
  };
}

if (refreshBtn) refreshBtn.onclick = loadDashboard;

  // Global namespace export
  global.SmartESS = global.SmartESS || {};
  global.SmartESS.App = {
    loadDashboard,
    openLoginModal,
    closeLoginModal,
    applyRangeAndRender,
    calculateBatteryStats,
  };
  global.openLoginModal = openLoginModal;

  // Initialize
  loadDashboard();
  setInterval(loadDashboard, 5 * 60 * 1000);
})(typeof window !== "undefined" ? window : globalThis);
