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
      { key: 'garasi', label: 'Garasi' },
      { key: 'taman', label: 'Taman' },
      { key: 'balkon', label: 'Balkon' },
      { key: 'smart_home', label: 'Smart Home' },
    ],
  },
  {
    title: 'Arah Hadap & Posisi',
    hint: 'Arah hadap: pilih salah satu. Kalau Hook dicentang, boleh pilih 2 arah',
    items: [
      { key: 'hook', label: 'Hook' },
      { key: 'hadap_utara', label: 'Hadap Utara', lock: 'hadap' },
      { key: 'hadap_timur', label: 'Hadap Timur', lock: 'hadap' },
      { key: 'hadap_selatan', label: 'Hadap Selatan', lock: 'hadap' },
      { key: 'hadap_barat', label: 'Hadap Barat', lock: 'hadap' },
    ],
  },
];

export const OVERVIEW_ITEMS = OVERVIEW_SECTIONS.flatMap((s) => s.items);
const ITEM_BY_KEY = Object.fromEntries(OVERVIEW_ITEMS.map((i) => [i.key, i]));

// Batas jumlah pilihan per grup `lock`. Biasanya 1. Khusus arah hadap: 1,
// tapi 2 kalau Hook dicentang (rumah di sudut jalan menghadap 2 arah).
function lockMax(lock, keys) {
  if (lock === 'hadap') return keys.includes('hook') ? 2 : 1;
  return 1;
}

// Item ini terkunci kalau grup `lock`-nya sudah penuh dan item ini belum dipilih
export function isOverviewLocked(selected, key) {
  const item = ITEM_BY_KEY[key];
  if (!item || !item.lock || selected.includes(key)) return false;
  const used = selected.filter((k) => ITEM_BY_KEY[k]?.lock === item.lock).length;
  return used >= lockMax(item.lock, selected);
}

// Centang / lepas centang. Item yang terkunci tidak bisa dicentang.
export function toggleOverview(selected, key) {
  if (selected.includes(key)) {
    let next = selected.filter((k) => k !== key);
    // Hook dilepas -> arah hadap tinggal 1 (yang dipilih pertama)
    if (key === 'hook') {
      let seen = 0;
      next = next.filter((k) => {
        if (ITEM_BY_KEY[k]?.lock !== 'hadap') return true;
        seen += 1;
        return seen <= 1;
      });
    }
    return next;
  }
  if (isOverviewLocked(selected, key) || !ITEM_BY_KEY[key]) return selected;
  return [...selected, key];
}

// Bersihkan data (mis. dari server): buang key tak dikenal & duplikat,
// pastikan batas per grup terjaga, urutkan sesuai urutan daftar.
export function cleanOverview(value) {
  const input = Array.isArray(value) ? value : [];
  const picked = [];
  for (const key of input) {
    const item = ITEM_BY_KEY[key];
    if (!item || picked.includes(key)) continue;
    if (item.lock) {
      const used = picked.filter((k) => ITEM_BY_KEY[k]?.lock === item.lock).length;
      if (used >= lockMax(item.lock, input)) continue;
    }
    picked.push(key);
  }
  return OVERVIEW_ITEMS.filter((i) => picked.includes(i.key)).map((i) => i.key);
}

export function overviewLabel(key) {
  return ITEM_BY_KEY[key]?.label || key;
}

// Penulisan lama jenis air -> penulisan baru (kata "Sumur Bor" dihapus).
// Dipakai saat menampilkan & saat mengedit iklan lama, jadi tetap benar
// walau perintah SQL penyeragaman belum dijalankan.
const AIR_LEGACY = {
  'Sumur Gali': 'Sumur Dangkal',
  'Sumur Bor (Dangkal)': 'Sumur Dangkal',
  'Sumur Bor (Jet Pump)': 'Jet Pump',
  'Sumur Bor (Submersible)': 'Submersible',
  'Sumur Artesis': 'Artesis',
};
export function normalizeAir(value) {
  if (!value) return '';
  return AIR_LEGACY[value] || value;
}
