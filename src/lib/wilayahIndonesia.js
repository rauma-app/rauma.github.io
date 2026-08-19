// Pencarian wilayah (kabupaten/kota + kecamatan) pakai data resmi
// BPS/Kemendagri (via emsifa/api-wilayah-indonesia, di-hosting gratis di
// GitHub Pages) -- BUKAN Nominatim/OpenStreetMap lagi.
//
// Kenapa ganti dari Nominatim:
// - Nominatim itu crowd-sourced (OSM), jadi kelengkapan kecamatan di
//   Indonesia suka bolong -- kadang bahkan nama kabupatennya sendiri
//   nggak ketemu (misal Purwakarta).
// - Dataset ini dari BPS/Kemendagri lewat GitHub Pages punya SEMUA
//   38 provinsi, 514 kab/kota, dan ~7.300 kecamatan -- dijamin lengkap.
//
// Koordinat (lat/lon) tetap dicari lewat Nominatim, TAPI cuma sekali per
// pemilihan lokasi (bukan tiap ketikan), dan query-nya sudah nama resmi
// yang rapi (bukan input mentah user) -- jauh lebih besar peluang berhasil.

const API_BASE = 'https://emsifa.github.io/api-wilayah-indonesia/api';
const REGENCIES_CACHE_KEY = 'rauma_wilayah_regencies_v1';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari -- data wilayah jarang berubah

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal fetch ${url}: ${res.status}`);
  return res.json();
}

function titleCase(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// --- Daftar kabupaten/kota se-Indonesia, di-cache di localStorage supaya
//     pencarian berikutnya instan tanpa network call lagi. ---
let regenciesPromise = null;

async function loadRegencies() {
  try {
    const cached = JSON.parse(localStorage.getItem(REGENCIES_CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS && Array.isArray(cached.data)) {
      return cached.data;
    }
  } catch {
    // localStorage penuh/diblokir -- lanjut fetch biasa aja.
  }

  if (!regenciesPromise) {
    regenciesPromise = (async () => {
      const provinces = await fetchJson(`${API_BASE}/provinces.json`);
      const perProvince = await Promise.all(
        provinces.map((p) =>
          fetchJson(`${API_BASE}/regencies/${p.id}.json`)
            .then((list) => list.map((r) => ({ ...r, province_name: p.name })))
            .catch(() => []) // 1 provinsi gagal fetch -- skip, jangan gagalin semua
        )
      );
      const all = perProvince.flat();
      try {
        localStorage.setItem(
          REGENCIES_CACHE_KEY,
          JSON.stringify({ savedAt: Date.now(), data: all })
        );
      } catch {
        // Diamkan kalau localStorage penuh -- tetap jalan, cuma gak ke-cache.
      }
      return all;
    })().catch((err) => {
      // Kalau gagal total (misal provinces.json aja gak bisa diambil --
      // jaringan lagi bermasalah), JANGAN nyimpen promise yang reject ini
      // selamanya di variable module-level, soalnya bakal bikin SEMUA
      // pencarian berikutnya ikut gagal instan tanpa nyoba fetch ulang.
      // Reset supaya percobaan berikutnya fetch dari awal lagi.
      regenciesPromise = null;
      console.warn('Gagal memuat daftar kabupaten/kota:', err);
      return [];
    });
  }
  return regenciesPromise;
}

// --- Daftar kecamatan per kabupaten, di-fetch on-demand & di-cache. ---
const districtsMemCache = new Map();

async function loadDistricts(regencyId) {
  if (districtsMemCache.has(regencyId)) return districtsMemCache.get(regencyId);

  const cacheKey = `rauma_wilayah_districts_${regencyId}`;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (Array.isArray(cached)) {
      districtsMemCache.set(regencyId, cached);
      return cached;
    }
  } catch {
    // ignore
  }

  const data = await fetchJson(`${API_BASE}/districts/${regencyId}.json`).catch(() => []);
  districtsMemCache.set(regencyId, data);
  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch {
    // ignore
  }
  return data;
}

/**
 * Cari kandidat lokasi (kabupaten/kota + kecamatan) di Indonesia, dari data
 * resmi BPS/Kemendagri -- dijamin lengkap (beda dari Nominatim yang crowd-sourced).
 * @param {string} query
 * @returns {Promise<Array<{label, kabupaten, kecamatan, regencyId, provinceName}>>}
 */
export async function searchWilayah(query) {
  if (!query || query.trim().length < 3) return [];
  const q = query.toLowerCase().trim();

  try {
    const regencies = await loadRegencies();

    const matchedRegencies = regencies
      .filter((r) => r.name.toLowerCase().includes(q))
      .slice(0, 8);

    // Supaya kecamatan juga bisa ke-search tanpa harus fetch kecamatan dari
    // ke-514 kabupaten sekaligus, kita cuma cek kecamatan dari: kabupaten yang
    // cocok query di atas, ditambah kabupaten yang datanya udah pernah
    // di-fetch sebelumnya (dari pencarian2 lain di sesi ini).
    const regencyIdsToCheck = new Set(matchedRegencies.map((r) => r.id));
    for (const id of districtsMemCache.keys()) regencyIdsToCheck.add(id);

    const districtLists = await Promise.all(
      [...regencyIdsToCheck].map((id) => loadDistricts(id).then((d) => ({ id, d })))
    );

    const results = [];
    const seen = new Set();

    for (const { id, d } of districtLists) {
      const regency = regencies.find((r) => r.id === id);
      if (!regency) continue;
      for (const dist of d) {
        if (!dist.name.toLowerCase().includes(q)) continue;
        const label = `${titleCase(dist.name)} - ${titleCase(regency.name)}`;
        const key = label.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({
          label,
          kabupaten: titleCase(regency.name),
          kecamatan: titleCase(dist.name),
          regencyId: regency.id,
          provinceName: regency.province_name,
        });
      }
    }

    for (const r of matchedRegencies) {
      const label = titleCase(r.name);
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        label,
        kabupaten: titleCase(r.name),
        kecamatan: '',
        regencyId: r.id,
        provinceName: r.province_name,
      });
    }

    return results.slice(0, 10);
  } catch (err) {
    // Apapun yang gagal di atas (network, parsing, dll), JANGAN sampai
    // error ini nyangkut sampai ke pemanggil tanpa ke-handle -- itu yang
    // bikin spinner "Mencari lokasi..." nyangkut selamanya di UI.
    console.warn('searchWilayah gagal:', err);
    return [];
  }
}

/**
 * Cari koordinat (lat/lon) untuk satu lokasi yang SUDAH dipilih user dari
 * searchWilayah(). Dipanggil sekali per pemilihan, bukan per ketikan.
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
