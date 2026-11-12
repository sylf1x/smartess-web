# Project Context: SmartESS Web Dashboard

## 1. Overview & Architecture
- **Goal:** A standalone, static single-page web dashboard (`index.html`) for monitoring hybrid solar inverters (`IGRID-VX-IV-5.6KW-WIFI` / `HFP4856S100-H` series) connected to the Eybond / SmartESS cloud platform.
- **Deployment Target:** GitHub Pages (100% client-side, zero backend, zero build step).
- **Current Stack:** Vanilla HTML5, CSS3 (CSS Grid/Variables, dark theme), Vanilla ES2022 JS, Chart.js v4.4.4, Hammer.js v2.0.8, `chartjs-plugin-zoom` v2.0.1.
- **Directory Structure:**
  - `index.html`: Clean markup linking styles and modular scripts.
  - `css/style.css`: All themes, layout grids, components, and responsive rules.
  - `js/crypto.js`: Pure JavaScript hex SHA-1 algorithm.
  - `js/api.js`: Session management, request signing, device auto-discovery, telemetry row parsing (`SmartESS.API`).
  - `js/charts.js`: Chart.js rendering, 4 synchronized line charts, drag-to-zoom controls (`SmartESS.Charts`).
  - `js/app.js`: DOM event orchestration, KPI rendering, range filters, table rendering, auto-refresh (`SmartESS.App`).
- **Storage:** User credentials, session tokens, and discovered device metadata are stored exclusively in browser `localStorage` (`smartess_auto_v4`). No secrets are hardcoded in the repository.

---

## 2. Reverse-Engineered API Specification (`ios.dessmonitor.com`)

### Base Endpoint & CORS
- **URL:** `https://ios.dessmonitor.com/public/`
- **Method:** `HTTP GET`
- **CORS:** Server responds with `Access-Control-Allow-Origin: *`, enabling direct browser `fetch()` calls without a proxy.

### Request Signing Rules (CRITICAL)
1. **Parameter Order:** `sign`, `salt` (and `token` for authenticated calls) **must** appear at the very beginning of the query string, in that exact order.
2. **Timestamp (`salt`):** Must be a 10-digit Unix timestamp in **seconds** (`Math.floor(Date.now() / 1000)`). Passing 13-digit milliseconds causes a 32-bit integer overflow on the Java backend (`err: 3, ERR_SYSTEM_EXCEPTION`).
3. **Hashing:** Lowercase hex `SHA-1` (implemented in pure JS inside `index.html` so it works both over `https://` and `file://`).

#### A. Authentication (`action=authSource`)
- **Brand Key:** `company-key=bnrl_frRFjEz8Mkn` (specific to the SmartESS iOS client).
- **Client Params:** `source=1&_app_id_=com.eybond.SmartClientForESS&_app_version_=3.56.0&_app_client_=ios`
- **Query String (`params`):**
  `action=authSource&usr=${usr}&company-key=bnrl_frRFjEz8Mkn&source=1&_app_id_=com.eybond.SmartClientForESS&_app_version_=3.56.0&_app_client_=ios`
- **Signature Formula:**
  `sign = SHA1(salt + SHA1(password) + "&" + params)`
- **Full URL:**
  `https://ios.dessmonitor.com/public/?sign=${sign}&salt=${salt}&${params}`
- **Response (`err === 0`):** Returns `dat: { token, secret, expire, uid, usr, pprAuth }`.

#### B. Authenticated API Calls
- **Signature Formula:**
  `sign = SHA1(salt + secret + token + "&" + params)`
- **Full URL:**
  `https://ios.dessmonitor.com/public/?sign=${sign}&salt=${salt}&token=${token}&${params}`
- **Known Error Codes:**
  - `0`: Success (`dat` contains payload).
  - `3`: `ERR_SYSTEM_EXCEPTION` (usually malformed `salt` or invalid parameter type).
  - `6`: `ERR_SIGN` (signature mismatch).
  - `7` / `8`: Missing required parameter or unknown action.
  - `11` / `257` / `258`: Expired token (trigger automatic re-authentication via `authSource`).

---

## 3. Device Discovery & Telemetry Endpoints

### Hardware Topology Note
- Parallel-connected inverters share a single Master Wi-Fi data logger (`devcode === 0`), which aggregates system telemetry into a single logical device (`devtype = 2304`, `devcode = 2537`, `devaddr = 1`).
- Filter out entries where `Number(d.devcode) === 0` (the Wi-Fi dongle itself) to get actual inverter devices.

### Device Discovery Flow
1. **Primary:** `action=webQueryDeviceEs&pagesize=50&page=0` -> reads `dat.device[]`.
2. **Fallback:**
   - Call `action=queryPlants&pagesize=20&page=0` to get `plant[].pid`.
   - For each `pid`, call `action=queryPlantDeviceDesignatedInformation&plantid=${pid}&devtype=2304&pagesize=50&page=0` (note: `devtype` is mandatory for this action; fallback to `devtype=512` if empty).
3. Extract and cache: `{ alias, pn, sn, devcode, devaddr }`.

### Daily Telemetry & Chart Data (`action=queryDeviceDataOneDayPaging`)
- **Params:** `action=queryDeviceDataOneDayPaging&pn=${pn}&sn=${sn}&devcode=${devcode}&devaddr=${devaddr}&date=${YYYY-MM-DD}&page=${p}&pagesize=100&i18n=en_US`
- **Pagination Rule (CRITICAL):**
  - Even if `pagesize=300` is requested, the SmartESS backend silently caps `pagesize` at **100 rows maximum**.
  - A full 24-hour day produces up to 288 records (5-minute intervals).
  - To retrieve the full 24-hour day, `fetchFullDayData` inspects `dat.total` on `page=0`, calculates `totalPages = Math.ceil(total / 100)` (typically 3 pages: 0, 1, 2), and fetches pages 1 and 2 in parallel.
- **Response Structure:**
  - `dat.title`: Array of column definitions (`{ title, unit }` or strings). Column casing can vary between endpoints (e.g., `Timestamp` vs `timestamp`), so the parser normalizes headers to lowercase and includes positional index fallbacks.
  - `dat.row`: Array of 5-minute interval records ordered **newest-first** (`row[0]` is current telemetry; reverse concatenated array for chronological charts).
- **Key Telemetry Fields:**
  - Status: `Timestamp`, `Current state of machine`, `Equipment type`
  - Battery (16S LiFePO4): `BatVolt` (V), `ChargeCurr` (raw API returns negative for charging and positive for discharging; `parseRows` inverts this so positive = charging, negative = discharging), `BatSoc` (%)
  - Grid & Output: `Mains voltage` (V), `Grid current` (A), `GridFreq` (Hz), `OutVolt` (V), `Load active` (W), `Load apparent power` (VA)
  - Solar (PV): `PvInputVolt` (V), `PvInputCurr` (A), `PV charging power` (W)
  - Temperatures: `Inverter radiator temperature` (°C), `Heat sink B temperature` (°C), `PV radiator temperature` (°C)
  - Daily Totals: `PV power generation on the day` (kWh), `Power consumption from the mains on the day of the load` (kWh), `battery energy today charge` (Wh), `battery energy today discharge` (Wh)

---

## 4. Current Features
- **Hero Power Source Banner & Live Cards:** Displays real-time status **strictly at the current moment** (`● В РЕАЛЬНОМ ВРЕМЕНИ`), showing whether the system is on Grid (Line Mode) or Battery (Outage) with current voltage, SoC, and load.
- **Separation of Live vs. Historical Data:** Navigating through past dates updates the charts, 24h outage ribbon, and telemetry table for that chosen day, while the top KPI cards and banner continue displaying the live status of the inverter right now.
- **Custom Date Navigator:** Replaces default browser input with a custom dark-themed control featuring quick day stepping (`◀` / `▶`), a 1-click `Сегодня` button, localized date formatting (`Сегодня, 12 нояб.`), and an integrated native date picker overlay.
- **Tabbed Dual-View UX:**
  - **★ Главное (Essentials / Mobile-First):**
    1. **Grid Card:** Voltage (V), Frequency (Hz), Current (A), and Grid Status (Online/Offline).
    2. **Battery Card:** SoC (%), dynamic realistic battery icon with level fill, charge indicator (⚡), active power (+W / -W).
    3. **Load Card:** Real-time active load (W), inverter output voltage.
    4. **24h Grid Infographic:** Visual segmented timeline ribbon showing exact outage and online intervals, total uptime vs outage duration, incident counts, daily SoC range (`🔋 АКБ: 64–99%`), and a multi-axis chart correlating Grid Voltage (V), Battery SoC (%), and Frequency (Hz).
    5. **Load & Battery History Chart:** Synchronized active load and battery power curves.
  - **⚙️ Расширенные параметры (Advanced Analytics):**
    - Solar PV strings (Watts, Volts, Amps, daily generation kWh).
    - Inverter and thermal profiling (Inverter, MPPT, Heatsink B temps).
    - Daily energy counters (Grid import kWh, Battery cycle Wh).
    - Time-of-day filters (`00–06`, `06–12`, `12–18`, `18–24`) with drag-to-zoom.
    - Full power balance chart and collapsible 5-minute raw telemetry table.
- **Multi-Language Support (i18n):** Instant switching between Ukrainian (`uk`), Russian (`ru`), and English (`en`) with persistent language selection.
- **Mobile-First UX & Native PWA:**
  - Fixed Native Bottom Navigation Bar on mobile screens (`env(safe-area-inset-bottom)`) for one-thumb reachability.
  - Multi-touch chart pinch-to-zoom and pan via Hammer.js.
  - `manifest.json`, Service Worker (`sw.js`), and high-res vector + PNG app icons for "Add to Home Screen" standalone app mode on iOS and Android.
  - Offline app shell caching with network-first telemetry bypassing.
- **Authentication & Storage:** Modal login with automated inverter discovery, token refresh, and browser-only credential caching (`localStorage`).

---

## 5. Potential Next Steps for Development
- **Live Energy Flow Diagram:** Add an animated SVG node diagram at the top showing real-time power flow direction between Solar, Inverter, Battery, Grid, and Home Load.
- **Battery Autonomy Calculator:** Allow configuring battery bank capacity (Ah/kWh) to estimate remaining backup runtime based on current SoC and rolling average load.
- **Multi-day / Monthly Analytics:** Add weekly/monthly energy aggregation bars (PV generation vs. Grid import vs. Battery cycling).