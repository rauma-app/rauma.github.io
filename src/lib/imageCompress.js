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

    // Jika hasil kompresi lebih besar dari file asli, pakai file asli
    if (blob.size >= file.size) return file;

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
