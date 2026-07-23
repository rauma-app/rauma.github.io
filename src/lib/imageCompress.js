// Kompres & resize gambar di browser SEBELUM upload. Ini penting karena R2
// (beda dengan Cloudinary) tidak otomatis mengoptimasi gambar untuk kita --
// jadi tanggung jawab itu dipindah ke sini. Manfaatnya dobel: upload lebih
// cepat buat penjual yang pakai HP, dan storage/bandwidth di R2 jauh lebih
// hemat (walau bandwidth R2 gratis, storage tetap dihitung per GB).

const MAX_DIMENSION = 1600; // px, untuk sisi terpanjang gambar
const JPEG_QUALITY = 0.8;

/**
 * Resize + compress 1 file gambar jadi JPEG memakai <canvas>.
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

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob) return file;

  // Kalau hasil kompresi malah lebih besar dari file asli (bisa terjadi
  // untuk gambar yang sudah kecil), pakai yang asli saja.
  if (blob.size >= file.size) return file;

  const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], newName, { type: 'image/jpeg' });
}

/** Kompres beberapa file sekaligus, urutan hasil tetap sama dengan input. */
export async function compressImages(files) {
  return Promise.all(files.map(compressImage));
}
