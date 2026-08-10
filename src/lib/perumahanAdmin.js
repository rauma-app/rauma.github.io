// Role "Admin Perumahan": centang kuning (sama seperti Admin utama), TAPI
// terbatas -- cuma bisa posting kategori Perumahan, menu cuma Posting &
// Iklan Saya. Dikelola dari halaman Admin -> "Kelola Admin Perumahan"
// (tabel `perumahan_admins` di database), BUKAN admin utama (ADMIN_UIDS).
//
// `perumahanAdminMap` didapat dari <PremiumProvider> (lihat
// src/context/PremiumContext.jsx), isinya { [uid]: label }.

export function isPerumahanAdminUid(perumahanAdminMap, uid) {
  return Boolean(uid && perumahanAdminMap && Object.prototype.hasOwnProperty.call(perumahanAdminMap, uid));
}

export function isPerumahanAdmin(user, perumahanAdminMap) {
  return Boolean(user && isPerumahanAdminUid(perumahanAdminMap, user.uid));
}
