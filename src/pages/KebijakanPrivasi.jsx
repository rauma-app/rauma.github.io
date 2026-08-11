import React from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

export default function KebijakanPrivasi() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Seo
        title="Kebijakan dan Privasi"
        description="Kebijakan privasi Rauma.id — bagaimana kami mengumpulkan, menggunakan, dan melindungi data kamu."
        path="/kebijakan-privasi"
      />

      <h1 className="font-display text-3xl font-semibold text-navy">Kebijakan dan Privasi</h1>
      <p className="mt-2 text-sm text-ink/50">Terakhir diperbarui: Agustus 2026</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-ink/80">
        <p>
          Privasi kamu penting buat kami. Halaman ini menjelaskan data apa yang Rauma.id
          kumpulkan, kenapa kami mengumpulkannya, dan bagaimana kamu bisa mengontrolnya.
          Dengan menggunakan Rauma.id, kamu setuju dengan kebijakan ini.
        </p>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy">1. Data yang Kami Kumpulkan</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <strong>Data akun</strong> — nama, foto profil, dan alamat email dari akun Google kamu
              saat login (via Firebase Authentication). Kami tidak pernah melihat atau menyimpan
              password Google kamu.
            </li>
            <li>
              <strong>Data iklan</strong> — semua informasi yang kamu isi saat memasang iklan properti
              (harga, lokasi, foto, nomor WhatsApp, deskripsi, dsb).
            </li>
            <li>
              <strong>Data pemakaian anonim</strong> — kami mencatat kunjungan halaman, klik tombol
              WhatsApp, dan kata yang diketik di kolom pencarian, untuk memahami kebutuhan pengguna
              dan meningkatkan layanan. Data ini terkait ID anonim di perangkat kamu (bukan nama atau
              email), dan tidak dijual atau dibagikan ke pihak ketiga untuk kepentingan iklan.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy">2. Bagaimana Data Digunakan</h2>
          <p className="mt-2">
            Data yang kamu berikan dipakai untuk menampilkan iklan properti ke pengguna lain,
            menghubungkan pembeli dengan penjual lewat WhatsApp, dan menjaga kualitas listing di
            platform (misalnya proses tinjauan sebelum iklan tayang). Data pemakaian anonim dipakai
            untuk laporan statistik internal, seperti area mana yang paling banyak dicari.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy">3. Pihak Ketiga</h2>
          <p className="mt-2">
            Rauma.id menggunakan layanan pihak ketiga berikut untuk menjalankan platform:
          </p>
          <ul className="mt-3 space-y-2">
            <li><strong>Google Firebase</strong> — untuk proses login akun</li>
            <li><strong>Cloudflare</strong> — untuk penyimpanan data listing, gambar, dan hosting situs</li>
            <li><strong>FormSubmit</strong> — untuk meneruskan pesan dari formulir "Carikan Properti" dan "Saran & Masukan" ke email tim kami</li>
          </ul>
          <p className="mt-2">
            Masing-masing punya kebijakan privasi sendiri. Kami hanya membagikan data seminimal
            mungkin yang diperlukan agar layanan tersebut berfungsi.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy">4. Hak Kamu</h2>
          <p className="mt-2">
            Kamu bisa menghapus iklan kamu sendiri kapan saja lewat halaman "Iklan Saya". Kalau
            ingin akun atau seluruh datamu dihapus permanen dari sistem kami, hubungi kami lewat
            halaman{' '}
            <Link to="/saran-masukan" className="font-semibold text-forest underline">
              Saran &amp; Masukan
            </Link>{' '}
            dan kami akan proses secepatnya.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy">5. Perubahan Kebijakan</h2>
          <p className="mt-2">
            Kami bisa memperbarui kebijakan ini dari waktu ke waktu seiring berkembangnya fitur
            Rauma.id. Perubahan penting akan kami tandai lewat tanggal "Terakhir diperbarui" di atas.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-white p-5">
        <p className="text-sm text-ink/70">Ada pertanyaan soal privasi datamu?</p>
        <Link to="/saran-masukan" className="mt-2 inline-block text-sm font-semibold text-forest underline">
          Hubungi Kami
        </Link>
      </div>
    </div>
  );
}
