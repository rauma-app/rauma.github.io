// ID anonim per device/browser, TIDAK ada hubungannya sama akun Google/Firebase.
// Cuma dipakai buat hitung "pengunjung unik" di dashboard statistik Admin --
// bukan data pribadi, cuma angka acak yang disimpan di localStorage HP orang.
const KEY = 'rauma_anon_id';

export function getAnonId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = `a_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch (err) {
    // Kalau localStorage diblokir (mode incognito ketat, dsb), fallback ID
    // sekali pakai per pageload -- gak masalah, cuma bikin hitungan pengunjung
    // dikit lebih tinggi dari harusnya buat kasus ini.
    return `a_temp_${Math.random().toString(36).slice(2)}`;
  }
}
