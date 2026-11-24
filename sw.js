// Offline cache. Network first (always revalidated), so updates arrive when online; the saved copy is used without internet.
const CACHE = "standby-v9";
const FILES = ["./", "index.html", "content.js", "quest.js", "plan.js", "manifest.webmanifest", "icons/favicon-64.png", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "art/c-brumm.webp", "art/c-oma-ilse.webp", "art/c-ylva.webp", "art/castle-map.webp", "art/hillfolk.webp", "art/poster.webp", "art/room-bard.webp", "art/room-gate.webp", "art/room-hall.webp", "art/room-hearth.webp", "art/room-herbs.webp", "art/room-kitchen.webp", "art/room-lantern.webp", "art/room-signal.webp", "art/room-well.webp", "art/room-workshop.webp", "art/v-crows.webp", "art/v-fox.webp", "art/v-gang.webp", "art/v-magpie.webp", "art/v-rats.webp", "art/v-toad.webp", "art/v-troll.webp"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("standby-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  // Revalidate with the server every time (cheap with ETags), so the page and its scripts never mix versions.
  const net = e.request.mode === "navigate" ? fetch(e.request.url, { cache: "no-cache" }) : fetch(e.request, { cache: "no-cache" });
  e.respondWith(net.then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || caches.match("index.html"))));
});
