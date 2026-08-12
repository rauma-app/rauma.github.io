// Parser query pencarian bahasa natural, misal:
//   "rumah 200jt an di bandung"      -> harga 200-299jt, lokasi "bandung"
//   "rumah 500jt an di batujajar"    -> harga 500-599jt, lokasi "batujajar"
//   "rumah di bawah 300jt bandung"   -> maxPrice 300jt, lokasi "bandung"
//   "rumah 200-300jt cimahi"         -> range 200-300jt, lokasi "cimahi"
//
// Dipakai di halaman /cari/:slug (lihat src/pages/Cari.jsx) supaya URL,
// judul <title>, dan H1 halaman semuanya cocok persis dengan yang diketik
// orang di Google -- ini yang bikin halaman gampang nyantol di hasil
// pencarian buat query long-tail semacam "rumah 200jt di bandung".

function unitMultiplier(unit) {
  if (/^(jt|juta|jutaan)$/.test(unit)) return 1_000_000;
  if (/^(m|miliar|milyar|milyaran|miliaran)$/.test(unit)) return 1_000_000_000;
  return 1;
}

function formatHargaLabel(value) {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} M`;
  }
  return `${Math.round(value / 1_000_000)} jt`;
}

// Bucket "jutaan/miliaran": 200jt -> range 200-299jt, 1.2M -> range 1.2-1.29M
function bucketRange(value) {
  const base = Math.floor(value / 100_000_000) * 100_000_000;
  return { min: base, max: base + 99_000_000 };
}

const UNIT = 'jt|juta|jutaan|m|miliar|milyar|milyaran|miliaran';

export function parseSearchQuery(rawText) {
  const text = (rawText || '').trim();
  if (!text) {
    return { minPrice: null, maxPrice: null, location: '', priceLabel: '', locationLabel: '', raw: '' };
  }

  let working = ` ${text.toLowerCase()} `;
  let minPrice = null;
  let maxPrice = null;
  let priceLabel = '';

  // 1) Range eksplisit: "200-300jt" / "200 sampai 300 juta"
const rangeRe = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:-|–|sampai|s\\.?d\\.?|hingga|\\s+)\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNIT})\\b`);
  const rangeMatch = working.match(rangeRe);

  const underRe = new RegExp(`(di\\s*bawah|maksimal|maks|kurang\\s*dari)\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNIT})\\b`);
  const overRe = new RegExp(`(di\\s*atas|minimal|min|lebih\\s*dari)\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNIT})\\b`);
  const singleRe = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${UNIT})\\b\\s*(an\\b)?`);

  if (rangeMatch) {
    const mult = unitMultiplier(rangeMatch[3]);
    const a = parseFloat(rangeMatch[1].replace(',', '.')) * mult;
    const b = parseFloat(rangeMatch[2].replace(',', '.')) * mult;
    minPrice = Math.min(a, b);
    maxPrice = Math.max(a, b);
    priceLabel = `${formatHargaLabel(minPrice)} - ${formatHargaLabel(maxPrice)}`;
    working = working.replace(rangeMatch[0], ' ');
  } else {
    let m = working.match(underRe);
    if (m) {
      const mult = unitMultiplier(m[3]);
      maxPrice = parseFloat(m[2].replace(',', '.')) * mult;
      priceLabel = `di bawah ${formatHargaLabel(maxPrice)}`;
      working = working.replace(m[0], ' ');
    } else if ((m = working.match(overRe))) {
      const mult = unitMultiplier(m[3]);
      minPrice = parseFloat(m[2].replace(',', '.')) * mult;
      priceLabel = `di atas ${formatHargaLabel(minPrice)}`;
      working = working.replace(m[0], ' ');
    } else if ((m = working.match(singleRe))) {
      const mult = unitMultiplier(m[2]);
      const value = parseFloat(m[1].replace(',', '.')) * mult;
      const { min, max } = bucketRange(value);
      minPrice = min;
      maxPrice = max;
      priceLabel = mult >= 1_000_000_000
        ? `${(min / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} miliaran`
        : `${Math.round(min / 1_000_000)} jutaan`;
      working = working.replace(m[0], ' ');
    }
  }

  // 2) Sisa teks setelah harga dibuang -> anggap itu lokasi. Buang kata-kata
  // umum ("rumah", "dijual", "di", dst) biar yang tersisa cuma nama kota/
  // kecamatan.
  const stopwords = [
    'rumah', 'rmh', 'properti', 'hunian', 'tanah', 'ruko', 'kavling', 'perumahan',
    'dijual', 'jual', 'beli', 'cari', 'carikan', 'mau', 'pengen', 'ingin', 'nyari',
    'ada', 'apa', 'yang', 'dong', 'min', 'kak', 'tolong', 'bantu', 'di', 'ke', 'ya',
    'daerah', 'kawasan', 'wilayah', 'sekitar', 'dekat', 'area', 'lokasi', 'harga',
    'kisaran', 'sekitaran', 'budget', 'dgn', 'dengan', 'murah', 'termurah', 'baru',
    'dong', 'gan', 'kak', 'plis', 'please',
  ];
  const stopRe = new RegExp(`\\b(${stopwords.join('|')})\\b`, 'g');
  const location = working.replace(stopRe, ' ').replace(/\s+/g, ' ').trim();

  const locationLabel = location
    ? location.replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  return { minPrice, maxPrice, location, priceLabel, locationLabel, raw: text };
}

// "Rumah 200jt an di Bandung" -> "rumah-200jt-an-di-bandung"
export function slugifySearch(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[^a-z0-9\s.-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// "rumah-200jt-an-di-bandung" -> "rumah 200jt an di bandung"
export function deslugify(slug) {
  return (slug || '').replace(/-/g, ' ').trim();
    }
