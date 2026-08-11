import React from 'react';
import Seo from '../components/Seo';

const WA_LINK = `https://wa.me/6285156222635?text=${encodeURIComponent('Halo, saya ingin kerja sama dengan Rauma.id')}`;

const KEUNGGULAN = [
  {
    icon: '⚡',
    title: 'Website Ringan & Cepat',
    desc: 'Rauma dibangun dari nol dengan teknologi modern, tanpa skrip iklan pihak ketiga yang bertumpuk atau widget berat yang biasa memperlambat portal properti besar. Halaman kebuka cepat walau sinyal internet pas-pasan — penting banget karena banyak calon pembeli properti nge-cek dari HP, bukan laptop di kantor dengan wifi kencang.',
  },
  {
    icon: '🔎',
    title: 'Pencarian yang Manusiawi',
    desc: 'Cukup ketik kayak ngobrol biasa — misal "rumah 300jt an di Cimahi" — Rauma langsung ngerti maksudnya dan nunjukin hasil yang sesuai. Nggak perlu isi form filter berlapis-lapis (pilih kota, pilih rentang harga, pilih tipe, baru klik cari) seperti kebanyakan portal properti pada umumnya.',
  },
  {
    icon: '📍',
    title: 'Lokasi yang Benar-Benar Berdampak',
    desc: 'Waktu user mengaktifkan izin lokasi di Rauma, hasil pencarian benar-benar diurutkan ulang berdasarkan jarak sebenarnya dari posisi mereka — bukan cuma formalitas minta izin doang. Beberapa platform properti besar juga punya fitur "aktifkan lokasi", tapi banyak pengguna yang merasa hasilnya tidak berubah signifikan setelah diaktifkan. Di Rauma, fitur ini benar-benar dipakai buat nyortir listing terdekat.',
  },
  {
    icon: '💬',
    title: 'Komunikasi Langsung, Tanpa Perantara',
    desc: 'Setiap listing terhubung langsung ke WhatsApp penjual/agen — tidak ada sistem chat internal platform yang bikin respons lambat atau harus login dulu. Calon pembeli serius bisa langsung tanya-tanya di WhatsApp dalam hitungan detik.',
  },
  {
    icon: '🏘️',
    title: 'Profil Resmi untuk Setiap Perumahan',
    desc: 'Developer/perumahan bisa punya identitas sendiri di Rauma — lengkap dengan logo, nama resmi, dan lencana terverifikasi di setiap listing-nya. Calon pembeli langsung tahu unit itu berasal dari perumahan resmi, bukan iklan perorangan biasa.',
  },
  {
    icon: '🆓',
    title: 'Biaya Ramah untuk Partner',
    desc: 'Rauma masih fokus melayani area Bandung Raya secara mendalam, bukan sekadar jadi salah satu dari ribuan listing di platform nasional yang penuh sesak. Biaya kerja sama jauh lebih terjangkau dibanding portal properti besar, karena listing kamu lebih mudah ditemukan, bukan tenggelam di antara ribuan listing lain.',
  },
];

export default function Kerjasama() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Seo
        title="Kerja Sama dengan Rauma.id"
        description="Kenapa developer dan agen properti sebaiknya kerja sama dengan Rauma.id — website ringan, pencarian mudah, dan lokasi yang benar-benar akurat."
        path="/kerjasama"
      />

      <div className="text-center">
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-navy sm:text-4xl">
          Kenapa Harus Kerja Sama dengan Rauma.id?
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-ink/60">
          Rauma dibangun khusus untuk pasar properti Bandung Raya — bukan sekadar situs listing
          biasa, tapi platform yang dirancang biar listing kamu benar-benar dilihat dan
          dihubungi oleh calon pembeli yang serius.
        </p>
      </div>

      <div className="mt-10 space-y-6">
        {KEUNGGULAN.map((item) => (
          <div key={item.title} className="flex gap-4 rounded-2xl border border-line bg-white p-5">
            <span className="text-3xl" aria-hidden>{item.icon}</span>
            <div>
              <h2 className="font-display text-lg font-semibold text-navy">{item.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/70">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl bg-navy p-8 text-center text-cream">
        <h2 className="font-display text-xl font-semibold">Siap Pasarkan Properti Kamu di Rauma?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-cream/70">
          Baik kamu developer perumahan, agen, atau punya properti pribadi yang ingin dititipkan
          jual — tim Rauma siap bantu diskusikan bentuk kerja sama yang paling pas.
        </p>
        <a
          href={WA_LINK}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white hover:bg-forest-dark"
        >
          <span aria-hidden>💬</span> Hubungi Kami di WhatsApp
        </a>
      </div>
    </div>
  );
}
