import React from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

const SECTIONS = [
  {
    title: 'Jelajahi Properti',
    links: [
      { label: 'Beranda', to: '/' },
      { label: 'Cari Rumah', to: '/cari' },
      { label: 'Perumahan', to: '/perumahan' },
      { label: 'Rumah Termurah', to: '/termurah' },
      { label: 'Rumah Termahal', to: '/termahal' },
      { label: 'Rumah Subsidi', to: '/subsidi' },
      { label: 'Take Over KPR', to: '/take-over-kpr' },
    ],
  },
  {
    title: 'Alat Bantu',
    links: [
      { label: 'Kalkulator KPR', to: '/kalkulator-kpr' },
      { label: 'Carikan Properti untuk Saya', to: '/carikan-properti' },
      { label: 'Pasang Iklan', to: '/posting' },
    ],
  },
  {
    title: 'Informasi',
    links: [
      { label: 'Tentang Kami', to: '/tentang-kami' },
      { label: 'Kebijakan dan Privasi', to: '/kebijakan-privasi' },
      { label: 'Syarat & Ketentuan', to: '/syarat-ketentuan' },
      { label: 'Saran & Masukan', to: '/saran-masukan' },
      { label: 'Peta Situs', to: '/peta-situs' },
    ],
  },
];

export default function PetaSitus() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Seo
        title="Peta Situs"
        description="Daftar lengkap semua halaman di Rauma.id."
        path="/peta-situs"
      />

      <h1 className="font-display text-3xl font-semibold text-navy">Peta Situs</h1>
      <p className="mt-2 text-sm text-ink/60">Daftar lengkap halaman yang tersedia di Rauma.id.</p>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="font-display text-lg font-semibold text-navy">{section.title}</h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {section.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="block rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink/80 hover:border-forest hover:text-forest"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
