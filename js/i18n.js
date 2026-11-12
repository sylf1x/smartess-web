/**
 * SmartESS Web - Multi-language Localization (i18n)
 * Supports: Ukrainian (uk), Russian (ru), English (en)
 */
(function (global) {
  const LANG_STORAGE_KEY = "smartess_lang";

  const TRANSLATIONS = {
    uk: {
    appTitle: "Моніторинг інвертора",
    waitingAuth: "Очікування авторизації...",
    today: "Сьогодні",
    yesterday: "Вчора",
    beforeYesterday: "Позавчора",
    refresh: "Оновити",
    loading: "Завантаження...",
    resetZoom: "Скидання зуму",
    account: "Акаунт",
    currentStatus: "Поточний стан",
    live: "В РЕАЛЬНОМУ ЧАСІ",
    tabMain: "Головне",
    tabAdvanced: "Розширені",
    
    // Banner
    bannerGridTitle: "Живлення від міської мережі",
    bannerGridSub: "Мережа в нормі ({v} В · {f} Гц){chg} · Режим: {mode}",
    bannerGridChg: " · Йде зарядка АКБ (+{w} Вт)",
    bannerGridBadge: "МЕРЕЖА АКТИВНА",
    bannerBatTitle: "Аварія мережі · Живлення від акумулятора",
    bannerBatSub: "Міська мережа відключена! Навантаження живиться від АКБ ({load} Вт · {bat} Вт)",
    bannerBatBadge: "АВАРІЯ МЕРЕЖІ",
    bannerInitTitle: "Визначення джерела живлення...",
    bannerInitSub: "Зв'язок з інвертором встановлюється",

    // Cards
    gridTitle: "Міська мережа",
    gridOnline: "В мережі",
    gridOffline: "Відключення",
    gridDetails: "Частота: {f} Гц · Струм мережі: {a} А",
    batteryTitle: "Батарея (LiFePO4)",
    charge: "Заряд",
    discharge: "Розряд",
    buffer: "Буфер / Очікування",
    chargingState: "+{w} Вт (Зарядка)",
    dischargingState: "{w} Вт (Розрядка)",
    bufferState: "0 Вт (Буфер)",
    batteryDetails: "Напруга: {v} В · Струм: {a} А",
    loadTitle: "Навантаження будинку",
    loadNormal: "В нормі",
    loadHigh: "Високе навантаження",
    loadDetails: "Вихід інвертора: {v} В",

    // Infographic
    infographicTitle: "Інфографіка міської мережі за",
    statGridOnline: "🟢 В мережі: {val}",
    statGridOffline: "🔴 Відключення: {val} ({n} інцид.)",
    statGridVoltRange: "⚡ Напруга: {min}–{max} В",
    statGridBatRange: "🔋 АКБ: {val}",
    legendOnline: "В мережі (≥180В)",
    legendWarning: "Нестабільна (<180В)",
    legendOffline: "Відключення світла (0В)",
    statusOnline: "В мережі",
    statusWarning: "Нестабільна мережа",
    statusOffline: "Відключення світла",

    // Load & Bat History
    loadBatHistoryTitle: "Історія навантаження будинку та роботи АКБ (Вт)",
    peakLoad: "Пік навантаження",
    peakCharge: "Пік заряду",
    peakDischarge: "Пік розряду",
    peakPv: "Пік генерації PV",
    maxInv: "Макс. T інвертора",
    chartLoad: "Навантаження будинку (Вт)",
    chartBat: "Потужність АКБ (+заряд / -розряд, Вт)",
    chartGridVolt: "Напруга мережі (В)",
    chartGridFreq: "Частота мережі (Гц)",
    chartBatSoc: "Заряд АКБ (%)",
    chartPv: "Сонце PV (Вт)",
    chartLoadActive: "Навантаження активне (Вт)",
    chartLoadVA: "Навантаження повне (ВА)",
    chartTempInv: "Радіатор інвертора (°C)",
    chartTempB: "Радіатор B (°C)",
    chartTempPv: "MPPT / PV радіатор (°C)",

    // Advanced
    pvTitle: "Сонячні панелі (PV)",
    pvDetails: "Напруга: {v} В · Струм: {a} А",
    dayEnergyTitle: "Енергія за день",
    dayEnergyDetails: "Мережа: {g} кВт·год · АКБ: +{c}/-{d}",
    tempTitle: "Температури вузлів",
    tempDetails: "PV: {pv} °C · Радіатор B: {b} °C",
    machineStateTitle: "Режим інвертора",
    machineStateSub: "Статус обладнання",
    rangeAll: "Весь день",
    range0006: "Ніч 00–06",
    range0612: "Ранок 06–12",
    range1218: "День 12–18",
    range1824: "Вечір 18–24",
    zoomHint: "Виділи область мишкою для зуму",
    powerBalanceTitle: "Повний баланс потужності (Сонце, Навантаження, АКБ)",
    thermalProfileTitle: "Температурний профіль вузлів (°C)",
    rawTableTitle: "Детальна таблиця замірів за день",
    rowCount: "записів",
    timeCol: "Час",
    modeCol: "Режим",
    pvColPower: "PV (Вт)",
    pvColVolt: "PV (В)",
    loadCol: "Навантаження (ВА / Вт)",
    batSocCol: "АКБ (%)",
    batVoltCol: "АКБ (В)",
    batCurrCol: "Струм АКБ (А)",
    gridCol: "Мережа (В / Гц)",
    outCol: "Вихід (В)",
    tempCol: "T інв. (°C)",

    // Modal
    loginTitle: "Вхід у SmartESS",
    loginSub: "Інвертори визначаться автоматично після входу. Дані зберігаються тільки у твоєму браузері.",
    loginUserLabel: "Логін (Username)",
    loginUserPlaceholder: "Введи логін SmartESS",
    loginPassLabel: "Пароль",
    loginPassPlaceholder: "Введи пароль",
    loginSubmit: "Увійти",
    logoutBtn: "Вийти",
    closeBtn: "Закрити",
    discoveringDevices: "Пошук пристроїв...",
    loginErrorEmpty: "Введи логін та пароль від SmartESS.",
    noDataForDate: "За {date} даних поки немає.",
    noDevicesFound: "В акаунті не знайдено прив'язаних інверторів.",
    updatedAt: "Оновлено",
    unitHours: "год",
    unitMin: "хв",
    unitV: "В",
    unitA: "А",
    unitW: "Вт",
    unitHz: "Гц",
    unitKwh: "кВт·год",
    unitWh: "Вт·год",
    unitVa: "ВА",
    unitDeg: "°C",
    historyTitle: "Історія за день:",
    prevDay: "Попередній день",
    nextDay: "Наступний день",
    openCalendar: "Натисни, щоб відкрити календар",
    scrubHint: "Проведи пальцем по графіку",
    scrubPv: "PV",
    scrubVa: "ВА",
    scrubLoad: "Нав.",
    scrubBat: "АКБ",
    scrubInv: "Інв.",
    scrubSinkB: "Рад. B",

    // Tooltips
    tooltipBatCharge: "АКБ: +{w} Вт (Зарядка)",
    tooltipBatDischarge: "АКБ: {w} Вт (Розрядка)",
    tooltipBatBuffer: "АКБ: 0 Вт (Буфер)",
    tooltipGridOffline: "Напруга мережі: 0 В (Відключення)",
    tooltipGridOnline: "Напруга мережі: {v} В",
    tooltipGridFreq: "Частота мережі: {f} Гц",
    tooltipBatSoc: "Заряд АКБ: {soc}%",

    months: [
      "січ.", "лют.", "берез.", "квіт.", "трав.", "черв.",
      "лип.", "серп.", "верес.", "жовт.", "листоп.", "груд."
    ],

    modes: {
      "mains operation": "Робота від мережі",
      "contravariant operation": "Робота від АКБ",
      "battery mode": "Робота від АКБ",
      "line mode": "Робота від мережі",
      "standby": "Очікування",
      "bypass": "Байпас",
      "fault": "Помилка",
      "online": "В мережі",
    }
  },

  ru: {
    appTitle: "Мониторинг инвертора",
    waitingAuth: "Ожидание авторизации...",
    today: "Сегодня",
    yesterday: "Вчера",
    beforeYesterday: "Позавчера",
    refresh: "Обновить",
    loading: "Загрузка...",
    resetZoom: "Сброс зума",
    account: "Аккаунт",
    currentStatus: "Текущее состояние",
    live: "В РЕАЛЬНОМ ВРЕМЕНИ",
    tabMain: "Главное",
    tabAdvanced: "Расширенные",
    
    // Banner
    bannerGridTitle: "Питание от городской сети",
    bannerGridSub: "Сеть в норме ({v} В · {f} Гц){chg} · Режим: {mode}",
    bannerGridChg: " · Идёт зарядка АКБ (+{w} Вт)",
    bannerGridBadge: "СЕТЬ АКТИВНА",
    bannerBatTitle: "Авария сети · Питание от аккумулятора",
    bannerBatSub: "Городская сеть отключена! Нагрузка дома питается от АКБ ({load} Вт · {bat} Вт)",
    bannerBatBadge: "АВАРИЯ СЕТИ",
    bannerInitTitle: "Определение источника питания...",
    bannerInitSub: "Связь с инвертором устанавливается",

    // Cards
    gridTitle: "Городская сеть",
    gridOnline: "В сети",
    gridOffline: "Отключение",
    gridDetails: "Частота: {f} Гц · Ток сети: {a} А",
    batteryTitle: "Батарея (LiFePO4)",
    charge: "Заряд",
    discharge: "Разряд",
    buffer: "Буфер / Ожидание",
    chargingState: "+{w} Вт (Зарядка)",
    dischargingState: "{w} Вт (Разрядка)",
    bufferState: "0 Вт (Буфер)",
    batteryDetails: "Напряжение: {v} В · Ток: {a} А",
    loadTitle: "Нагрузка дома",
    loadNormal: "В норме",
    loadHigh: "Высокая нагрузка",
    loadDetails: "Выход инвертора: {v} В",

    // Infographic
    infographicTitle: "Инфографика городской сети за",
    statGridOnline: "🟢 В сети: {val}",
    statGridOffline: "🔴 Отключения: {val} ({n} инцид.)",
    statGridVoltRange: "⚡ Напряжение: {min}–{max} В",
    statGridBatRange: "🔋 АКБ: {val}",
    legendOnline: "В сети (≥180В)",
    legendWarning: "Нестабильная (<180В)",
    legendOffline: "Отключение сети (0В)",
    statusOnline: "В сети",
    statusWarning: "Нестабильная сеть",
    statusOffline: "Отключение света",

    // Load & Bat History
    loadBatHistoryTitle: "История нагрузки дома и работы АКБ (Вт)",
    peakLoad: "Пик нагрузки",
    peakCharge: "Пик заряда",
    peakDischarge: "Пик разряда",
    peakPv: "Пик генерации PV",
    maxInv: "Макс. T инвертора",
    chartLoad: "Нагрузка дома (Вт)",
    chartBat: "Мощность АКБ (+заряд / -разряд, Вт)",
    chartGridVolt: "Напряжение сети (В)",
    chartGridFreq: "Частота сети (Гц)",
    chartBatSoc: "Заряд АКБ (%)",
    chartPv: "Солнце PV (Вт)",
    chartLoadActive: "Нагрузка активная (Вт)",
    chartLoadVA: "Нагрузка полная (ВА)",
    chartTempInv: "Радиатор инвертора (°C)",
    chartTempB: "Радиатор B (°C)",
    chartTempPv: "MPPT / PV радиатор (°C)",

    // Advanced
    pvTitle: "Солнечные панели (PV)",
    pvDetails: "Напряжение: {v} В · Ток: {a} А",
    dayEnergyTitle: "Энергия за день",
    dayEnergyDetails: "Сеть: {g} кВт·ч · АКБ: +{c}/-{d}",
    tempTitle: "Температуры узлов",
    tempDetails: "PV: {pv} °C · Радиатор B: {b} °C",
    machineStateTitle: "Режим инвертора",
    machineStateSub: "Статус оборудования",
    rangeAll: "Весь день",
    range0006: "Ночь 00–06",
    range0612: "Утро 06–12",
    range1218: "День 12–18",
    range1824: "Вечер 18–24",
    zoomHint: "Выдели область мышкой для зума",
    powerBalanceTitle: "Полный баланс мощности (Солнце, Нагрузка, АКБ)",
    thermalProfileTitle: "Температурный профиль узлов (°C)",
    rawTableTitle: "Подробная таблица замеров за день",
    rowCount: "записей",
    timeCol: "Время",
    modeCol: "Режим",
    pvColPower: "PV (Вт)",
    pvColVolt: "PV (В)",
    loadCol: "Нагрузка (ВА / Вт)",
    batSocCol: "АКБ (%)",
    batVoltCol: "АКБ (В)",
    batCurrCol: "Ток АКБ (А)",
    gridCol: "Сеть (В / Гц)",
    outCol: "Выход (В)",
    tempCol: "T инв. (°C)",

    // Modal
    loginTitle: "Вход в SmartESS",
    loginSub: "Инверторы определятся автоматически после входа. Данные сохраняются только в твоём браузере.",
    loginUserLabel: "Логин (Username)",
    loginUserPlaceholder: "Введи логин SmartESS",
    loginPassLabel: "Пароль",
    loginPassPlaceholder: "Введи пароль",
    loginSubmit: "Войти",
    logoutBtn: "Выйти",
    closeBtn: "Закрыть",
    discoveringDevices: "Поиск устройств...",
    loginErrorEmpty: "Введи логин и пароль от SmartESS.",
    noDataForDate: "За {date} данных пока нет.",
    noDevicesFound: "В аккаунте не найдено привязанных инверторов.",
    updatedAt: "Обновлено",
    unitHours: "ч",
    unitMin: "мин",
    unitV: "В",
    unitA: "А",
    unitW: "Вт",
    unitHz: "Гц",
    unitKwh: "кВт·ч",
    unitWh: "Вт·ч",
    unitVa: "ВА",
    unitDeg: "°C",
    historyTitle: "История за день:",
    prevDay: "Предыдущий день",
    nextDay: "Следующий день",
    openCalendar: "Нажми, чтобы открыть календарь",
    scrubHint: "Проведи пальцем по графику",
    scrubPv: "PV",
    scrubVa: "ВА",
    scrubLoad: "Нагр.",
    scrubBat: "АКБ",
    scrubInv: "Инв.",
    scrubSinkB: "Рад. B",

    // Tooltips
    tooltipBatCharge: "АКБ: +{w} Вт (Зарядка)",
    tooltipBatDischarge: "АКБ: {w} Вт (Разрядка)",
    tooltipBatBuffer: "АКБ: 0 Вт (Буфер)",
    tooltipGridOffline: "Напряжение сети: 0 В (Отключение)",
    tooltipGridOnline: "Напряжение сети: {v} В",
    tooltipGridFreq: "Частота сети: {f} Гц",
    tooltipBatSoc: "Заряд АКБ: {soc}%",

    months: [
      "янв.", "февр.", "марта", "апр.", "мая", "июня",
      "июля", "авг.", "сент.", "окт.", "нояб.", "дек."
    ],

    modes: {
      "mains operation": "Работа от сети",
      "contravariant operation": "Работа от АКБ",
      "battery mode": "Работа от АКБ",
      "line mode": "Работа от сети",
      "standby": "Ожидание",
      "bypass": "Байпас",
      "fault": "Ошибка",
      "online": "В сети",
    }
  },

  en: {
    appTitle: "Inverter Monitor",
    waitingAuth: "Waiting for authorization...",
    today: "Today",
    yesterday: "Yesterday",
    beforeYesterday: "2 days ago",
    refresh: "Refresh",
    loading: "Loading...",
    resetZoom: "Reset Zoom",
    account: "Account",
    currentStatus: "Current Status",
    live: "LIVE",
    tabMain: "Overview",
    tabAdvanced: "Advanced",
    
    // Banner
    bannerGridTitle: "Powered by Grid",
    bannerGridSub: "Grid online ({v} V · {f} Hz){chg} · Mode: {mode}",
    bannerGridChg: " · Battery charging (+{w} W)",
    bannerGridBadge: "GRID ACTIVE",
    bannerBatTitle: "Grid Outage · Battery Backup",
    bannerBatSub: "Grid is offline! House is powered by battery ({load} W · {bat} W)",
    bannerBatBadge: "GRID OUTAGE",
    bannerInitTitle: "Detecting power source...",
    bannerInitSub: "Connecting to inverter...",

    // Cards
    gridTitle: "Grid Power",
    gridOnline: "Online",
    gridOffline: "Outage",
    gridDetails: "Freq: {f} Hz · Grid Current: {a} A",
    batteryTitle: "Battery (LiFePO4)",
    charge: "Charging",
    discharge: "Discharging",
    buffer: "Standby",
    chargingState: "+{w} W (Charging)",
    dischargingState: "{w} W (Discharging)",
    bufferState: "0 W (Standby)",
    batteryDetails: "Voltage: {v} V · Current: {a} A",
    loadTitle: "House Load",
    loadNormal: "Normal",
    loadHigh: "High Load",
    loadDetails: "Inverter Output: {v} V",

    // Infographic
    infographicTitle: "Grid Infographic for",
    statGridOnline: "🟢 Online: {val}",
    statGridOffline: "🔴 Outages: {val} ({n} inc.)",
    statGridVoltRange: "⚡ Voltage: {min}–{max} V",
    statGridBatRange: "🔋 Battery: {val}",
    legendOnline: "Online (≥180V)",
    legendWarning: "Unstable (<180V)",
    legendOffline: "Grid Outage (0V)",
    statusOnline: "Online",
    statusWarning: "Unstable Grid",
    statusOffline: "Grid Outage",

    // Load & Bat History
    loadBatHistoryTitle: "House Load & Battery Power History (W)",
    peakLoad: "Peak Load",
    peakCharge: "Peak Charge",
    peakDischarge: "Peak Discharge",
    peakPv: "Peak PV Solar",
    maxInv: "Max Inv Temp",
    chartLoad: "House Load (W)",
    chartBat: "Battery Power (+charge / -discharge, W)",
    chartGridVolt: "Grid Voltage (V)",
    chartGridFreq: "Grid Frequency (Hz)",
    chartBatSoc: "Battery SoC (%)",
    chartPv: "Solar PV (W)",
    chartLoadActive: "Active Load (W)",
    chartLoadVA: "Apparent Load (VA)",
    chartTempInv: "Inverter Radiator (°C)",
    chartTempB: "Heat Sink B (°C)",
    chartTempPv: "MPPT / PV Radiator (°C)",

    // Advanced
    pvTitle: "Solar Panels (PV)",
    pvDetails: "Voltage: {v} V · Current: {a} A",
    dayEnergyTitle: "Energy Today",
    dayEnergyDetails: "Grid: {g} kWh · Bat: +{c}/-{d}",
    tempTitle: "Thermals",
    tempDetails: "PV: {pv} °C · Heat Sink B: {b} °C",
    machineStateTitle: "Inverter Mode",
    machineStateSub: "Equipment Status",
    rangeAll: "All Day",
    range0006: "Night 00–06",
    range0612: "Morning 06–12",
    range1218: "Day 12–18",
    range1824: "Evening 18–24",
    zoomHint: "Drag mouse over area to zoom",
    powerBalanceTitle: "Full Power Balance (Solar, Load, Battery)",
    thermalProfileTitle: "Node Temperature Profile (°C)",
    rawTableTitle: "Detailed Daily Telemetry Table",
    rowCount: "records",
    timeCol: "Time",
    modeCol: "Mode",
    pvColPower: "PV (W)",
    pvColVolt: "PV (V)",
    loadCol: "Load (VA / W)",
    batSocCol: "Battery (%)",
    batVoltCol: "Bat Volt (V)",
    batCurrCol: "Bat Current (A)",
    gridCol: "Grid (V / Hz)",
    outCol: "Output (V)",
    tempCol: "Inv Temp (°C)",

    // Modal
    loginTitle: "Login to SmartESS",
    loginSub: "Inverters will be discovered automatically. Credentials are stored securely only in your browser.",
    loginUserLabel: "Username",
    loginUserPlaceholder: "Enter SmartESS username",
    loginPassLabel: "Password",
    loginPassPlaceholder: "Enter password",
    loginSubmit: "Login",
    logoutBtn: "Logout",
    closeBtn: "Close",
    discoveringDevices: "Discovering devices...",
    loginErrorEmpty: "Please enter your SmartESS username and password.",
    noDataForDate: "No data available for {date}.",
    noDevicesFound: "No inverters found in this account.",
    updatedAt: "Updated",
    unitHours: "h",
    unitMin: "m",
    unitV: "V",
    unitA: "A",
    unitW: "W",
    unitHz: "Hz",
    unitKwh: "kWh",
    unitWh: "Wh",
    unitVa: "VA",
    unitDeg: "°C",
    historyTitle: "Daily History:",
    prevDay: "Previous Day",
    nextDay: "Next Day",
    openCalendar: "Click to open calendar",
    scrubHint: "Slide finger across graph",
    scrubPv: "PV",
    scrubVa: "VA",
    scrubLoad: "Load",
    scrubBat: "Bat",
    scrubInv: "Inv",
    scrubSinkB: "Sink B",

    // Tooltips
    tooltipBatCharge: "Battery: +{w} W (Charging)",
    tooltipBatDischarge: "Battery: {w} W (Discharging)",
    tooltipBatBuffer: "Battery: 0 W (Standby)",
    tooltipGridOffline: "Grid Voltage: 0 V (Outage)",
    tooltipGridOnline: "Grid Voltage: {v} V",
    tooltipGridFreq: "Grid Frequency: {f} Hz",
    tooltipBatSoc: "Battery SoC: {soc}%",

    months: [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ],

    modes: {
      "mains operation": "Line Mode",
      "contravariant operation": "Battery Mode",
      "battery mode": "Battery Mode",
      "line mode": "Line Mode",
      "standby": "Standby",
      "bypass": "Bypass",
      "fault": "Fault",
      "online": "Online",
    }
  }
};

let currentLang = "uk"; // Default to Ukrainian

function initLanguage() {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved && ["uk", "ru", "en"].includes(saved)) {
    currentLang = saved;
  } else {
    const nav = (navigator.language || "").toLowerCase();
    if (nav.startsWith("ru")) {
      currentLang = "ru";
    } else if (nav.startsWith("en")) {
      currentLang = "en";
    } else {
      currentLang = "uk";
    }
  }
  return currentLang;
}

function getLang() {
  return currentLang;
}

const langListeners = [];

function onLangChange(fn) {
  if (typeof fn === "function") {
    langListeners.push(fn);
  }
}

function setLang(lang) {
  if (!["uk", "ru", "en"].includes(lang)) return;
  currentLang = lang;
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  applyI18nToDOM();
  langListeners.forEach((fn) => {
    try {
      fn(lang);
    } catch {}
  });
}

function t(key, params = {}) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.uk;
  let text = dict[key] || TRANSLATIONS.uk[key] || key;
  if (typeof text !== "string") return text;
  Object.keys(params).forEach((k) => {
    text = text.replaceAll(`{${k}}`, params[k]);
  });
  return text;
}

function translateMode(modeStr) {
  if (!modeStr) return "—";
  const dict = TRANSLATIONS[currentLang]?.modes || TRANSLATIONS.uk.modes;
  const lower = String(modeStr).toLowerCase().trim();
  return dict[lower] || modeStr;
}

function getMonths() {
  return TRANSLATIONS[currentLang]?.months || TRANSLATIONS.uk.months;
}

function applyI18nToDOM() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (key) {
      el.textContent = t(key);
    }
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (key) {
      el.title = t(key);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (key) {
      el.placeholder = t(key);
    }
  });

  const langSelect = document.getElementById("langSelect");
  if (langSelect) {
    langSelect.value = currentLang;
  }
}

  // Global namespace
  global.SmartESS = global.SmartESS || {};
  global.SmartESS.I18n = {
    initLanguage,
    getLang,
    setLang,
    onLangChange,
    t,
    getMonths,
    translateMode,
    applyI18nToDOM,
  };
  global.t = t;
})(typeof window !== "undefined" ? window : globalThis);
