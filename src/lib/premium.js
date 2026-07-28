// Daftar UID Firebase Auth akun PREMIUM (bukan admin, tapi upgrade berbayar).
// Cara dapetin UID: sama seperti admin -- Firebase Console -> Authentication
// -> tab "Users" -> cari akun Google-nya -> copy kolom "User UID".
//
// Benefit akun premium (diatur lewat UID di sini, BUKAN lewat halaman admin):
//   - Maksimal 50 iklan aktif (user biasa cuma 2)
//   - Ceklis biru di sebelah nama
//   - Halaman profil bisa dibuka publik
//   - Bisa posting tipe Perumahan, Subsidi, dan Jual Cepat
// Akun premium TETAP TIDAK bisa membuka halaman Tinjau Iklan (Admin
// Pending) dan tidak bisa hapus/approve iklan orang lain -- itu cuma admin.
export const PREMIUM_UIDS = [
  // 'contoh-uid-akun-premium-di-sini',
];

export function isPremium(user) {
  return Boolean(user && PREMIUM_UIDS.includes(user.uid));
}

// Batas jumlah iklan untuk user biasa (non-admin, non-premium).
export const FREE_LISTING_LIMIT = 2;

// Batas jumlah iklan untuk akun premium.
export const PREMIUM_LISTING_LIMIT = 50;
