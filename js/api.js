/**
 * SmartESS Web - API Client & Session Management
 * Reverse-engineered for ios.dessmonitor.com public endpoints.
 */
(function (global) {
  const sha1 = (s) => (global.sha1 || global.SmartESS?.sha1 || window.sha1)(s);
  const API_BASE = "https://ios.dessmonitor.com/public/";
  const COMPANY_KEY = "bnrl_frRFjEz8Mkn";
  const STORAGE_KEY = "smartess_auto_v4";

const getState = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

const setState = (patch) => {
  const next = { ...getState(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};

const clearState = () => {
  localStorage.removeItem(STORAGE_KEY);
};

/**
 * Authenticate using SmartESS username and password.
 * Signs request with: SHA1(salt + SHA1(password) + "&" + params)
 */
async function authenticate(usr, pwd) {
  const salt = Math.floor(Date.now() / 1000).toString();
  const pwdHash = sha1(pwd);
  const params = `action=authSource&usr=${encodeURIComponent(usr)}&company-key=${COMPANY_KEY}&source=1&_app_id_=com.eybond.SmartClientForESS&_app_version_=3.56.0&_app_client_=ios`;
  const sign = sha1(`${salt}${pwdHash}&${params}`);

  const res = await fetch(`${API_BASE}?sign=${sign}&salt=${salt}&${params}`);
  const json = await res.json();

  if (json.err !== 0 || !json.dat?.token || !json.dat?.secret) {
    throw new Error(
      `Ошибка входа (${json.err}): ${json.desc || "проверь логин и пароль"}`
    );
  }

  return setState({
    usr,
    pwd,
    token: json.dat.token,
    secret: json.dat.secret,
  });
}

/**
 * Perform an authenticated API call.
 * Handles automatic re-authentication if token has expired.
 */
async function publicApiCall(params, allowRelogin = true) {
  let state = getState();
  if (!state.token || !state.secret) {
    if (state.usr && state.pwd) {
      state = await authenticate(state.usr, state.pwd);
    } else {
      if (typeof window.openLoginModal === "function") {
        window.openLoginModal();
      }
      return null;
    }
  }

  const salt = Math.floor(Date.now() / 1000).toString();
  const sign = sha1(`${salt}${state.secret}${state.token}&${params}`);
  const url = `${API_BASE}?sign=${sign}&salt=${salt}&token=${state.token}&${params}`;

  const res = await fetch(url);
  const json = await res.json();

  if (json.err !== 0) {
    if (
      allowRelogin &&
      [11, 257, 258].includes(json.err) &&
      state.usr &&
      state.pwd
    ) {
      await authenticate(state.usr, state.pwd);
      return publicApiCall(params, false);
    }
    throw new Error(`Ошибка API (${json.err}): ${json.desc}`);
  }

  return json.dat;
}

/**
 * Auto-discover inverters associated with the account.
 * Handles parallel inverter setups aggregated under a Wi-Fi datalogger (devcode != 0).
 */
async function discoverDevices(forceRefresh = false) {
  const state = getState();
  if (
    !forceRefresh &&
    Array.isArray(state.devices) &&
    state.devices.length > 0
  ) {
    return state.devices;
  }

  const foundMap = new Map();

  const addDevices = (rawList, plantName = "") => {
    for (const d of rawList || []) {
      if (Number(d.devcode) === 0) continue; // Skip datalogger itself
      const key = `${d.pn}_${d.sn}_${d.devaddr}`;
      if (!foundMap.has(key)) {
        foundMap.set(key, {
          plantName,
          alias: d.alias || d.devalias || d.sn,
          pn: d.pn,
          sn: d.sn,
          devcode: d.devcode,
          devaddr: d.devaddr,
        });
      }
    }
  };

  try {
    const esDat = await publicApiCall(
      "action=webQueryDeviceEs&pagesize=50&page=0"
    );
    addDevices(esDat?.device);
  } catch {}

  if (foundMap.size === 0) {
    const plantsDat = await publicApiCall(
      "action=queryPlants&pagesize=20&page=0"
    );
    const plants = plantsDat?.plant || [];

    for (const plant of plants) {
      for (const devtype of [2304, 512]) {
        try {
          const devDat = await publicApiCall(
            `action=queryPlantDeviceDesignatedInformation&plantid=${plant.pid}&devtype=${devtype}&pagesize=50&page=0`
          );
          addDevices(devDat?.device, plant.name);
        } catch {}
      }
    }
  }

  const found = Array.from(foundMap.values());
  if (found.length === 0) {
    throw new Error("В аккаунте не найдено привязанных инверторов.");
  }

  setState({ devices: found, selectedIdx: 0 });
  return found;
}

/**
 * Parse raw rows from queryDeviceDataOneDayPaging into structured JS telemetry records.
 */
function parseRows(dat) {
  const titles = (dat?.title || []).map((c) =>
    String(typeof c === "string" ? c : c?.title || "").toLowerCase()
  );

  const getVal = (fields, names, fallbackIdx) => {
    for (const name of names) {
      const idx = titles.indexOf(name.toLowerCase());
      if (
        idx !== -1 &&
        fields[idx] !== undefined &&
        fields[idx] !== null
      ) {
        return fields[idx];
      }
    }
    return fallbackIdx !== undefined ? fields[fallbackIdx] : undefined;
  };

  return (dat?.row || []).map((item) => {
    const f = Array.isArray(item) ? item : item.field || [];
    let ts = getVal(f, ["timestamp", "data acquisition time", "time"], 1);
    if (!ts || typeof ts !== "string") {
      ts =
        f.find(
          (v) =>
            typeof v === "string" &&
            /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(v)
        ) || "";
    }

    return {
      timestamp: String(ts),
      mode:
        getVal(f, ["current state of machine", "work mode"], 3) || "online",
      batVolt: getVal(f, ["batvolt", "battery voltage"], 4) ?? 0,
      // Invert sign: SmartESS API returns negative current when charging and positive when discharging.
      // Inverted convention: positive (+) = Charging (flowing into battery), negative (-) = Discharging.
      batCurr: -(Number(
        getVal(
          f,
          ["chargecurr", "battery charging current", "charging current"],
          5
        ) ?? 0
      )),
      batSoc: getVal(f, ["batsoc", "battery capacity"], 6) ?? 0,
      gridVolt: getVal(f, ["mains voltage", "grid voltage"], 9) ?? 0,
      gridCurr: getVal(f, ["grid current"], 10) ?? 0,
      gridFreq: getVal(f, ["gridfreq", "grid frequency"], 11) ?? 0,
      pvVolt: getVal(f, ["pvinputvolt", "pv input voltage"], 13) ?? 0,
      pvCurr: getVal(f, ["pvinputcurr", "pv input current"], 14) ?? 0,
      pvPower:
        getVal(f, ["pv charging power", "pv input power"], 15) ?? 0,
      outVolt: getVal(f, ["outvolt", "ac output voltage"], 18) ?? 0,
      loadActive:
        getVal(f, ["load active", "ac output active power"], 22) ?? 0,
      loadVA:
        getVal(
          f,
          ["load apparent power", "ac output apparent power"],
          23
        ) ?? 0,
      tempPv: getVal(f, ["pv radiator temperature"], 25) ?? 0,
      tempB: getVal(f, ["heat sink b temperature"], 26) ?? 0,
      tempInv: getVal(f, ["inverter radiator temperature"], 27) ?? 0,
      dayPvKwh: getVal(f, ["pv power generation on the day"], 30) ?? 0,
      dayGridKwh:
        getVal(
          f,
          ["power consumption from the mains on the day of the load"],
          32
        ) ?? 0,
      model: getVal(f, ["equipment type"], 39) || "",
      dayBatDisWh: getVal(f, ["battery energy today discharge"], 40) ?? 0,
      dayBatChgWh: getVal(f, ["battery energy today charge"], 41) ?? 0,
    };
  });
}

/**
 * Fetches all telemetry records for a given date across all pages.
 * The SmartESS server limits pagesize to 100 rows per request.
 * A complete 24h day contains up to 288 rows (5-minute intervals),
 * requiring pages 0, 1, and 2.
 */
async function fetchFullDayData(dev, date) {
  const firstDat = await publicApiCall(
    `action=queryDeviceDataOneDayPaging&pn=${dev.pn}&sn=${dev.sn}&devcode=${dev.devcode}&devaddr=${dev.devaddr}&date=${date}&page=0&pagesize=100&i18n=en_US`
  );

  if (!firstDat) return null;

  const total = Number(firstDat.total || 0);
  const rows = [...(firstDat.row || [])];

  // If there are more rows than returned on page 0, fetch remaining pages in parallel
  if (total > rows.length) {
    const totalPages = Math.ceil(total / 100);
    const fetchPromises = [];

    for (let p = 1; p < totalPages; p++) {
      fetchPromises.push(
        publicApiCall(
          `action=queryDeviceDataOneDayPaging&pn=${dev.pn}&sn=${dev.sn}&devcode=${dev.devcode}&devaddr=${dev.devaddr}&date=${date}&page=${p}&pagesize=100&i18n=en_US`
        )
      );
    }

    const restPages = await Promise.all(fetchPromises);
    restPages.forEach((res) => {
      if (Array.isArray(res?.row)) {
        rows.push(...res.row);
      }
    });
  }

  return {
    title: firstDat.title || [],
    row: rows,
    total: rows.length,
  };
}

  // Global namespace export
  global.SmartESS = global.SmartESS || {};
  global.SmartESS.API = {
    API_BASE,
    COMPANY_KEY,
    STORAGE_KEY,
    getState,
    setState,
    clearState,
    authenticate,
    publicApiCall,
    discoverDevices,
    parseRows,
    fetchFullDayData,
  };
})(typeof window !== "undefined" ? window : globalThis);
