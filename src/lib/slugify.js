// Ubah judul listing jadi slug buat URL, misal:
// "Dijual rumah murah dan cantik di Bandung!" -> "dijual-rumah-murah-dan-cantik-di-bandung"
//
// Dipakai di ListingCard.jsx, Listing.jsx -- slug ini CUMA hiasan di URL
// buat SEO/dibaca manusia, bukan kunci pencarian data. ID listing (segmen
// sebelum slug di URL, /id/{id}/{slug}) yang selalu jadi acuan utama, jadi
// link lama tanpa slug (/id/{id}) atau link dengan slug yang sudah basi
// (judul pernah diubah) tetap jalan normal, gak jadi link mati.
export function slugifyTitle(title) {
  return (title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
