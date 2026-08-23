const MAX_DIMENSION = 1280; // Diturunkan sedikit dari 1600 agar aman untuk RAM HP
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.8;

// Coba createImageBitmap dengan 1x retry. Kegagalan decode di HP biasanya
// transient (memori lagi penuh sesaat, bukan file-nya yang rusak), jadi
// daripada langsung nyerah ke file asli, kita kasih jeda singkat lalu
// coba sekali lagi -- baru kalau tetap gagal, fallback ke file asli.
async function createBitmapWithRetry(file) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await createImageBitmap(file);
    } catch (e) {
      console.warn(`createImageBitmap gagal (percobaan ${attempt}/2):`, file.name, e);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 300));
    }
  }
  return null;
}

// Penajaman ringan (unsharp mask sederhana) -- dipakai SETELAH kontras
// & saturasi dinaikkan, biar detail (tekstur dinding, kayu, dsb) kelihatan
// lebih jelas. Efeknya SENGAJA dibuat halus (amount kecil), bukan
// se-agresif filter "sharpen" default -- sharpening yang terlalu kuat
// bikin muncul "halo" putih/gelap di pinggir objek kontras tinggi dan
// mempertegas noise/bintik kamera HP, malah kelihatan amatir.
//
// Caranya: bikin versi blur dari gambar, lalu tambahkan balik SEBAGIAN
// kecil selisih (gambar asli - blur) ke gambar asli. Ini teknik "unsharp
// mask" klasik yang sama dipakai software foto profesional.
function applySharpen(ctx, width, height, amount = 0.25) {
  const src = ctx.getImageData(0, 0, width, height);
  const data = src.data;
  const out = new Uint8ClampedArray(data); // hasil akhir, mulai dari salinan asli

  // Kernel blur 3x3 sederhana buat estimasi "versi halus"-nya
  const w = width;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        // c = 0(R),1(G),2(B) -- alpha (c=3) dibiarkan apa adanya
        let sum = 0;
        sum += data[i - w * 4 - 4 + c] + data[i - w * 4 + c] + data[i - w * 4 + 4 + c];
        sum += data[i - 4 + c] + data[i + c] * 1 + data[i + 4 + c];
        sum += data[i + w * 4 - 4 + c] + data[i + w * 4 + c] + data[i + w * 4 + 4 + c];
        const blurred = sum / 9;
        const original = data[i + c];
        // Tambah balik SEBAGIAN KECIL (amount) dari selisih asli-blur
        out[i + c] = original + (original - blurred) * amount;
      }
    }
  }

  src.data.set(out);
  ctx.putImageData(src, 0, 0);
}

export async function compressImage(file) {
  // Pastikan benar-benar file gambar
  if (!file || !file.type.startsWith('image/')) return file;

  try {
    const imageBitmap = await createBitmapWithRetry(file);
    if (!imageBitmap) {
      console.warn('Kompresi dilewati, pakai file asli:', file.name);
      return file;
    }

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

    // Naikkan kontras & saturasi sedikit sebelum digambar -- diproses
    // GPU lewat ctx.filter (bawaan browser), jadi cepat & gak nambah
    // ukuran file (cuma nyesuain warna, bukan nambah detail baru).
    // Efeknya bikin foto kelihatan lebih "hidup"/gak pucat, mirip
    // "Auto Enhance" di Google Photos.
    ctx.filter = 'contrast(108%) saturate(112%)';
    ctx.drawImage(imageBitmap, 0, 0, width, height);
    ctx.filter = 'none'; // reset, biar gak kebawa ke proses canvas lain
    imageBitmap.close?.();

    // Penajaman ringan (lihat penjelasan di applySharpen di atas)
    try {
      applySharpen(ctx, width, height, 0.25);
    } catch (e) {
      // Kalau gagal (jarang -- misal foto raksasa & HP low-end), gak
      // masalah, foto tetap terupload dengan kontras/saturasi doang.
      console.warn('Sharpening dilewati:', e);
    }

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
