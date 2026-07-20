// Upload gambar ke Cloudinary (gratis, tidak perlu kartu/billing).
// Pakai "unsigned upload" — aman dipanggil langsung dari browser karena
// tidak melibatkan API secret, hanya cloud name + upload preset (keduanya
// memang didesain untuk terlihat publik).

const CLOUDINARY_CLOUD_NAME = 'rlmgnxhp';
const CLOUDINARY_UPLOAD_PRESET = 'rauma_uploads';

/**
 * Upload satu file gambar ke Cloudinary.
 * @param {File} file
 * @returns {Promise<string>} secure_url gambar yang sudah ter-upload
 */
export async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Upload gambar gagal.');
  }

  const data = await res.json();
  return data.secure_url;
}

/** Upload beberapa file sekaligus, mengembalikan array URL sesuai urutan. */
export async function uploadManyToCloudinary(files) {
  const urls = [];
  for (const file of files) {
    urls.push(await uploadToCloudinary(file));
  }
  return urls;
}
