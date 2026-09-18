// File "indeks" -- gabungin semua artikel tanah dari folder ./tanah/.
// Kode lain di situs (Tanah.jsx, TanahArticle.jsx) tetap import dari file
// ini, gak perlu tahu kalau isinya sekarang dipecah per file.
//
// CARA NAMBAH ARTIKEL BARU:
// 1. Bikin file baru di src/data/tanah/nama-artikel.js (contoh isinya
//    lihat file yang sudah ada di folder itu -- format `export default {...}`).
// 2. Import file itu di bawah ini.
// 3. Tambahkan ke array POSTS di bawah.
// Itu aja -- gak perlu ubah apapun di file lain.

import kebunTehCipasung from './tanah/kebun-teh-cipasung';
import kebunTehKopiCianjur from './tanah/kebun-teh-kopi-cianjur';

export const POSTS = [kebunTehCipasung, kebunTehKopiCianjur];

export function getPostBySlug(slug) {
  return POSTS.find((p) => p.slug === slug);
}
