const WORKER_URL = 'https://rauma-uploader.abduloh-salam7.workers.dev';

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
