const CACHE_NAME = "eduorient-v11";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./language.js",
  "./theme.js",
  "./eduorient-core.js",
  "./assistant-config.js",
  "./assistant.css",
  "./assistant.html",
  "./assistant.js",
  "./manifest.webmanifest",
  "./orientation.html",
  "./orientation.css",
  "./orientation.js",
  "./orientation-data.js",
  "./school.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const file of FILES_TO_CACHE) {
        try { await cache.add(file); } catch (error) { console.warn("Fichier non mis en cache :", file, error); }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (cacheNames) => {
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith("eduorient-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) return cachedResponse;
      if (event.request.mode === "navigate") {
        const homePage = await caches.match("./index.html");
        if (homePage) return homePage;
      }
      return new Response("Contenu indisponible hors connexion.", {
        status: 503, statusText: "Service Unavailable", headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});
