import React from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

export default function SyaratKetentuan() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Seo
        title="Syarat & Ketentuan"
        description="Syarat dan ketentuan penggunaan platform Rauma.id."
        path="/syarat-ketentuan"
      />

      <h1 className="font-display text-3xl font-semibold text-navy">Syarat &amp; Ketentuan</h1>
      <p className="mt-2 text-sm text-ink/50">Terakhir diperbarui: Agustus 2026</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-ink/80">
        <p>
          Dengan mengakses atau menggunakan Rauma.id, kamu setuju untuk mengikuti syarat dan
          ketentuan di bawah ini. Kalau kamu tidak setuju, mohon untuk tidak menggunakan platform
          ini.
        </p>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy">1. Tentang Rauma.id</h2>
          <p className="mt-2">
            Rauma.id adalah platform iklan (marketplace) yang menghubungkan penjual dan pencari
            properti. Kami <strong>bukan</strong> agen properti, notaris, bank, atau pihak dalam
            transaksi jual-beli apa pun antara pengguna. Seluruh proses negosiasi, pembayaran,
            hingga transaksi jual-beli dilakukan langsung antara pembeli dan penjual, di luar
            tanggung jawab Rauma.id.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy">2. Kewajiban Pengguna</h2>
          <ul className="mt-3 space-y-2">
            <li>Memberikan informasi yang benar dan akurat saat memasang iklan (harga, lokasi, foto, kondisi properti).</li>
            <li>Tidak memasang iklan properti yang tidak benar-benar dimiliki atau dikuasai secara sah untuk dijual/disewakan.</li>
            <li>Tidak mengunggah konten yang menyesatkan, menipu, mengandung SARA, atau melanggar hukum yang berlaku di Indonesia.</li>
            <li>Bertanggung jawab penuh atas isi iklan yang dipasang menggunakan akunmu.</li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy">3. Moderasi Iklan</h2>
          <p className="mt-2">
            Iklan yang dipasang oleh pengguna umum akan melalui proses tinjauan sebelum tayang ke
            publik. Rauma.id berhak menolak, menurunkan, atau menghapus iklan apa pun tanpa
            pemberitahuan sebelumnya jika dianggap melanggar syarat ini atau mengandung informasi
            yang meresahkan/menyesatkan.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy">4. Akun Premium &amp; Berbayar</h2>
          <p className="mt-2">
            Beberapa fitur (seperti kuota iklan lebih banyak atau lencana terverifikasi) hanya
            tersedia untuk akun berstatus khusus (Premium/Admin Perumahan) yang dikelola langsung
            oleh tim Rauma.id. Status ini dapat dicabut sewaktu-waktu jika ditemukan pelanggaran.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy">5. Batasan Tanggung Jawab</h2>
          <p className="mt-2">
            Rauma.id berupaya menjaga kualitas informasi di platform, namun tidak dapat menjamin
            kebenaran 100% setiap listing yang dipasang pengguna. Kami sangat menyarankan calon
            pembeli untuk melakukan pengecekan langsung (survei lokasi, verifikasi dokumen
            legalitas seperti SHM/sertifikat) sebelum melakukan transaksi apa pun. Rauma.id tidak
            bertanggung jawab atas kerugian yang timbul dari transaksi antar pengguna.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy">6. Perubahan Ketentuan</h2>
          <p className="mt-2">
            Ketentuan ini dapat diperbarui sewaktu-waktu. Penggunaan Rauma.id secara berkelanjutan
            setelah perubahan berarti kamu menyetujui ketentuan yang terbaru.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-white p-5">
        <p className="text-sm text-ink/70">Ada pertanyaan soal ketentuan ini?</p>
        <Link to="/saran-masukan" className="mt-2 inline-block text-sm font-semibold text-forest underline">
          Hubungi Kami
        </Link>
      </div>
    </div>
  );
}
