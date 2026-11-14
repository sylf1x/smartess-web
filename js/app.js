/**
 * SmartESS Web - Application UI & Orchestration Logic
 */
(function (global) {
  let fullChronoRecords = [];
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
const statGridNoData = document.getElementById("statGridNoData");
const statGridVoltRange = document.getElementById("statGridVoltRange");
const statGridBatRange = document.getElementById("statGridBatRange");
const gridTimelineRibbon = document.getElementById("gridTimelineRibbon");
const gridTimelineReadout = document.getElementById("gridTimelineReadout");

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
    const baseBatDetails = t("batteryDetails", {
      v: batV.toFixed(1),
      a: (batA > 0 ? "+" : "") + batA,
    });
    const latestChgInW = Math.round(Number(latest.chgPower || 0));
    batDetailsEl.textContent =
      isCharging && latestChgInW > 0
        ? `${baseBatDetails} · ${t("chargerDrawShort", { w: latestChgInW })}`
        : baseBatDetails;
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
 * Builds the 24-Hour Grid Availability Ribbon & Statistics (including missing-data gap bands > 15m)
 */
function renderGridInfographic(records) {
  if (!records || records.length === 0) return;

  const GAP_THRESHOLD_MIN = 15;
  const formatMinHHMM = (mins) => {
    const clamped = Math.max(0, Math.min(1440, Math.round(mins)));
    const hh = String(Math.floor(clamped / 60)).padStart(2, "0");
    const mm = String(clamped % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA");
  const recordDate = String(records[0].timestamp || "").slice(0, 10);
  const isToday = Boolean(recordDate && recordDate === todayStr);
  const nowMinute = now.getHours() * 60 + now.getMinutes();

  let outageIncidents = 0;
  let inOutage = false;

  let minVolt = 999;
  let maxVolt = 0;

  const segments = [];
  let currentSegment = null;
  let prevMinute = null;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const volt = Number(r.gridVolt || 0);
    const rawMinute = getMinuteOfDay(r.timestamp);
    const minute = prevMinute !== null ? Math.max(prevMinute, rawMinute) : rawMinute;
    const curTime = formatMinHHMM(minute);

    if (prevMinute === null) {
      // Mark missing data before the first reading if day starts late
      if (minute > GAP_THRESHOLD_MIN) {
        segments.push({
          state: "nodata",
          startMinute: 0,
          endMinute: minute,
          startTime: "00:00",
          endTime: curTime,
        });
      }
    } else if (minute - prevMinute > GAP_THRESHOLD_MIN) {
      // Large gap detected: close prior segment cleanly instead of stretching across missing hours
      const gapStartMin = Math.min(minute, prevMinute + 5);
      if (currentSegment) {
        currentSegment.endMinute = gapStartMin;
        currentSegment.endTime = formatMinHHMM(gapStartMin);
        segments.push(currentSegment);
        currentSegment = null;
      }
      segments.push({
        state: "nodata",
        startMinute: gapStartMin,
        endMinute: minute,
        startTime: formatMinHHMM(gapStartMin),
        endTime: curTime,
      });
      inOutage = false;
    }

    let state = "online";
    if (volt < 50) {
      state = "offline";
    } else if (volt < 180 || volt > 255) {
      state = "warning";
    }

    if (volt >= 50) {
      minVolt = Math.min(minVolt, volt);
      maxVolt = Math.max(maxVolt, volt);
      if (inOutage) {
        inOutage = false;
      }
    } else {
      if (!inOutage) {
        inOutage = true;
        outageIncidents++;
      }
    }

    const tailEnd = Math.min(1440, minute + 5);
    if (!currentSegment || currentSegment.state !== state) {
      if (currentSegment) {
        currentSegment.endMinute = minute;
        currentSegment.endTime = curTime;
        segments.push(currentSegment);
      }
      currentSegment = {
        state,
        startMinute: minute,
        endMinute: tailEnd,
        startTime: curTime,
        endTime: formatMinHHMM(tailEnd),
      };
    } else {
      currentSegment.endMinute = tailEnd;
      currentSegment.endTime = formatMinHHMM(tailEnd);
    }

    prevMinute = minute;
  }

  if (currentSegment) {
    if (isToday && prevMinute !== null) {
      // Avoid projecting the trailing +5m sample window into the future on Today
      const cappedEnd = Math.max(
        prevMinute,
        Math.min(1440, nowMinute, prevMinute + 5)
      );
      currentSegment.endMinute = cappedEnd;
      currentSegment.endTime = formatMinHHMM(cappedEnd);
    }
    segments.push(currentSegment);
  }

  // Mark missing trailing data on completed past dates (not Today, which stops at current time)
  if (prevMinute !== null && recordDate && recordDate < todayStr) {
    const lastEnd = Math.min(1440, prevMinute + 5);
    if (1440 - lastEnd > GAP_THRESHOLD_MIN) {
      segments.push({
        state: "nodata",
        startMinute: lastEnd,
        endMinute: 1440,
        startTime: formatMinHHMM(lastEnd),
        endTime: "24:00",
      });
    }
  }

  // Compute totals from actual segment spans rather than counting +5m per record
  let totalOnlineMinutes = 0;
  let totalOfflineMinutes = 0;
  let totalNoDataMinutes = 0;
  for (const seg of segments) {
    const dur = Math.max(0, seg.endMinute - seg.startMinute);
    if (seg.state === "offline") {
      totalOfflineMinutes += dur;
    } else if (seg.state === "nodata") {
      totalNoDataMinutes += dur;
    } else {
      totalOnlineMinutes += dur;
    }
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
  if (statGridNoData) {
    if (totalNoDataMinutes > 0) {
      statGridNoData.style.display = "";
      statGridNoData.textContent = t("statGridNoData", {
        val: formatDuration(totalNoDataMinutes),
      });
    } else {
      statGridNoData.style.display = "none";
    }
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

    if (gridTimelineReadout) {
      gridTimelineReadout.classList.remove("is-active");
      gridTimelineReadout.innerHTML = `<span class="timeline-readout-hint">${t("timelineScrubHint")}</span>`;
    }

    const getStatusDesc = (segState) =>
      segState === "online"
        ? t("statusOnline")
        : segState === "warning"
          ? t("statusWarning")
          : segState === "nodata"
            ? t("statusNoData")
            : t("statusOffline");

    const selectSegment = (seg, segEl) => {
      gridTimelineRibbon
        .querySelectorAll(".timeline-segment.is-selected")
        .forEach((node) => node.classList.remove("is-selected"));
      if (segEl) segEl.classList.add("is-selected");
      if (!gridTimelineReadout || !seg) return;

      const segDuration = Math.max(0, seg.endMinute - seg.startMinute);
      const statusDot =
        seg.state === "online"
          ? "🟢"
          : seg.state === "warning"
            ? "🟡"
            : seg.state === "nodata"
              ? "⬜"
              : "🔴";
      const statusDesc = getStatusDesc(seg.state);

      gridTimelineReadout.classList.add("is-active");
      gridTimelineReadout.innerHTML = `
        <span class="tl-status">${statusDot} ${statusDesc}</span>
        <span class="tl-time">🕒 ${seg.startTime} – ${seg.endTime}</span>
        <span class="tl-span">(${formatDuration(segDuration)})</span>
      `;
    };

    segments.forEach((seg) => {
      const segDuration = Math.max(0, seg.endMinute - seg.startMinute);
      const visualDuration = Math.max(5, segDuration);
      const leftPct = (seg.startMinute / totalDayMinutes) * 100;
      const widthPct = (visualDuration / totalDayMinutes) * 100;

      const el = document.createElement("div");
      el.className = `timeline-segment seg-${seg.state}`;
      el.style.left = `${leftPct.toFixed(2)}%`;
      el.style.width = `${widthPct.toFixed(2)}%`;

      const statusDesc = getStatusDesc(seg.state);

      el.title = `${seg.startTime} – ${seg.endTime} (${formatDuration(segDuration)}): ${statusDesc}`;
      el.addEventListener("click", () => selectSegment(seg, el));
      el.addEventListener("mouseenter", () => selectSegment(seg, el));
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
      <td>${r.chgPower ?? 0}</td>
      <td>${r.gridVolt} / ${r.gridFreq}</td>
      <td>${r.outVolt}</td>
      <td>${r.tempInv}</td>
    </tr>
  `,
    )
    .join("");
}

function applyRangeAndRender() {
  SmartESS.Charts.renderAllCharts(fullChronoRecords);
  renderGridInfographic(fullChronoRecords);
  renderStatsTab(
    fullChronoRecords,
    datePicker ? datePicker.value : new Date().toLocaleDateString("en-CA"),
  );
  renderRawTable([...fullChronoRecords].reverse());
}

let statsDateFrom = new Date().toLocaleDateString("en-CA");
let statsTimeFrom = "00:00";
let statsDateTo = new Date().toLocaleDateString("en-CA");
let statsTimeTo = "23:59";
let statsRange = "all";
let currentStatsUnit = "wh";
let currentStatsRecords = [];
let currentStatsAggregate = null;
const SHARED_CACHE_KEY = "smartess_shared_cache_v1";
const MAX_CACHE_DAYS = 30;
const MAX_RANGE_DAYS = 31;

function getDevCacheId(dev) {
  if (!dev) return "default";
  return `${dev.pn || ""}_${dev.sn || ""}_${dev.devaddr || ""}`;
}

function loadSharedCache() {
  try {
    const raw = localStorage.getItem(SHARED_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSharedCache(cache) {
  // Remove deprecated multi-key caches if present so full quota is dedicated to the shared cache
  try {
    localStorage.removeItem("smartess_day_cache_v1");
    localStorage.removeItem("smartess_raw_day_cache_v1");
  } catch {}

  let entries = Object.entries(cache);
  if (entries.length > MAX_CACHE_DAYS) {
    entries.sort((a, b) => (a[1]?.cachedAt || 0) - (b[1]?.cachedAt || 0));
    cache = Object.fromEntries(entries.slice(entries.length - MAX_CACHE_DAYS));
  }
  try {
    localStorage.setItem(SHARED_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Evict oldest days if device storage quota is tight
    let sorted = Object.entries(cache).sort(
      (a, b) => (a[1]?.cachedAt || 0) - (b[1]?.cachedAt || 0)
    );
    while (sorted.length > 1) {
      sorted = sorted.slice(Math.max(1, Math.floor(sorted.length / 2)));
      try {
        localStorage.setItem(SHARED_CACHE_KEY, JSON.stringify(Object.fromEntries(sorted)));
        return;
      } catch {}
    }
  }
}

/**
 * Packs a day's telemetry rows into compact tuples (~18–22 KB/day instead of ~95 KB)
 * so 30 complete days of both Statistics digests and full raw rows fit comfortably
 * within ~600 KB of standard localStorage.
 */
function packDayRecords(records) {
  const modes = [];
  const models = [];
  const rows = records.map((r) => {
    const mStr = r.mode || "online";
    let mIdx = modes.indexOf(mStr);
    if (mIdx === -1) {
      mIdx = modes.length;
      modes.push(mStr);
    }
    const mdl = r.model || "";
    let mdlIdx = models.indexOf(mdl);
    if (mdlIdx === -1) {
      mdlIdx = models.length;
      models.push(mdl);
    }
    return [
      String(r.timestamp || "").slice(11),
      mIdx,
      r.batVolt ?? 0,
      r.batCurr ?? 0,
      r.batSoc ?? 0,
      r.gridVolt ?? 0,
      r.gridCurr ?? 0,
      r.gridFreq ?? 0,
      r.pvVolt ?? 0,
      r.pvCurr ?? 0,
      r.pvPower ?? 0,
      r.outVolt ?? 0,
      r.invCurr ?? 0,
      r.loadCurr ?? 0,
      r.loadActive ?? 0,
      r.loadVA ?? 0,
      r.tempPv ?? 0,
      r.tempB ?? 0,
      r.tempInv ?? 0,
      r.dayPvKwh ?? 0,
      r.dayGridKwh ?? 0,
      mdlIdx,
      r.dayBatDisWh ?? 0,
      r.dayBatChgWh ?? 0,
      r.chgPower ?? 0,
    ];
  });
  return { modes, models, rows };
}

function unpackDayRecords(dateStr, packed) {
  if (!packed || !Array.isArray(packed.rows)) return [];
  const modes = packed.modes || [];
  const models = packed.models || [];
  return packed.rows.map((row) => ({
    timestamp: `${dateStr} ${row[0]}`,
    mode: modes[row[1]] || "online",
    batVolt: row[2],
    batCurr: row[3],
    batSoc: row[4],
    gridVolt: row[5],
    gridCurr: row[6],
    gridFreq: row[7],
    pvVolt: row[8],
    pvCurr: row[9],
    pvPower: row[10],
    outVolt: row[11],
    invCurr: row[12],
    loadCurr: row[13],
    loadActive: row[14],
    loadVA: row[15],
    tempPv: row[16],
    tempB: row[17],
    tempInv: row[18],
    dayPvKwh: row[19],
    dayGridKwh: row[20],
    model: models[row[21]] || "",
    dayBatDisWh: row[22],
    dayBatChgWh: row[23],
    chgPower: row[24] ?? 0,
  }));
}

function getCachedRawDay(dev, dateStr) {
  const todayStr = new Date().toLocaleDateString("en-CA");
  if (!dev || !dateStr || dateStr >= todayStr) return null;
  const cache = loadSharedCache();
  const key = `${getDevCacheId(dev)}_${dateStr}`;
  const entry = cache[key];
  if (
    entry &&
    entry.p &&
    Array.isArray(entry.p.rows) &&
    entry.p.rows.length > 0 &&
    Array.isArray(entry.p.rows[0]) &&
    entry.p.rows[0].length >= 25
  ) {
    entry.cachedAt = Date.now();
    saveSharedCache(cache);
    return unpackDayRecords(dateStr, entry.p);
  }
  return null;
}

function getCachedDayDigest(dev, dateStr) {
  const todayStr = new Date().toLocaleDateString("en-CA");
  if (!dev || !dateStr || dateStr >= todayStr) return null;
  const cache = loadSharedCache();
  const key = `${getDevCacheId(dev)}_${dateStr}`;
  const entry = cache[key];
  return entry &&
    entry.d &&
    entry.d.summary &&
    entry.d.summary.chgDrawnWh !== undefined &&
    entry.d.hourly &&
    entry.d.hourly.chgDrawnWh !== undefined
    ? entry.d
    : null;
}

/**
 * Shared localStorage past-day writer (max 30 days LRU): stores BOTH the Statistics
 * digest and compact packed 5-minute rows under one entry so any day fetched in
 * Statistics is immediately available on Overview/Charts/Table and vice versa.
 */
function cachePastDay(dev, dateStr, records) {
  const todayStr = new Date().toLocaleDateString("en-CA");
  if (!dev || !dateStr || dateStr >= todayStr || !records || records.length === 0) return;
  const cache = loadSharedCache();
  const key = `${getDevCacheId(dev)}_${dateStr}`;
  const existing = cache[key];
  if (
    existing &&
    existing.d?.summary?.chgDrawnWh !== undefined &&
    existing.d?.hourly?.chgDrawnWh !== undefined &&
    existing.d?.summary?.count >= records.length &&
    existing.p?.rows?.length >= records.length &&
    existing.p.rows[0]?.length >= 25
  ) {
    existing.cachedAt = Date.now();
    saveSharedCache(cache);
    return;
  }
  const now = Date.now();
  cache[key] = {
    cachedAt: now,
    d: buildDayDigest(dateStr, records),
    p: packDayRecords(records),
  };
  saveSharedCache(cache);
}

function enumerateDates(dateFrom, dateTo, maxDays = MAX_RANGE_DAYS) {
  const cur = new Date(dateFrom + "T00:00:00");
  const end = new Date(dateTo + "T00:00:00");
  const dates = [];
  while (cur <= end) {
    dates.push(cur.toLocaleDateString("en-CA"));
    cur.setDate(cur.getDate() + 1);
    if (dates.length >= maxDays) break;
  }
  return dates;
}

/**
 * Computes a compact (~700 byte) immutable daily digest containing summary totals
 * and 24 hourly buckets for both Wh and Ah charts.
 */
function buildDayDigest(dateStr, records) {
  const summary = calculateBatteryStats(records, "00:00", "23:59") || {
    count: 0, disWh: 0, disAh: 0, peakDisW: 0, peakDisA: 0, avgDisV: "0.0", disMinutes: 0,
    chgWh: 0, chgAh: 0, peakChgW: 0, peakChgA: 0, avgChgV: "0.0", chgMinutes: 0,
    chgDrawnWh: 0, peakChgDrawnW: 0, gridDrawnWh: 0,
  };

  const chgWh = new Array(24).fill(0);
  const chgDrawnWh = new Array(24).fill(0);
  const disWh = new Array(24).fill(0);
  const chgAh = new Array(24).fill(0);
  const disAh = new Array(24).fill(0);
  const loadWh = new Array(24).fill(0);
  const pvWh = new Array(24).fill(0);

  const list = records || [];
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const h = Number(String(r.timestamp || "").slice(11, 13));
    if (h < 0 || h > 23) continue;

    let dt = 5 / 60;
    if (i > 0) {
      const tPrev = new Date(list[i - 1].timestamp.replace(" ", "T")).getTime();
      const tCur = new Date(r.timestamp.replace(" ", "T")).getTime();
      const diffH = (tCur - tPrev) / (1000 * 3600);
      if (!isNaN(diffH) && diffH > 0 && diffH <= 0.25) {
        dt = diffH;
      }
    }

    const v = Number(r.batVolt || 0);
    const a = Number(r.batCurr || 0);
    const l = Number(r.loadActive || 0);
    const pPv = Math.max(0, Number(r.pvPower || 0));
    const pChgIn = Math.max(0, Number(r.chgPower || 0));

    loadWh[h] += l * dt;
    pvWh[h] += pPv * dt;
    chgDrawnWh[h] += pChgIn * dt;

    if (a > 0) {
      chgWh[h] += v * a * dt;
      chgAh[h] += a * dt;
    } else if (a < 0) {
      disWh[h] += v * Math.abs(a) * dt;
      disAh[h] += Math.abs(a) * dt;
    }
  }

  return {
    date: dateStr,
    cachedAt: Date.now(),
    summary: {
      count: summary.count,
      disWh: summary.disWh,
      disAh: summary.disAh,
      peakDisW: summary.peakDisW,
      peakDisA: summary.peakDisA,
      disMinutes: summary.disMinutes,
      chgWh: summary.chgWh,
      chgAh: summary.chgAh,
      peakChgW: summary.peakChgW,
      peakChgA: summary.peakChgA,
      chgMinutes: summary.chgMinutes,
      chgDrawnWh: summary.chgDrawnWh || 0,
      peakChgDrawnW: summary.peakChgDrawnW || 0,
      gridDrawnWh: summary.gridDrawnWh || 0,
    },
    hourly: {
      chgWh: chgWh.map((x) => Math.round(x)),
      chgDrawnWh: chgDrawnWh.map((x) => Math.round(x)),
      disWh: disWh.map((x) => Math.round(x)),
      chgAh: chgAh.map((x) => Math.round(x * 10) / 10),
      disAh: disAh.map((x) => Math.round(x * 10) / 10),
      loadWh: loadWh.map((x) => Math.round(x)),
      pvWh: pvWh.map((x) => Math.round(x)),
    },
  };
}

/**
 * Fetches/reads cached past days across multi-day ranges (up to 30 days) using shared
 * localStorage storage and polite 4-day batching for misses.
 */
async function getAggregatedStatsRange(dev, dateFrom, dateTo, onProgress) {
  if (!dev) return null;
  const todayStr = new Date().toLocaleDateString("en-CA");
  const selectedTopDate = datePicker ? datePicker.value : todayStr;
  const dates = enumerateDates(dateFrom, dateTo, MAX_RANGE_DAYS);
  const digestsMap = new Map();
  const toFetch = [];

  for (const d of dates) {
    if (d === selectedTopDate && fullChronoRecords.length > 0) {
      const digest = buildDayDigest(d, fullChronoRecords);
      cachePastDay(dev, d, fullChronoRecords);
      digestsMap.set(d, digest);
    } else {
      const cached = getCachedDayDigest(dev, d);
      if (cached) {
        digestsMap.set(d, cached);
      } else {
        toFetch.push(d);
      }
    }
  }

  let done = dates.length - toFetch.length;
  if (onProgress && toFetch.length > 0) {
    onProgress(done, dates.length);
  }

  const BATCH_SIZE = 4;
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (d) => {
        try {
          const dat = await SmartESS.API.fetchFullDayData(dev, d);
          const records = dat ? normalizeDayRecords(SmartESS.API.parseRows(dat)) : [];
          const digest = buildDayDigest(d, records);
          if (d < todayStr && records.length > 0) {
            cachePastDay(dev, d, records);
          }
          digestsMap.set(d, digest);
        } catch {
          digestsMap.set(d, buildDayDigest(d, []));
        } finally {
          done++;
          if (onProgress) onProgress(done, dates.length);
        }
      })
    );
  }

  const digests = dates.map((d) => digestsMap.get(d) || buildDayDigest(d, []));

  let count = 0, disWh = 0, disAh = 0, peakDisW = 0, peakDisA = 0, disMinutes = 0;
  let chgWh = 0, chgAh = 0, peakChgW = 0, peakChgA = 0, chgMinutes = 0;
  let chgDrawnWh = 0, peakChgDrawnW = 0, gridDrawnWh = 0;
  const hourly = {
    isAggregated: true,
    dayCount: 0,
    chargedWh: new Array(24).fill(0),
    chgDrawnWh: new Array(24).fill(0),
    dischargedWh: new Array(24).fill(0),
    chargedAh: new Array(24).fill(0),
    dischargedAh: new Array(24).fill(0),
    loadWh: new Array(24).fill(0),
    pvWh: new Array(24).fill(0),
  };

  let activeDays = 0;
  const dailySeries = [];

  for (const item of digests) {
    const s = item.summary;
    const h = item.hourly;
    count += s.count;
    disWh += s.disWh;
    disAh += s.disAh;
    if (s.peakDisW > peakDisW) peakDisW = s.peakDisW;
    if (s.peakDisA > peakDisA) peakDisA = s.peakDisA;
    disMinutes += s.disMinutes;

    chgWh += s.chgWh;
    chgAh += s.chgAh;
    if (s.peakChgW > peakChgW) peakChgW = s.peakChgW;
    if (s.peakChgA > peakChgA) peakChgA = s.peakChgA;
    chgMinutes += s.chgMinutes;
    chgDrawnWh += s.chgDrawnWh || 0;
    if ((s.peakChgDrawnW || 0) > peakChgDrawnW) peakChgDrawnW = s.peakChgDrawnW;
    gridDrawnWh += s.gridDrawnWh || 0;

    if (s.count > 0) activeDays++;

    for (let hr = 0; hr < 24; hr++) {
      hourly.chargedWh[hr] += h.chgWh[hr] || 0;
      hourly.chgDrawnWh[hr] += (h.chgDrawnWh && h.chgDrawnWh[hr]) || 0;
      hourly.dischargedWh[hr] += h.disWh[hr] || 0;
      hourly.chargedAh[hr] += h.chgAh[hr] || 0;
      hourly.dischargedAh[hr] += h.disAh[hr] || 0;
      hourly.loadWh[hr] += h.loadWh[hr] || 0;
      hourly.pvWh[hr] += h.pvWh[hr] || 0;
    }

    dailySeries.push({
      date: item.date,
      disWh: s.disWh,
      disAh: s.disAh,
      chgWh: s.chgWh,
      chgAh: s.chgAh,
      chgDrawnWh: s.chgDrawnWh || 0,
    });
  }

  hourly.dayCount = Math.max(1, activeDays || digests.length);

  const disHours = disMinutes / 60;
  const chgHours = chgMinutes / 60;
  const avgDisV = disAh > 0 ? (disWh / disAh).toFixed(1) : "0.0";
  const avgChgV = chgAh > 0 ? (chgWh / chgAh).toFixed(1) : "0.0";

  return {
    stats: {
      count,
      disWh: Math.round(disWh),
      disAh: Number(disAh.toFixed(1)),
      peakDisW: Math.round(peakDisW),
      peakDisA: Number(peakDisA.toFixed(1)),
      avgDisW: disHours > 0 ? Math.round(disWh / disHours) : 0,
      avgDisA: disHours > 0 ? (disAh / disHours).toFixed(1) : "0.0",
      avgDisV,
      disMinutes: Math.round(disMinutes),
      chgWh: Math.round(chgWh),
      chgAh: Number(chgAh.toFixed(1)),
      peakChgW: Math.round(peakChgW),
      peakChgA: Number(peakChgA.toFixed(1)),
      avgChgW: chgHours > 0 ? Math.round(chgWh / chgHours) : 0,
      avgChgA: chgHours > 0 ? (chgAh / chgHours).toFixed(1) : "0.0",
      avgChgV,
      chgMinutes: Math.round(chgMinutes),
      chgDrawnWh: Math.round(chgDrawnWh),
      peakChgDrawnW: Math.round(peakChgDrawnW),
      gridDrawnWh: Math.round(gridDrawnWh),
    },
    dailySeries,
    hourly,
  };
}

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
 * treating the first reading of the interval as a 0 baseline, ignoring
 * transient zero dropouts, tracking resets on the same calendar day,
 * and flagging oscillating/corrupted sequences (more than 3 resets in a day).
 */
function calculateAccumulatorDelta(records, fieldName, scale = 1) {
  if (!records || records.length === 0) return { total: 0, resets: 0, valid: false };
  const firstVal = Number(records[0][fieldName] || 0);
  let total = 0;
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
  return {
    total: Math.round(total * scale), resets, valid: resets <= 3,
  };
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
      chgDrawnWh: 0, peakChgDrawnW: 0, gridDrawnWh: 0,
      netWh: 0, netAh: 0, whEfficiency: 0, ahEfficiency: 0,
      socStart: 0, socEnd: 0, socDelta: 0,
    };
  }

  let disWh = 0, disAh = 0, peakDisW = 0, peakDisA = 0, disMinutes = 0;
  let chgWh = 0, chgAh = 0, peakChgW = 0, peakChgA = 0, chgMinutes = 0;
  let chgDrawnWh = 0, peakChgDrawnW = 0;
  let trapGridEstWh = 0, trapGridMaxWh = 0, gridOnlineMinutes = 0;

  const getGridSampleEstW = (rec) => {
    const gv = Number(rec.gridVolt || 0);
    if (gv < 50) return { estW: 0, vaW: 0, online: false };
    const ga = Math.max(0, Number(rec.gridCurr || 0));
    const chgInW = Math.max(0, Number(rec.chgPower || 0));
    const ba = Number(rec.batCurr || 0);
    const loadW = Math.max(0, Number(rec.loadActive || 0));
    const estW = chgInW + (ba >= -0.2 ? loadW : 0);
    return { estW, vaW: gv * ga, online: true };
  };

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
    const curChgInW = Math.max(0, Number(cur.chgPower || 0));

    if (curChgInW > peakChgDrawnW) peakChgDrawnW = curChgInW;

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
        chgDrawnWh += curChgInW * dt;
        const gCur = getGridSampleEstW(cur);
        if (gCur.online) {
          gridOnlineMinutes += 5;
          trapGridEstWh += gCur.estW * dt;
          trapGridMaxWh += gCur.vaW * dt;
        }
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
    const prevChgInW = Math.max(0, Number(prev.chgPower || 0));

    const tPrev = new Date(prev.timestamp.replace(" ", "T")).getTime();
    const tCur = new Date(cur.timestamp.replace(" ", "T")).getTime();
    let dtHours = (tCur - tPrev) / (1000 * 3600);
    if (isNaN(dtHours) || dtHours <= 0 || dtHours > 0.25) {
      dtHours = 5 / 60;
    }

    chgDrawnWh += ((prevChgInW + curChgInW) / 2) * dtHours;

    const gPrev = getGridSampleEstW(prev);
    const gCur = getGridSampleEstW(cur);
    if (gPrev.online || gCur.online) {
      gridOnlineMinutes += dtHours * 60;
      trapGridEstWh += ((gPrev.estW + gCur.estW) / 2) * dtHours;
      trapGridMaxWh += ((gPrev.vaW + gCur.vaW) / 2) * dtHours;
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
  const hwDis = calculateAccumulatorDelta(filtered, "dayBatDisWh");
  const hwChg = calculateAccumulatorDelta(filtered, "dayBatChgWh");
  const hwGrid = calculateAccumulatorDelta(filtered, "dayGridKwh", 1000);

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

  const isHwGridValid =
    hwGrid.valid &&
    hwGrid.total >= 0 &&
    (hwGrid.total === 0 ||
      (gridOnlineMinutes > 0 &&
        hwGrid.total <= Math.max(trapGridMaxWh * 1.25, trapGridEstWh * 2.5, 1000)));
  const finalGridDrawnWh = isHwGridValid ? hwGrid.total : Math.round(trapGridEstWh);

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
    chgDrawnWh: Math.round(chgDrawnWh),
    peakChgDrawnW: Math.round(peakChgDrawnW),
    gridDrawnWh: finalGridDrawnWh,
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

  // If date was changed or not in custom/outage range, ensure statsDateFrom/To match selectedDate for the whole day
  if (statsRange !== "custom" && statsRange !== "outage" && statsDateFrom !== selectedDate) {
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

  currentStatsAggregate = null;
  populateStatsCards(stats);

  if (window.SmartESS?.Charts?.renderDailyStatsChart) {
    window.SmartESS.Charts.renderDailyStatsChart([], currentStatsUnit);
  }
  if (window.SmartESS?.Charts?.renderHourlyStatsChart) {
    window.SmartESS.Charts.renderHourlyStatsChart(records, currentStatsUnit);
  }
}

function populateStatsCards(stats) {
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
  const gridDrawnEl = document.getElementById("statsGridDrawnVal");
  if (gridDrawnEl) {
    const gridWh = Number(stats.gridDrawnWh || 0);
    gridDrawnEl.textContent = gridWh > 0
      ? `${(gridWh / 1000).toFixed(1)} ${t("unitKwh")}`
      : `0.0 ${t("unitKwh")}`;
  }

  // Interval Badge
  const intervalBadge = document.getElementById("statsIntervalBadge");
  if (intervalBadge) {
    if (statsDateFrom === statsDateTo) {
      intervalBadge.textContent = `${statsDateFrom} · ${statsTimeFrom}–${statsTimeTo}`;
    } else {
      intervalBadge.textContent = `${statsDateFrom} ➔ ${statsDateTo}`;
    }
  }
}

function renderStatsAggregated(agg) {
  if (!agg) return;
  currentStatsAggregate = agg;
  const outageRow = document.getElementById("statsOutagesRow");
  if (outageRow) outageRow.style.display = "none";

  populateStatsCards(agg.stats);

  if (window.SmartESS?.Charts?.renderDailyStatsChart) {
    window.SmartESS.Charts.renderDailyStatsChart(agg.dailySeries, currentStatsUnit);
  }
  if (window.SmartESS?.Charts?.renderHourlyStatsChart) {
    window.SmartESS.Charts.renderHourlyStatsChart(agg.hourly, currentStatsUnit);
  }
}

async function loadDashboard(forceRefresh = false) {
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
      // Check shared 30-day cache first so switching to any cached date renders instantaneously
      const cachedRecs = !forceRefresh ? getCachedRawDay(dev, selectedDate) : null;
      if (cachedRecs) {
        fullChronoRecords = cachedRecs;
        cachePastDay(dev, selectedDate, fullChronoRecords);
        applyRangeAndRender();

        // Keep top Live Status KPI cards & Banner fresh in background without blocking chart render
        fetchLiveTelemetry(dev)
          .then((live) => {
            if (live) renderKPI(live, dev);
          })
          .catch(() => {});
      } else {
        // Cold fetch: retrieve Live KPI telemetry and historical day telemetry in parallel
        const [live, dat] = await Promise.all([
          fetchLiveTelemetry(dev).catch(() => null),
          SmartESS.API.fetchFullDayData(dev, selectedDate),
        ]);
        if (live) renderKPI(live, dev);
        if (!dat) return;
        const rawRecords = SmartESS.API.parseRows(dat);

        if (rawRecords.length === 0) {
          showError(t("noDataForDate", { date: selectedDate }));
          SmartESS.Charts.destroyCharts();
          renderRawTable([]);
          return;
        }

        fullChronoRecords = normalizeDayRecords(rawRecords);
        cachePastDay(dev, selectedDate, fullChronoRecords);
        applyRangeAndRender();
      }
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
    const savedAggregate = currentStatsAggregate;
    applyRangeAndRender();
    if (savedAggregate) {
      renderStatsAggregated(savedAggregate);
    }
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
      const isMultiDayMode = statsRange === "custom" || statsRange === "7d" || statsRange === "14d" || statsRange === "30d";
      if (!isMultiDayMode && statsDateFrom !== curSelected && fullChronoRecords.length > 0) {
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

// Per-graph step zoom (+/-) and reset controls
document.querySelectorAll(".btn-zoom-step[data-zoom-chart]").forEach((btn) => {
  btn.onclick = () => {
    const dir = btn.dataset.zoomDir === "out" ? -1 : 1;
    const stepFactor = dir > 0 ? 1.15 : 1 / 1.15;
    if (typeof SmartESS.Charts.zoomChart === "function") {
      SmartESS.Charts.zoomChart(btn.dataset.zoomChart, stepFactor);
    }
  };
});

document.querySelectorAll(".btn-reset-zoom[data-reset-chart], #resetZoomHeaderBtn").forEach((btn) => {
  btn.onclick = () => {
    SmartESS.Charts.resetZoom(btn.dataset.resetChart || undefined);
  };
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
function shiftDateStr(dateStr, deltaDays) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

let multiDayRequestToken = 0;

async function loadMultiDayStats(dateFrom, dateTo) {
  if (!currentDev) return;
  const token = ++multiDayRequestToken;
  const intervalBadge = document.getElementById("statsIntervalBadge");
  try {
    const agg = await getAggregatedStatsRange(
      currentDev,
      dateFrom,
      dateTo,
      (done, total) => {
        if (token === multiDayRequestToken && intervalBadge && total > 0) {
          intervalBadge.textContent = t("statsLoadingDays", { done, total });
        }
      },
    );
    if (token !== multiDayRequestToken) return;
    renderStatsAggregated(agg);
  } catch (err) {
    if (token === multiDayRequestToken) showError(err.message);
  }
}

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
    const isMultiDayPreset = range === "7d" || range === "14d" || range === "30d";

    if (isMultiDayPreset) {
      const days = parseInt(range, 10);
      statsDateFrom = shiftDateStr(curDate, -(days - 1));
      statsDateTo = curDate;
      statsTimeFrom = "00:00";
      statsTimeTo = "23:59";
      loadMultiDayStats(statsDateFrom, statsDateTo);
    } else {
      statsDateFrom = curDate;
      statsDateTo = curDate;
      statsTimeFrom = "00:00";
      statsTimeTo = "23:59";
      multiDayRequestToken++;
      renderStatsTab(fullChronoRecords, curDate);
    }
  };
}

const unitWhBtn = document.getElementById("statsUnitWhBtn");
const unitAhBtn = document.getElementById("statsUnitAhBtn");
function setStatsDisplayUnit(unit) {
  currentStatsUnit = unit;
  if (unitWhBtn) unitWhBtn.classList.toggle("active", unit === "wh");
  if (unitAhBtn) unitAhBtn.classList.toggle("active", unit === "ah");
  if (!window.SmartESS?.Charts) return;
  if (currentStatsAggregate) {
    if (window.SmartESS.Charts.renderDailyStatsChart) {
      window.SmartESS.Charts.renderDailyStatsChart(currentStatsAggregate.dailySeries, unit);
    }
    if (window.SmartESS.Charts.renderHourlyStatsChart) {
      window.SmartESS.Charts.renderHourlyStatsChart(currentStatsAggregate.hourly, unit);
    }
  } else if (window.SmartESS.Charts.renderHourlyStatsChart) {
    const recs = currentStatsRecords.length > 0 ? currentStatsRecords : fullChronoRecords;
    window.SmartESS.Charts.renderHourlyStatsChart(recs, unit);
  }
}

if (unitWhBtn && unitAhBtn) {
  unitWhBtn.onclick = () => setStatsDisplayUnit("wh");
  unitAhBtn.onclick = () => setStatsDisplayUnit("ah");
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

if (refreshBtn) refreshBtn.onclick = () => loadDashboard(true);

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
  loadDashboard(false);
  setInterval(() => loadDashboard(false), 5 * 60 * 1000);
})(typeof window !== "undefined" ? window : globalThis);
