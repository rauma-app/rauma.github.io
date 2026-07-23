// Upload gambar ke Cloudflare R2, lewat Worker perantara di folder
// /cloudflare-worker (root repo ini). Baca cloudflare-worker/README.md untuk
// cara deploy Worker-nya.
//
// Kenapa lewat Worker, bukan langsung browser -> R2 (seperti Cloudinary yang
// punya mode "unsigned upload" khusus buat dipanggil dari browser)?
// R2 tidak punya mode semacam itu -- access key R2 tidak boleh ditaruh di
// kode frontend karena siapa saja bisa membacanya dan menyalahgunakan bucket.
// Worker ini juga memverifikasi Firebase ID token, jadi hanya user yang
// login yang bisa upload (sama seperti aturan di firestore.rules).

import { auth } from '../firebase';
import { compressImages } from './imageCompress';

// Isi setelah Worker di-deploy (lihat cloudflare-worker/README.md).
// Cara paling rapi: taruh di file .env sebagai VITE_UPLOAD_WORKER_URL,
// biar tidak perlu edit kode ini langsung.
const WORKER_URL =
  import.meta.env.VITE_UPLOAD_WORKER_URL || 'https://rauma-uploader.abduloh-salam7.workers.dev';

/**
 * Upload satu file gambar ke R2 (via Worker). Otomatis dikompres dulu.
 * @param {File} file
 * @returns {Promise<string>} URL publik gambar yang sudah ter-upload
 */
export async function uploadToR2(file) {
  const user = auth.currentUser;
  if (!user) throw new Error('Harus login untuk upload gambar.');
  const idToken = await user.getIdToken();

  const [compressed] = await compressImages([file]);

  const formData = new FormData();
  formData.append('file', compressed);

  const res = await fetch(`${WORKER_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload gambar gagal.');
  }

  const data = await res.json();
  return data.url;
}

/** Upload beberapa file sekaligus, mengembalikan array URL sesuai urutan. */
export async function uploadManyToR2(files) {
  const urls = [];
  for (const file of files) {
    urls.push(await uploadToR2(file));
  }
  return urls;
}
