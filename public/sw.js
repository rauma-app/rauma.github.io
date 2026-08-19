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
//
// PENTING: "/" (halaman utama) SENGAJA TIDAK di-cache-first lagi.
// Kenapa: halaman utama memuat file JS dengan nama unik yang berubah
// tiap kali situs di-update (mis. index-1vORzV7q.js -> index-abc123.js).
// Kalau "/" di-cache-first, browser bisa nyangkut pakai HTML versi lama
// yang manggil file JS lama yang sudah tidak ada di server -> halaman
// jadi blank sampai user clear cache manual. Makanya "/" sekarang
// network-first: selalu coba ambil versi terbaru dulu, baru pakai
// cache sebagai cadangan kalau lagi offline.
const CACHE_NAME = 'rauma-shell-v2';
// Cache terpisah buat file hasil build Vite (/assets/*.js, /assets/*.css).
// Nama file-file ini SUDAH mengandung hash konten (mis. ImageSlider-B9VUp9i4.css),
// jadi aman di-cache selama-lamanya: begitu isinya berubah, nama filenya
// otomatis ikut berubah -- gak akan pernah ketuker sama versi lama.
// Ini yang bikin lazy-loaded chunk (ImageSlider, halaman-halaman lazy() di
// App.jsx, dst) tetap bisa dibuka lagi walau offline, bukan cuma mengandalkan
// HTTP cache bawaan browser yang gak dijamin bertahan antar sesi.
const ASSET_CACHE_NAME = 'rauma-assets-v1';
const APP_SHELL = ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];
const NETWORK_FIRST_PATHS = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== ASSET_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (request.method !== 'GET' || !isSameOrigin) return;

  // Halaman utama: SELALU coba network. Kalau gagal (offline), SENGAJA
  // TIDAK di-fallback ke cache lagi -- biar browser nunjukin halaman
  // "Tidak dapat dijangkau" bawaan yang jelas, bukan HTML shell lama yang
  // manggil file JS/CSS ter-hash (misal ImageSlider-xxxx.css) yang gak
  // ikut ke-cache -> ujung-ujungnya malah nyangkut di ErrorBoundary
  // dengan pesan teknis yang bikin bingung dikira situsnya rusak.
  if (NETWORK_FIRST_PATHS.includes(url.pathname)) {
    event.respondWith(fetch(request));
    return;
  }

  // Ikon/manifest: cache-first (aman, jarang/gak pernah berubah).
  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // File hasil build (JS/CSS ter-hash di /assets/) termasuk chunk lazy-load
  // kayak ImageSlider: cache-first + simpan ke cache buat dipakai lagi nanti.
  // Ini yang bikin app-nya beneran bisa jalan offline (nampilin yang sudah
  // pernah di-load), bukan cuma bergantung ke HTTP cache bawaan browser.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(ASSET_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Selain itu (termasuk semua API/data listing): network seperti biasa.
});
