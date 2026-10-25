import { compressImage } from './imageCompress';
import { auth } from '../firebase';

const WORKER_URL = 'https://cdn.rauma.id';

// Upload ke HP lewat 4G kadang putus/lambat -> tiap foto dicoba sampai 3x
// (jeda 1 dtk, lalu 2,5 dtk), dan tiap percobaan dibatasi 60 detik supaya
// satu koneksi macet tidak menggantung seluruh posting.
const UPLOAD_TIMEOUT_MS = 60000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 2500];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// retryable: layak dicoba lagi (jaringan/server). fatal: hentikan SEMUA
// upload yang tersisa karena percuma (mis. kena batas upload per jam).
function uploadError(message, { retryable = false, fatal = false, status = 0 } = {}) {
  const err = new Error(message);
  err.retryable = retryable;
  err.fatal = fatal;
  err.status = status;
  return err;
}

async function postOnce(file, forceRefreshToken) {
  const user = auth.currentUser;
  if (!user) throw uploadError('Login dulu sebelum upload foto', { fatal: true });
  const token = await user.getIdToken(forceRefreshToken);

  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${WORKER_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });
  } catch (e) {
    throw uploadError(e?.name === 'AbortError' ? 'koneksi terlalu lambat' : 'koneksi terputus', {
      retryable: true,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const message = errBody.error || 'Gagal mengunggah gambar ke Cloudflare R2';
    const s = response.status;
    throw uploadError(message, {
      // 401 (token kedaluwarsa), 408, dan 5xx layak dicoba lagi;
      // 400/413 (file ditolak) dan 429 (batas per jam) tidak.
      retryable: s === 401 || s === 408 || s >= 500,
      fatal: s === 429,
      status: s,
    });
  }

  return response.json();
}

export async function uploadToR2(file) {
  // Kompres SEKALI saja (tidak diulang tiap percobaan). Kalau kompresi gagal,
  // compressImage aman mengembalikan file asli.
  const prepared = await compressImage(file);

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const data = await postOnce(prepared, lastError?.status === 401);
      return data.url || `${WORKER_URL}/images/${data.key}`;
    } catch (error) {
      lastError = error;
      console.warn(`Upload foto gagal (percobaan ${attempt}/${MAX_ATTEMPTS}):`, error.message);
      if (!error.retryable || attempt === MAX_ATTEMPTS) break;
      await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 2500);
    }
  }
  console.error('Error uploadToR2:', lastError);
  throw lastError;
}

// Proses upload dengan batas concurrency, bukan semua sekaligus.
// Kenapa: createImageBitmap + canvas encode utk banyak foto besar secara
// paralel bisa bikin memori HP kepepet -> decode gagal diam-diam ->
// compressImage fallback ke file asli (jadi kompresi "kadang gagal").
// Dengan batas (misal 2 foto bersamaan), tiap decode dapat memori cukup.
const UPLOAD_CONCURRENCY = 2;

// `onUploaded(index, url)` dipanggil SETIAP foto berhasil, supaya pemanggil
// bisa mengingat hasilnya. Kalau ada foto yang gagal, semua foto lain tetap
// diselesaikan dulu, baru error dilempar -- jadi saat user menekan kirim
// lagi, foto yang sudah terunggah tidak diunggah ulang.
async function uploadManyLimited(files, onUploaded) {
  const results = new Array(files.length).fill(null);
  const failures = [];
  let nextIndex = 0;
  let stop = false;

  async function worker() {
    while (!stop && nextIndex < files.length) {
      const current = nextIndex++;
      try {
        const url = await uploadToR2(files[current]);
        results[current] = url;
        if (onUploaded) onUploaded(current, url);
      } catch (error) {
        failures.push({ index: current, error });
        if (error.fatal) stop = true;
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(UPLOAD_CONCURRENCY, files.length) },
    () => worker()
  );
  await Promise.all(workers);

  if (failures.length > 0) {
    const reason = failures[0].error.message;
    const err = new Error(
      failures[0].error.fatal
        ? reason
        : `${failures.length} dari ${files.length} foto gagal diunggah (${reason}). Foto yang sudah berhasil tidak diunggah ulang, tekan kirim lagi.`
    );
    err.failures = failures;
    throw err;
  }
  return results;
}

// Objek r2Uploader untuk dipanggil oleh Posting.jsx
export const r2Uploader = {
  uploadFile: uploadToR2,
  uploadMany: uploadManyLimited,
};

export default r2Uploader;
