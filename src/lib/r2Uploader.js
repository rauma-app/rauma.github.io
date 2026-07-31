const WORKER_URL = 'https://rauma-uploader.abduloh-salam7.workers.dev';

/**
 * Mengunggah 1 file gambar ke Cloudflare R2 via Worker
 */
export async function uploadToR2(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${WORKER_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Gagal mengunggah gambar ke Cloudflare R2');
    }

    const data = await response.json();
    // Mengembalikan URL publik gambar dari Worker/R2
    return data.url || `${WORKER_URL}/images/${data.key}`;
  } catch (error) {
    console.error('Error uploadToR2:', error);
    throw error;
  }
}

/**
 * Objek penolong agar kompatibel dengan Posting.jsx
 */
export const r2Uploader = {
  uploadFile: uploadToR2,
  uploadMany: (files) => Promise.all(files.map((file) => uploadToR2(file))),
};

export default r2Uploader;
