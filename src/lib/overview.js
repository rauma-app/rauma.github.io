// Daftar pilihan "Overview" iklan. Dipakai di halaman Posting (checkbox)
// dan halaman Iklan (label kecil).
//
// Aturan saling-kunci (`lock`): item dengan `lock` yang sama hanya boleh
// dipilih SALAH SATU. Kalau satu sudah dicentang, yang lain nonaktif sampai
// centangnya dilepas.
//
// PENTING: daftar `key` & `lock` ini juga ada salinannya di
// cloudflare-worker/src/index.js (OVERVIEW_ITEMS). Kalau menambah/mengubah
// di sini, ubah juga di sana supaya server tidak menolak pilihan baru.

export const OVERVIEW_SECTIONS = [
  {
    title: 'Kondisi',
    hint: 'Furnished, Semi Furnished, dan Unfurnished: pilih salah satu',
    items: [
      { key: 'siap_huni', label: 'Siap Huni' },
      { key: 'furnished', label: 'Furnished', lock: 'furnish' },
      { key: 'semi_furnished', label: 'Semi Furnished', lock: 'furnish' },
      { key: 'unfurnished', label: 'Unfurnished', lock: 'furnish' },
    ],
  },
  {
    title: 'Harga & Pembayaran',
    hint: 'Nego dan Harga Net tidak bisa dipilih bersamaan',
    items: [
      { key: 'nego', label: 'Nego', lock: 'harga' },
      { key: 'harga_net', label: 'Harga Net', lock: 'harga' },
      { key: 'kpr', label: 'KPR' },
    ],
  },
  {
    title: 'Lingkungan & Keamanan',
    items: [
      { key: 'cctv', label: 'CCTV 24 Jam' },
      { key: 'security_24', label: 'Security 24 Jam' },
      { key: 'one_gate', label: 'One Gate System' },
      { key: 'perumahan', label: 'Perumahan/Komplek' },
      { key: 'cluster', label: 'Cluster' },
      { key: 'bebas_banjir', label: 'Bebas Banjir' },
    ],
  },
  {
    title: 'Akses & Lokasi',
    hint: 'Lebar jalan: pilih salah satu',
    items: [
      { key: 'jalan_1_mobil', label: 'Lebar Jalan 1 Mobil', lock: 'jalan' },
      { key: 'jalan_2_mobil', label: 'Lebar Jalan 2 Mobil', lock: 'jalan' },
      { key: 'jalan_3_mobil', label: 'Lebar Jalan 3 Mobil+', lock: 'jalan' },
      { key: 'dekat_pasar', label: 'Dekat Pasar Tradisional' },
      { key: 'dekat_tol', label: 'Dekat Tol' },
      { key: 'dekat_sekolah', label: 'Dekat Sekolah' },
      { key: 'dekat_rs', label: 'Dekat Rumah Sakit' },
      { key: 'dekat_transportasi', label: 'Dekat Transportasi Umum' },
    ],
  },
  {
    title: 'Fasilitas',
    items: [
      { key: 'carport', label: 'Carport' },
      { key: 'taman', label: 'Taman' },
      { key: 'balkon', label: 'Balkon' },
      { key: 'smart_home', label: 'Smart Home' },
    ],
  },
  {
    title: 'Arah Hadap',
    hint: 'Pilih salah satu',
    items: [
      { key: 'hadap_utara', label: 'Hadap Utara', lock: 'hadap' },
      { key: 'hadap_timur', label: 'Hadap Timur', lock: 'hadap' },
      { key: 'hadap_selatan', label: 'Hadap Selatan', lock: 'hadap' },
      { key: 'hadap_barat', label: 'Hadap Barat', lock: 'hadap' },
    ],
  },
];

export const OVERVIEW_ITEMS = OVERVIEW_SECTIONS.flatMap((s) => s.items);
const ITEM_BY_KEY = Object.fromEntries(OVERVIEW_ITEMS.map((i) => [i.key, i]));

// Item ini terkunci kalau item lain di grup `lock` yang sama sudah dipilih
export function isOverviewLocked(selected, key) {
  const item = ITEM_BY_KEY[key];
  if (!item || !item.lock || selected.includes(key)) return false;
  return selected.some((k) => ITEM_BY_KEY[k]?.lock === item.lock);
}

// Centang / lepas centang. Item yang terkunci tidak bisa dicentang.
export function toggleOverview(selected, key) {
  if (selected.includes(key)) return selected.filter((k) => k !== key);
  if (isOverviewLocked(selected, key) || !ITEM_BY_KEY[key]) return selected;
  return [...selected, key];
}

// Bersihkan data (mis. dari server): buang key tak dikenal & duplikat,
// pastikan aturan kunci terjaga, urutkan sesuai urutan daftar.
export function cleanOverview(value) {
  const input = Array.isArray(value) ? value : [];
  const picked = [];
  for (const key of input) {
    if (!ITEM_BY_KEY[key] || picked.includes(key)) continue;
    if (isOverviewLocked(picked, key)) continue;
    picked.push(key);
  }
  return OVERVIEW_ITEMS.filter((i) => picked.includes(i.key)).map((i) => i.key);
}

export function overviewLabel(key) {
  return ITEM_BY_KEY[key]?.label || key;
}
