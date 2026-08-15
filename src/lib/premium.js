// Status Premium sekarang disimpan di database (tabel `premium_accounts`),
// BUKAN di-hardcode di file ini lagi. Kelola akun Premium (tambah/hapus)
// lewat halaman Admin -> "Kelola Premium" di web, tanpa perlu edit kode.
//
// `premiumMap` didapat dari <PremiumProvider> (lihat src/context/PremiumContext.jsx),
// isinya { [uid]: label }, di-fetch sekali dari /api/premium waktu situs dibuka.
//
// Benefit akun premium:
//   - Maksimal 50 iklan aktif (user biasa cuma 2)
//   - Ceklis biru di sebelah nama
//   - Halaman profil bisa dibuka publik
//   - Bisa posting tipe Perumahan, Subsidi, dan Jual Cepat
// Akun premium TETAP TIDAK bisa membuka halaman Tinjau Iklan (Admin
// Pending) dan tidak bisa hapus/approve iklan orang lain -- itu cuma admin.

export function isPremiumUid(premiumMap, uid) {
  return Boolean(uid && premiumMap && Object.prototype.hasOwnProperty.call(premiumMap, uid));
}

// Helper buat user yang lagi login (ambil premiumMap dari usePremium()).
export function isPremium(user, premiumMap) {
  return Boolean(user && isPremiumUid(premiumMap, user.uid));
}

// Batas jumlah iklan untuk user biasa (non-admin, non-premium).
export const FREE_LISTING_LIMIT = 5;

// Batas jumlah iklan untuk akun premium.
export const PREMIUM_LISTING_LIMIT = 50;
