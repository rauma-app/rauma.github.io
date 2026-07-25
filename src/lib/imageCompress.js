// Kompres & resize gambar di browser SEBELUM upload. Ini penting karena R2
// (beda dengan Cloudinary) tidak otomatis mengoptimasi gambar untuk kita --
// jadi tanggung jawab itu dipindah ke sini. Manfaatnya dobel: upload lebih
// cepat buat penjual yang pakai HP, dan storage/bandwidth di R2 jauh lebih
// hemat (walau bandwidth R2 gratis, storage tetap dihitung per GB).
//
// Format target: WebP (didukung semua browser modern, ~25-35% lebih kecil
// dari JPEG di kualitas visual yang sama). Kalau browser ternyata tidak
// bisa encode WebP (sangat jarang di 2026, tapi jaga-jaga), otomatis
// fallback ke JPEG -- upload tidak boleh gagal hanya gara-gara ini.
//
// AVIF sengaja TIDAK dipakai: encoding AVIF lewat canvas cuma didukung
// penuh di Chrome. Browser lain (terutama Safari, yang banyak dipakai
// penjual lewat iPhone) akan diam-diam fallback ke PNG mentah kalau
// diminta 'image/avif' -- hasilnya file JUSTRU lebih besar, bukan lebih
// kecil. Kalau suatu saat mau AVIF, perlu library WASM (mis. @jsquash/avif)
// supaya konsisten di semua browser -- tapi itu nambah ukuran bundle & waktu
// proses, jadi untuk sekarang WebP adalah titik seimbang terbaik.

const MAX_DIMENSION = 1600; // px, untuk sisi terpanjang gambar
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.8;

/**
 * Resize + compress 1 file gambar jadi WebP (fallback JPEG) memakai <canvas>.
 * @param {File} file
 * @returns {Promise<File>} file baru yang sudah dikompres (atau file asli
 *   kalau kompresi gagal/tidak menguntungkan -- upload tidak boleh gagal
 *   total hanya karena langkah optimasi ini bermasalah).
 */
export async function compressImage(file) {
  if (!file.type.startsWith('image/')) return file;

  const imageBitmap = await createImageBitmap(file).catch(() => null);
  if (!imageBitmap) return file;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(imageBitmap.width, imageBitmap.height));
  const width = Math.round(imageBitmap.width * scale);
  const height = Math.round(imageBitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageBitmap, 0, 0, width, height);
  imageBitmap.close?.();

  // Coba WebP dulu.
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY));
  let ext = 'webp';
  let mime = 'image/webp';

  // Kalau browser tidak benar-benar mendukung encode WebP, ia akan
  // fallback diam-diam ke PNG (besar) -- deteksi lewat blob.type dan
  // kalau begitu, coba JPEG saja sebagai gantinya.
  if (!blob || blob.type !== 'image/webp') {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    ext = 'jpg';
    mime = 'image/jpeg';
  }

  if (!blob) return file;

  // Kalau hasil kompresi malah lebih besar dari file asli (bisa terjadi
  // untuk gambar yang sudah kecil), pakai yang asli saja.
  if (blob.size >= file.size) return file;

  const newName = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
  return new File([blob], newName, { type: mime });
}

/** Kompres beberapa file sekaligus, urutan hasil tetap sama dengan input. */
export async function compressImages(files) {
  return Promise.all(files.map(compressImage));
}
