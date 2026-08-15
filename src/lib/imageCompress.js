const MAX_DIMENSION = 1280; // Diturunkan sedikit dari 1600 agar aman untuk RAM HP
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.8;

export async function compressImage(file) {
  // Pastikan benar-benar file gambar
  if (!file || !file.type.startsWith('image/')) return file;

  try {
    const imageBitmap = await createImageBitmap(file).catch(() => null);
    if (!imageBitmap) return file;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(imageBitmap.width, imageBitmap.height));
    const width = Math.max(1, Math.round(imageBitmap.width * scale));
    const height = Math.max(1, Math.round(imageBitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      imageBitmap.close?.();
      return file;
    }
    
    ctx.drawImage(imageBitmap, 0, 0, width, height);
    imageBitmap.close?.();

    // Fungsi pembantu untuk convert canvas ke blob dengan Promise
    const getBlob = (type, quality) => 
      new Promise((resolve) => canvas.toBlob(resolve, type, quality));

    // Coba WebP terlebih dahulu
    let blob = await getBlob('image/webp', WEBP_QUALITY);
    let ext = 'webp';
    let mime = 'image/webp';

    // Validasi apakah browser benar-benar menghasilkan webp atau fallback ke png/lainnya
    if (!blob || blob.type !== 'image/webp') {
      blob = await getBlob('image/jpeg', JPEG_QUALITY);
      ext = 'jpg';
      mime = 'image/jpeg';
    }

    // Jika masih gagal juga, kembalikan file asli
    if (!blob) return file;

    // PENTING: kalau foto aslinya lebih besar dari MAX_DIMENSION, kita
    // WAJIB pakai hasil kompresi -- walau ukuran filenya (byte) kebetulan
    // sedikit lebih besar dari aslinya. Dimensi yang kepangkas ini yang
    // penting (biar gak "kepotong" aneh di galeri yang rasio tetap 3:2),
    // bukan cuma soal ukuran file doang.
    //
    // "scale < 1" artinya tadi memang di-resize (foto asli > MAX_DIMENSION).
    // Kalau resize TIDAK terjadi (scale === 1, foto asli udah kecil) DAN
    // hasil kompresi malah lebih besar -- baru boleh pakai file asli,
    // karena di kondisi itu convert ke WebP emang gak ada untungnya sama
    // sekali.
    if (scale === 1 && blob.size >= file.size) return file;

    const safeName = file.name ? file.name.replace(/\.[^.]+$/, '') : 'compressed';
    const newName = `${safeName}.${ext}`;
    
    return new File([blob], newName, { type: mime });
  } catch (err) {
    console.error('Gagal melakukan kompresi gambar:', err);
    return file; // Aman: jika ada error, kembalikan file asli agar upload tidak rusak
  }
}

export async function compressImages(files) {
  return Promise.all(Array.from(files).map(compressImage));
}
