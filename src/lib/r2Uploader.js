import { compressImage } from './imageCompress';

const WORKER_URL = 'https://rauma-uploader.abduloh-salam7.workers.dev';

export async function uploadToR2(file) {
  try {
    // Kompres dulu sebelum upload (resize + convert ke WebP/JPEG) biar
    // hemat kuota R2 & lebih cepat diakses pengunjung. Kalau kompresi
    // gagal karena alasan apapun, compressImage sudah aman mengembalikan
    // file asli, jadi upload tetap lanjut.
    const compressedFile = await compressImage(file);

    const formData = new FormData();
    formData.append('file', compressedFile);

    const response = await fetch(`${WORKER_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Gagal mengunggah gambar ke Cloudflare R2');
    }

    const data = await response.json();
    return data.url || `${WORKER_URL}/images/${data.key}`;
  } catch (error) {
    console.error('Error uploadToR2:', error);
    throw error;
  }
}

// Objek r2Uploader untuk dipanggil oleh Posting.jsx
export const r2Uploader = {
  uploadFile: uploadToR2,
  uploadMany: (files) => Promise.all(files.map((file) => uploadToR2(file))),
};

export default r2Uploader;
