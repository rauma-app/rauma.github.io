// Service worker minimal buat Rauma PWA. Tujuannya cuma 2:
//  1. Memenuhi syarat "installable" di Chrome/Edge (wajib ada service
//     worker dengan fetch handler).
//  2. Cache app-shell dasar (logo, ikon, manifest) biar buka lebih kenceng
//     & ikon tetap muncul walau internet lagi lambat.
//
// Ini SENGAJA tidak dibuat full offline-first, karena data listing di
// situs ini selalu berubah (harga baru, listing baru) -- kalau di-cache
// agresif, orang bisa lihat data basi. Jadi selain app-shell, semua
// request lain langsung tembus ke network seperti biasa (network-first).

const CACHE_NAME = 'rauma-shell-v1';
const APP_SHELL = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Cuma cache-first buat app-shell (GET, same-origin, ada di daftar).
  const url = new URL(request.url);
  const isShellAsset = request.method === 'GET' && url.origin === self.location.origin && APP_SHELL.includes(url.pathname);

  if (isShellAsset) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Selain itu (termasuk semua API/data listing): network seperti biasa.
});
