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

// Kata-kata prefix administratif Indonesia yang sering bikin pencarian ke
// Nominatim gagal match (data OSM biasanya cuma nyimpen nama tempatnya
// doang, tanpa embel-embel "Kec"/"Kabupaten" di depannya).
const ADMIN_PREFIX_RE = /\b(kec\.?|kecamatan|kab\.?|kabupaten|kota|kel\.?|kelurahan|desa)\b/gi;

function cleanQuery(query) {
  return query.replace(ADMIN_PREFIX_RE, '').replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
}

async function fetchNominatim(query) {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    namedetails: '1',
    countrycodes: 'id',
    'accept-language': 'id',
    limit: '10',
  });

  const res = await fetch(`${BASE_URL}?${params.toString()}`, {
    headers: {
      // Nominatim usage policy: identify the application.
      'Accept-Language': 'id',
    },
  });

  if (!res.ok) return [];
  return res.json();
}

/**
 * Cari kandidat lokasi (kota/kabupaten + kecamatan) di Indonesia.
 * @param {string} query
 * @returns {Promise<Array<{label, kabupaten, kecamatan, lat, lon}>>}
 */
export async function searchLocation(query) {
  if (!query || query.trim().length < 3) return [];

  const cleaned = cleanQuery(query);
  // Kalau user nulis pola "Ciasem, Kabupaten Subang", ambil bagian nama
  // kabupaten/kota-nya buat jadi acuan disambiguasi hasil nanti.
  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  const hintedArea = parts.length > 1 ? parts[parts.length - 1] : null;

  let data = await fetchNominatim(cleaned);

  // Fallback: kalau query gabungan gak ketemu apa-apa (kasus "Ciasem" yang
  // hilang total), coba lagi cuma pakai nama tempat paling spesifiknya saja.
  if (data.length === 0 && parts.length > 1) {
    data = await fetchNominatim(parts[0]);
  }

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

  // Disambiguasi: kalau user nyebut nama kabupaten/kota di query-nya (misal
  // "Kabupaten Subang"), dahulukan hasil yang kabupatennya benar-benar
  // cocok -- biar gak ketuker sama tempat senama di kabupaten lain
  // (kasus "Binong, Subang" vs "Binong, Cilegon").
  if (hintedArea) {
    const hint = hintedArea.toLowerCase();
    results.sort((a, b) => {
      const aMatch = a.kabupaten.toLowerCase().includes(hint) ? 0 : 1;
      const bMatch = b.kabupaten.toLowerCase().includes(hint) ? 0 : 1;
      return aMatch - bMatch;
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
