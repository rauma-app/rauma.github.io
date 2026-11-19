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

// Pilihan jumlah (1-5) untuk lantai & carport. Tiap angka = satu key, dan satu grup
// (`lock`) hanya boleh satu pilihan. Di halaman iklan tampil "3 lantai" / "Carport 3 mobil".
const LANTAI_ITEMS = [1, 2, 3, 4, 5].map((n) => ({
  key: `lantai_${n}`,
  label: `${n} lantai`,
  short: String(n),
  lock: 'lantai',
}));
const CARPORT_ITEMS = [1, 2, 3, 4, 5].map((n) => ({
  key: `carport_${n}`,
  label: `Carport ${n} mobil`,
  short: String(n),
  lock: 'carport',
  replaces: 'carport', // pilihan "Carport" lama (tanpa jumlah) otomatis diganti
}));

// Pilihan lama yang sudah tidak ada di form tapi masih tersimpan di iklan lama.
// Tetap dikenali & ditampilkan supaya tidak hilang diam-diam.
const LEGACY_ITEMS = [{ key: 'carport', label: 'Carport' }];

export const OVERVIEW_SECTIONS = [
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
  {
    title: 'Bangunan',
    hint: 'Pilih jumlahnya. Ketuk angka yang sama lagi untuk membatalkan',
    groups: [
      { title: 'Jumlah Lantai', items: LANTAI_ITEMS },
      { title: 'Carport (jumlah mobil)', items: CARPORT_ITEMS },
    ],
  },
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
      { key: 'cash', label: 'Cash' },
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
      { key: 'garasi', label: 'Garasi' },
      { key: 'taman', label: 'Taman' },
      { key: 'balkon', label: 'Balkon' },
      { key: 'smart_home', label: 'Smart Home' },
    ],
  },
];

export const OVERVIEW_ITEMS = [
  ...OVERVIEW_SECTIONS.flatMap((s) => (s.groups ? s.groups.flatMap((g) => g.items) : s.items)),
  ...LEGACY_ITEMS,
];
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

// Pilih satu angka di grup pilihan (lantai / carport): menggantikan pilihan lain di
// grup yang sama; mengetuk angka yang sama lagi membatalkannya.
export function setChoice(selected, key) {
  const item = ITEM_BY_KEY[key];
  if (!item || !item.lock) return selected;
  const without = selected.filter(
    (k) => ITEM_BY_KEY[k]?.lock !== item.lock && k !== item.replaces
  );
  return selected.includes(key) ? without : [...without, key];
}

// Bersihkan data (mis. dari server): buang key tak dikenal & duplikat,
// pastikan batas per grup terjaga, urutkan sesuai urutan daftar.
export function cleanOverview(value) {
  const input = Array.isArray(value) ? value : [];
  const picked = [];
  // Pilihan lama (mis. "Carport" tanpa jumlah) dibuang kalau penggantinya sudah dipilih
  const replaced = new Set(input.map((k) => ITEM_BY_KEY[k]?.replaces).filter(Boolean));
  for (const key of input) {
    const item = ITEM_BY_KEY[key];
    if (!item || picked.includes(key) || replaced.has(key)) continue;
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

// ---- Sertifikat: bisa dipilih lebih dari satu (checkbox) ----
// Disimpan sebagai SATU teks dipisah " & " (mis. "SHM & IMB"), sama dengan
// penulisan lama, jadi iklan lama tetap terbaca dan tidak perlu ubah database.
// Urutan di teks mengikuti urutan daftar ini.
export const SERTIFIKAT_OPTIONS = ['SHM', 'SHGB', 'HGB', 'IMB', 'PGB', 'AJB', 'PPJB', 'Girik', 'Lainnya'];

// "SHM & IMB" -> ['SHM', 'IMB'] (nilai tak dikenal diabaikan)
export function parseSertifikat(value) {
  const tokens = String(value || '')
    .split('&')
    .map((t) => t.trim())
    .filter(Boolean);
  return SERTIFIKAT_OPTIONS.filter((o) => tokens.includes(o));
}

// Centang / lepas centang satu pilihan, hasilnya teks yang siap disimpan
export function toggleSertifikat(value, option) {
  const current = parseSertifikat(value);
  const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
  return SERTIFIKAT_OPTIONS.filter((o) => next.includes(o)).join(' & ');
}
