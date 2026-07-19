// Pencarian lokasi gratis pakai Nominatim (OpenStreetMap) — tidak perlu API key.
// Dibatasi ke wilayah Indonesia dan level administratif kota/kabupaten +
// kecamatan saja (bukan alamat jalan/patokan).
//
// Catatan penting untuk deployment:
// - Nominatim punya kebijakan pemakaian wajar (max ~1 request/detik,
//   wajib kirim header/identitas aplikasi). Untuk trafik tinggi,
//   pertimbangkan self-host Nominatim atau pindah ke provider berbayar
//   (Google Places, Mapbox, dst).
// - https://operations.osmfoundation.org/policies/nominatim/

const BASE_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Cari kandidat lokasi (kota/kabupaten + kecamatan) di Indonesia.
 * @param {string} query
 * @returns {Promise<Array<{label, kabupaten, kecamatan, lat, lon}>>}
 */
export async function searchLocation(query) {
  if (!query || query.trim().length < 3) return [];

  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    namedetails: '1',
    countrycodes: 'id',
    'accept-language': 'id',
    limit: '8',
  });

  const res = await fetch(`${BASE_URL}?${params.toString()}`, {
    headers: {
      // Nominatim usage policy: identify the application.
      'Accept-Language': 'id',
    },
  });

  if (!res.ok) return [];
  const data = await res.json();

  const seen = new Set();
  const results = [];

  for (const item of data) {
    const addr = item.address || {};
    const kabupaten =
      addr.city || addr.regency || addr.county || addr.municipality || '';

    // Kandidat level kecamatan dari struktur alamat OSM.
    let kecamatan =
      addr.suburb || addr.city_district || addr.district || addr.subdistrict ||
      addr.town || addr.village || '';

    // Nama tempat yang benar-benar cocok dengan pencarian user kadang tidak
    // muncul di "address" (misal kecamatan seperti "Cililin" hanya muncul
    // sebagai nama hasil pencarian, bukan sebagai field address). Pakai itu
    // sebagai kecamatan kalau lebih spesifik daripada yang sudah ada.
    const matchedName = item.namedetails?.name || item.display_name?.split(',')[0]?.trim() || '';
    if (matchedName && matchedName.toLowerCase() !== kabupaten.toLowerCase()) {
      kecamatan = matchedName;
    }

    if (kecamatan && kabupaten && kecamatan.toLowerCase() === kabupaten.toLowerCase()) {
      kecamatan = '';
    }

    // Hanya ambil hasil yang setidaknya punya kota/kabupaten.
    if (!kabupaten) continue;

    const label = kecamatan ? `${kecamatan} - ${kabupaten}` : kabupaten;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      label,
      kabupaten,
      kecamatan,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    });
  }

  return results;
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
