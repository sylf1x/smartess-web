/**
 * SmartESS Web - Service Worker for PWA Offline Capability & Fast Shell Loading
 */

const CACHE_NAME = "smartess-pwa-v1";

const STATIC_ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/crypto.js",
  "js/i18n.js",
  "js/api.js",
  "js/charts.js",
  "js/app.js",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js",
  "https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js",
  "https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js",
];

// Install Event - Pre-cache application shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// Activate Event - Clean up outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. Dessmonitor Telemetry API calls: Always bypass cache directly to live network
  if (
    url.hostname.includes("dessmonitor.com") ||
    url.pathname.includes("/public/") ||
    url.search.includes("action=")
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return offline JSON error if offline
        return new Response(
          JSON.stringify({
            err: -1,
            desc: "Offline: No connection to Dessmonitor server",
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }),
    );
    return;
  }

  // 2. Static shell assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            event.request.method === "GET"
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    }),
  );
});
