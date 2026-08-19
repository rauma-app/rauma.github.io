// Pencarian wilayah (kabupaten/kota + kecamatan) di Indonesia.
//
// Riwayat singkat kenapa sumbernya berpindah beberapa kali:
// 1. Nominatim (OSM, awal): crowd-sourced, kelengkapan kecamatan suka bolong.
// 2. emsifa.github.io: datanya lengkap, TAPI ada masalah redirect HTTP
//    (mixed content, diblokir browser di situs HTTPS).
// 3. wilayah.id (live API, sempat dipakai): datanya lengkap DAN resmi,
//    TAPI karena situs kita perlu narik ~514 kabupaten + ~7000 kecamatan
//    lewat ratusan request HTTP tiap kali data belum ke-cache, sekali
//    aja ada 1 request yang gagal (server lagi lambat sedetik doang --
//    wajar buat API gratisan), kecamatan di 1 kabupaten itu HILANG dan
//    ke-cache selama 30 hari seolah lengkap. Ini yang bikin masalahnya
//    kelihatan "pindah-pindah" (kadang Purwakarta, kadang Bandung Barat)
//    tergantung request mana yang kebetulan gagal hari itu.
// 4. idn-area-data (SEKARANG): package npm resmi (sumber Kemendagri),
//    datanya IKUT TERBUNDEL LANGSUNG ke dalam situs pas di-build --
//    BUKAN diambil dari server luar tiap kali orang search. Jadi:
//      - Nggak ada request internet yang bisa gagal -> gak mungkin ada
//        kecamatan yang "hilang" random lagi.
//      - Pencarian jadi INSTAN (tinggal filter array di memori),
//        gak ada jeda nunggu network sama sekali.
//      - Gak butuh localStorage cache 30 hari yang rawan nyimpen data
//        rusak/gak lengkap.
//
// Koordinat (lat/lon) TETAP dicari lewat Nominatim (OSM) -- itu bukan
// bagian yang bermasalah, dan cuma dipanggil SEKALI per pemilihan lokasi
// (bukan tiap ketikan), jadi aman dibiarkan seperti semula.

import { getProvinces, getRegencies, getDistricts } from 'idn-area-data';

function titleCase(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// --- Load SEKALI aja pas module ini pertama kali dipakai. Semua data
//     (34 provinsi, ~514 kabupaten/kota, ~7000 kecamatan) udah nempel di
//     dalam bundle JS situs -- getProvinces/getRegencies/getDistricts di
//     bawah ini BUKAN fetch ke server luar, cuma baca data yang udah
//     kebawa pas situs di-build. ---
let loadPromise = null;
let districtsFlat = null; // [{ name, kabupaten, regencyCode, provinceName }]
let regenciesFlat = null; // [{ code, name, province_name }]
let loaded = false;

async function loadAll() {
  if (loaded) return true;
  if (!loadPromise) {
    loadPromise = (async () => {
      const [provinces, regencies, districts] = await Promise.all([
        getProvinces(),
        getRegencies(),
        getDistricts(),
      ]);

      const provinceNameByCode = new Map(provinces.map((p) => [p.code, p.name]));
      const regencyByCode = new Map(regencies.map((r) => [r.code, r]));

      regenciesFlat = regencies.map((r) => ({
        code: r.code,
        name: r.name,
        province_name: provinceNameByCode.get(r.province_code) || '',
      }));

      districtsFlat = districts.map((d) => {
        const regency = regencyByCode.get(d.regency_code);
        return {
          name: d.name,
          kabupaten: regency?.name || '',
          regencyCode: d.regency_code,
          provinceName: (regency && provinceNameByCode.get(regency.province_code)) || '',
        };
      });

      loaded = true;
      return true;
    })().catch((err) => {
      // Jaga-jaga banget kalau paketnya somehow gagal load (harusnya
      // gak pernah kejadian karena datanya lokal, bukan network) --
      // reset biar percobaan berikutnya coba lagi, bukan nyangkut gagal
      // selamanya.
      loadPromise = null;
      console.warn('Gagal memuat data wilayah (idn-area-data):', err);
      throw err;
    });
  }
  return loadPromise;
}

/** Apakah data wilayah sudah selesai dimuat. */
export function isDistrictsFullyLoaded() {
  return loaded;
}

// Mulai load di background begitu module ini dipakai pertama kali (misal
// pas LocationAutocomplete di-mount). Karena datanya lokal/terbundel,
// biasanya kelar dalam hitungan puluhan milidetik -- jauh lebih cepat
// dari versi lama yang nunggu ratusan request network.
let backgroundPrefetchStarted = false;
export function ensureBackgroundPrefetch() {
  if (backgroundPrefetchStarted) return;
  backgroundPrefetchStarted = true;
  loadAll().catch(() => {});
}

/**
 * Cari kandidat lokasi (kecamatan, atau kabupaten/kota) di Indonesia.
 * Hasil kecamatan ditampilkan lebih dulu, baru kabupaten/kota.
 * @param {string} query
 * @returns {Promise<Array<{label, kabupaten, kecamatan, regencyCode, provinceName}>>}
 */
export async function searchWilayah(query) {
  if (!query || query.trim().length < 3) return [];
  const q = query.toLowerCase().trim();

  try {
    await loadAll();
  } catch {
    return [];
  }

  const results = [];
  const seen = new Set();

  // 1) Kecamatan dulu.
  for (const dist of districtsFlat) {
    if (!dist.name.toLowerCase().includes(q)) continue;
    const label = `${titleCase(dist.name)} - ${titleCase(dist.kabupaten)}`;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      label,
      kabupaten: titleCase(dist.kabupaten),
      kecamatan: titleCase(dist.name),
      regencyCode: dist.regencyCode,
      provinceName: dist.provinceName,
    });
    if (results.length >= 10) break;
  }

  // 2) Baru kabupaten/kota.
  if (results.length < 10) {
    for (const r of regenciesFlat) {
      if (!r.name.toLowerCase().includes(q)) continue;
      const label = titleCase(r.name);
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        label,
        kabupaten: titleCase(r.name),
        kecamatan: '',
        regencyCode: r.code,
        provinceName: r.province_name,
      });
      if (results.length >= 10) break;
    }
  }

  return results;
}

/**
 * Cari koordinat (lat/lon) untuk satu lokasi yang SUDAH dipilih user dari
 * searchWilayah(). Dipanggil sekali per pemilihan, bukan per ketikan.
 * (Ini bagian yang TIDAK bermasalah sebelumnya, jadi dibiarkan sama.)
 */
export async function geocodeWilayah({ kecamatan, kabupaten, provinceName }) {
  const parts = [kecamatan, kabupaten, provinceName, 'Indonesia'].filter(Boolean);
  const q = parts.join(', ');

  try {
    const params = new URLSearchParams({
      q,
      format: 'jsonv2',
      countrycodes: 'id',
      limit: '1',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'Accept-Language': 'id' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data[0]) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
    }
  } catch {
    // lanjut ke fallback di bawah
  }

  // Fallback: kalau level kecamatan gagal ketemu koordinatnya, coba lagi
  // cuma level kabupaten (biasanya lebih gampang ketemu di Nominatim).
  if (kecamatan) {
    return geocodeWilayah({ kecamatan: '', kabupaten, provinceName });
  }
  return null;
}

/** Jarak antara 2 koordinat (haversine), hasil dalam km. */
export function distanceKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v == null || Number.isNaN(v))) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
