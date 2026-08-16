import { compressImage } from './imageCompress';
import { auth } from '../firebase';

const WORKER_URL = 'https://cdn.rauma.id';

export async function uploadToR2(file) {
  try {
    // Kompres dulu sebelum upload (resize + convert ke WebP/JPEG) biar
    // hemat kuota R2 & lebih cepat diakses pengunjung. Kalau kompresi
    // gagal karena alasan apapun, compressImage sudah aman mengembalikan
    // file asli, jadi upload tetap lanjut.
    const compressedFile = await compressImage(file);

    const user = auth.currentUser;
    if (!user) throw new Error('Login dulu sebelum upload foto');
    const token = await user.getIdToken();

    const formData = new FormData();
    formData.append('file', compressedFile);

    const response = await fetch(`${WORKER_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || 'Gagal mengunggah gambar ke Cloudflare R2');
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
