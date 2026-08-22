// Ledger service worker — caches the app shell so it installs and works offline.
// Bump this string whenever index.html changes and you want clients to pick up
// the new version promptly rather than waiting on the stale-while-revalidate fetch.
const CACHE_NAME = "ledger-cache-v1";
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// stale-while-revalidate: serve from cache instantly if we have it, but still
// fetch in the background to refresh the cache for next time. If there's no
// cache entry and the network fails (fully offline, first launch), fall back
// to the app shell itself for navigations so the app still opens.
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req)
        .then(function (res) {
          if (res && res.status === 200) {
            var clone = res.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
          }
          return res;
        })
        .catch(function () {
          return cached || caches.match("./index.html");
        });
      return cached || network;
    })
  );
});
