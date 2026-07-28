// Ambil perkiraan lokasi pengunjung dari alamat IP publiknya -- TANPA
// perlu minta izin lokasi ke browser sama sekali. Presisinya kasar
// (biasanya cuma akurat sampai level kota/kabupaten), dipakai buat
// urutan awal SEBELUM user kasih izin GPS yang lebih presisi.
//
// Pakai ipwho.is: gratis, HTTPS, CORS udah diizinin buat dipanggil
// langsung dari browser (gak perlu API key).
export async function getIpLocation() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.success || data.latitude == null || data.longitude == null) return null;

    return { lat: data.latitude, lon: data.longitude };
  } catch {
    // Gagal (offline, timeout, diblokir, dll) -> biarin null, halaman
    // tetap tampil normal (urutan terbaru) tanpa error ke user.
    return null;
  }
}
