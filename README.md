# ⚡ SmartESS Web Dashboard

A personal, lightweight, and mobile-first Progressive Web Application (PWA) designed for fast, seamless, and convenient daily monitoring of hybrid solar inverters.

[![Personal Project](https://img.shields.io/badge/Project-Personal%20Dashboard-blueviolet)](#-why-this-project-exists)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-blue?logo=github)](https://sylf1x.github.io/smartess-web/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple?logo=pwa)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Zero Backend](https://img.shields.io/badge/Backend-100%25%20Static%20Client-green)](#architecture)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Disclaimer:** This is an independent personal project created for convenient private home solar monitoring. It is not an official product and is not affiliated with or endorsed by Eybond or SmartESS.

---

## 💡 Why This Project Exists

This is a **personal project** created to provide a significantly faster, cleaner, and more convenient daily experience than the official SmartESS mobile app and web portal:

- **Instant One-Tap Access:** Rather than waiting for a heavy mobile app to launch and log in, this dashboard runs as an installable standalone PWA directly from your phone's home screen.
- **Clear Power Outage Visibility:** Living with frequent grid outages requires knowing *instantly* when power was cut, how long it lasted, and how the battery handled it. The 24-hour visual ribbon highlights exact outage intervals at a single glance.
- **No Annoying Mobile Tooltips:** On touchscreens, floating tooltip bubbles cover the line you're trying to see and get hidden beneath your thumb. This project replaces them with smooth horizontal finger-scrubbing and an unobscured data bar directly underneath each chart.
- **Privacy & Simplicity:** 100% client-side with zero middleman servers. Credentials and tokens remain exclusively in your own browser's local storage.

---

## 🌟 Highlights & Key Features

### 1. ⚡ Live Real-Time Inverter Telemetry
- **Dynamic Hero Status Banner:** Instant identification of the active power source (**Mains Grid Online** vs. **Grid Outage / Battery Backup**) with animated power indicators.
- **Visual Battery Gauge:** Realistic LiFePO4 battery representation with dynamic fill level, charging pulse animation, SoC percentage, and real-time power rate ($+W$ charge / $-W$ discharge).
- **Core KPIs:** Live grid voltage, frequency, input current, inverter output voltage, and active house load.
- **Strict Separation of Live vs. Historical Data:** Real-time conditions are pinned at the top (`● В РЕАЛЬНОМУ ЧАСІ` / `● LIVE`), while date navigation operates strictly on historical records.

### 2. 📊 24-Hour Grid & Outage Infographic
- **Segmented Timeline Ribbon:** Color-coded 24-hour visual ribbon displaying mains availability:
  - 🟢 **Online ($\ge$ 180V):** Normal grid supply.
  - 🟠 **Unstable (< 180V):** Grid brownout / low voltage conditions.
  - 🔴 **Grid Outage (0V):** Power outage with exact start/end timestamps and duration.
- **Summary Metrics:** Total online uptime, total outage duration, outage incident counters, voltage range ($\text{min}–\text{max}$ V), and battery SoC fluctuation range.

### 3. 👆 Touch & Mouse Scrubbing (No Cluttering Tooltips)
- **Zero Tooltip Overlap:** Obtrusive floating tooltips that cover graph lines and get obscured by fingers are completely disabled across all charts.
- **Hardware-Accelerated Crosshair:** Smooth vertical line tracker (`.chart-scrubber-line`) that follows cursor or finger gestures.
- **Positive-Only House Load & Battery Power Graph:** Battery power on the main history chart is restricted strictly to positive numbers (`min: 0`), dynamically styling charging in green and discharging in amber, eliminating redundant negative scales.
- **Dedicated Information Panels:** Readout bars located directly beneath each graph update in real-time with tabular precision:
  - **Grid & Battery Chart:** Time · Mains Voltage (V) · Battery SoC (%) · Frequency (Hz) · Equipment Mode.
  - **House Load & Battery Power Chart:** Time · House Load (W) · Battery Power (W) · Equipment Mode.
  - **Full Power Balance Chart (Advanced Tab):** Time · Solar PV (W) · Apparent Load (VA) · Active Load (W) · Battery Power (W) · Equipment Mode.
  - **Thermal Profile Chart (Advanced Tab):** Time · Inverter Radiator Temp (°C) · Heat Sink B Temp (°C) · MPPT / PV Radiator Temp (°C).
- **Mobile-Optimized Geometry:** Crowded vertical Y-axis labels (Volts, SoC %, Hz, and Watts) are hidden on mobile screens ($\le 768\text{px}$) so graph lines extend edge-to-edge across the screen.

### 4. 🔋 Battery Energy & Performance Statistics Tab
- **Wh & Ah Integration:** Numerical integration over 5-minute telemetry intervals calculates total energy discharged and charged in Watt-hours (`Wh` / `kWh`) as well as capacity in Ampere-hours (`Ah`).
- **Peak & Average Metrics:** Peak power (`W`), peak current (`A`), average power, average current, average discharge/charge voltage (`V`), and duration.
- **Cycle Efficiency & Balance:** Net energy balance, cycle energy efficiency (% Wh), coulombic efficiency (% Ah), and SoC change ($\Delta\text{SoC}$).
- **Outage Preset Chips:** Automatically detects power cuts for the day and creates instant one-tap buttons (e.g. `🔴 #1: 10:15–14:20 (4h 05m)`) to isolate battery consumption for specific outages.
- **Custom Time Filtering:** Select any custom time window (`From` / `To`) with instant recalculation.
- **Hourly Energy Distribution Chart:** Visual bar chart showing hourly energy distribution with an interactive `[ Wh ]` / `[ Ah ]` toggle.

### 5. 📅 Intuitive Daily History Navigation
- **Synchronized History Toolbars:** Date selector components across the Main, Statistics, and Advanced tabs stay in sync:
  ```
  📅 Історія за день:    ◀ [ 📅 Сьогодні ▾ ] ▶  [ Сьогодні ]
  ```
- **Quick Stepping:** One-click previous (`◀`) and next (`▶`) day navigation.
- **Native Calendar Picker:** Seamless calendar modal overlay for jumping directly to any historical date on desktop and mobile (iOS & Android).

### 6. 🌍 Trilingual Localization (i18n) & Localized Engineering Units
- Instant on-the-fly language switching between **Ukrainian (UA, default)**, **Russian (RU)**, and **English (EN)** without page reloads.
- Standardized engineering units adapted to each locale:
  - English: `V`, `W`, `VA`, `Hz`, `kWh`, `Wh`, `Ah`, `A`, `°C`, `h`, `m`.
  - Ukrainian: `В`, `Вт`, `ВА`, `Гц`, `кВт·год`, `Вт·год`, `А·год`, `А`, `°C`, `год`, `хв`.
  - Russian: `В`, `Вт`, `ВА`, `Гц`, `кВт·ч`, `Вт·ч`, `А·ч`, `А`, `°C`, `ч`, `мин`.

### 7. 📱 Mobile-First Ergonomics & PWA
- **Native Bottom Navigation Bar:** Ergonomically placed within natural thumb reach with 3 tabs (`★ Overview`, `📊 Statistics`, `⚙️ Advanced`), respecting `env(safe-area-inset-bottom)`.
- **Notch & Dynamic Island Ready:** Header spacing automatically accounts for modern phone cutouts via `env(safe-area-inset-top)`.
- **Installable Web App:** Complete with `manifest.json`, Service Worker caching (`sw.js`), standalone window mode, and crisp vector (`.svg`) and raster (`.png`) icons for iOS Safari and Android Chrome home screen installation.

### 8. 🔒 Zero-Backend Security & Privacy
- **Direct Cloud Communication:** Calls the Eybond API directly from your browser via reverse-engineered SHA-1 request signatures.
- **No Intermediate Servers:** Telemetry data flows directly between your device and the inverter cloud.
- **Local Credentials:** User login and discovered device IDs are stored exclusively in your browser's private `localStorage`. Zero telemetry, zero analytics, zero external logging.

---

## 🛠️ Hardware & Protocol Compatibility

Tested and optimized for hybrid off-grid / grid-tie inverters connected through Eybond Wi-Fi data loggers:
- **Inverters:** `IGRID-VX-IV-5.6KW-WIFI`, `HFP4856S100-H`, PowMr, EASun, Anern, SRNE, and similar hybrid models communicating via SmartESS / Dessmonitor.
- **Datalogger:** Eybond Wi-Fi Stick / Logger (`devcode: 0`, Master logger bridging Inverter `devcode: 2537`, `devaddr: 1`).
- **Cloud API Host:** `https://ios.dessmonitor.com/public/`

---

## 📁 Repository Structure

```text
smartess-web/
├── index.html          # Clean semantic markup and accessible dialog modals
├── manifest.json       # Progressive Web App (PWA) configuration
├── sw.js               # Service Worker for offline app-shell caching
├── css/
│   └── style.css       # Responsive dark-theme design, CSS Grid, mobile layout
├── js/
│   ├── crypto.js       # Standalone pure JS SHA-1 hashing algorithm
│   ├── i18n.js         # Multi-language dictionary and reactive language events
│   ├── api.js          # Authentication, SHA-1 signing, discovery, row parsing
│   ├── charts.js       # Chart.js visualization, synchronized touch scrubbers
│   └── app.js          # DOM orchestration, auto-refresh, date navigation
└── icons/              # Vector SVG & PNG PWA application icons
    ├── icon.svg
    ├── icon-192.png
    ├── icon-512.png
    └── apple-touch-icon.png
```

---

## 🚀 Getting Started

### Option 1: Live GitHub Pages
Visit your hosted repository at:
```text
https://<your-username>.github.io/smartess-web/
```

### Option 2: Running Locally
Since this is a 100% static project with no build steps or dependencies:

1. Clone the repository:
   ```bash
   git clone https://github.com/sylf1x/smartess-web.git
   cd smartess-web
   ```

2. Serve with any lightweight HTTP server:
   ```bash
   # Using Python 3:
   python -m http.server 8080

   # Or using Node.js:
   npx serve .
   ```

3. Open your browser at `http://localhost:8080` and log in with your SmartESS account credentials.

---

## ⚙️ How It Works (Technical Overview)

1. **Authentication:**
   Computes a double SHA-1 signature using a 10-digit Unix timestamp (`salt`), your password, and the SmartESS client brand key (`company-key=bnrl_frRFjEz8Mkn`). The server returns a session `token` and `secret`.
2. **Device Auto-Discovery:**
   Queries `action=webQueryDeviceEs` and falls back to plant-level queries to detect connected data loggers and inverters, automatically filtering out logger dongles to identify the active inverter unit.
3. **Full-Day Telemetry Pagination:**
   The SmartESS backend enforces a maximum page size of 100 records per request. A full 24-hour day yields up to 288 records (5-minute resolution). The application automatically checks `total` on page 0 and fetches remaining pages in parallel to construct an uninterrupted 24-hour dataset.
4. **Touch-Tracking Architecture:**
   Touch coordinates are translated to data indices via Chart.js scale interpolators without triggering expensive canvas redraws, achieving 60 FPS scrubbing across complex multi-dataset curves.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
Feel free to fork, adapt, and use it to monitor your home solar installation!
