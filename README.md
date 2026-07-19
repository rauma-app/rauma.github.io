# Rauma.id

Platform jual beli rumah KPR. React (Vite) + Tailwind + Firebase (Auth, Firestore, Storage) + Nominatim (lokasi) + Swiper (slider gambar).

## 1. Jalankan di lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.

> ⚠️ **Penting soal Google Sign-In**: Firebase Auth hanya mengizinkan domain yang terdaftar di
> **Firebase Console → Authentication → Settings → Authorized domains**.
> `localhost` biasanya sudah otomatis diizinkan. Untuk domain produksi (misal `rauma.id`),
> tambahkan domainnya di sana dulu sebelum sign-in bisa berhasil.

## 2. Setup Firestore

1. Di Firebase Console, aktifkan **Firestore Database** (mode production).
2. Deploy rules yang sudah disiapkan di `firestore.rules`:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore   # pilih project rauma-e0aff, pakai file rules yang ada
   firebase deploy --only firestore:rules
   ```
3. Saat pertama kali menjalankan query di `Home.jsx` / `MyListings.jsx`, Firestore kemungkinan
   akan menampilkan error di console berisi **link untuk membuat composite index**
   (karena query menggabungkan `where` + `orderBy`). Tinggal klik link itu, index dibuat otomatis.

## 3. Setup Storage

1. Aktifkan **Firebase Storage** di Console.
2. Deploy `storage.rules` dengan cara yang sama seperti Firestore rules
   (`firebase init storage` lalu `firebase deploy --only storage:rules`).

## 4. Build & Deploy

```bash
npm run build
```

Hasil build ada di folder `dist/`. Bisa langsung deploy ke:
- **Firebase Hosting** (paling gampang karena satu ekosistem dengan Auth/Firestore):
  ```bash
  firebase init hosting   # public directory: dist
  firebase deploy --only hosting
  ```
- **Vercel/Netlify**: upload folder `dist/` atau connect repo, build command `npm run build`, output `dist`.

Jangan lupa tambahkan domain hosting kamu (misal `rauma.id` atau `rauma-e0aff.web.app`)
ke **Authorized domains** di Firebase Auth setelah deploy.

## 5. Tentang Kalkulator KPR

Rumusnya ada di `src/lib/kpr.js` — anuitas standar `M = P·i·(1+i)ⁿ / ((1+i)ⁿ−1)`.
Asumsi default: DP 20%, bunga fixed 6.5%/tahun, tenor 15 tahun.
Di halaman detail rumah, DP dan tenor bisa diubah lewat slider (`KPRSlider.jsx`) dan
cicilan bulanan dihitung ulang otomatis di sisi klien (tidak perlu request ke server).
**Ini murni estimasi**, bukan simulasi resmi dari bank manapun — sebaiknya diberi
disclaimer yang sudah ada di UI ("estimasi, bukan penawaran resmi bank").

## 6. Tentang pencarian lokasi (Nominatim)

`src/lib/nominatim.js` memakai Nominatim (OpenStreetMap) — gratis, tanpa API key.
Dibatasi ke level Kota/Kabupaten + Kecamatan (bukan alamat lengkap), dan menyimpan
`lat`/`lon` supaya fitur "rumah terdekat" di homepage bisa jalan.

Nominatim punya kebijakan pemakaian wajar (rate limit ~1 request/detik). Untuk trafik
tinggi produksi, pertimbangkan:
- Self-hosted Nominatim, atau
- Pindah ke provider berbayar (Google Places, Mapbox) — tinggal ganti isi `nominatim.js`
  dengan fetch ke API tersebut, komponen `LocationAutocomplete.jsx` tidak perlu diubah
  selama return value-nya tetap `{ label, kabupaten, kecamatan, lat, lon }`.

## 7. Struktur data Firestore (`listings` collection)

```
{
  type: "pribadi" | "perumahan",
  price: number,
  kabupaten: string,
  kecamatan: string,
  lat: number,
  lon: number,
  luasTanah: number | null,
  luasBangunan: number | null,
  bedrooms: number | null,
  bathrooms: number | null,
  electricity: string | null,
  air: string | null,
  sertifikat: string | null,
  description: string,
  whatsapp: string,
  images: string[],       // download URL dari Firebase Storage
  ownerUid: string,
  ownerName: string,
  ownerPhoto: string,
  createdAt: Timestamp
}
```

## 8. Yang belum diimplementasi (di luar scope awal)

- Edit / hapus iklan dari halaman "Iklan Saya" (saat ini baru menampilkan daftar)
- Halaman pencarian & filter manual (baru ada urutan berdasar lokasi terdekat)
- Kompresi gambar sebelum upload (disarankan tambahkan agar upload lebih cepat & hemat storage)
