import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram, FaFacebook, FaTiktok, FaYoutube } from 'react-icons/fa';

// GANTI nilai-nilai placeholder di bawah ini dengan data asli kamu.
const SOCIAL_LINKS = [
  { label: 'Instagram', Icon: FaInstagram, href: '#' },
  { label: 'Facebook', Icon: FaFacebook, href: '#' },
  { label: 'TikTok', Icon: FaTiktok, href: '#' },
  { label: 'YouTube', Icon: FaYoutube, href: '#' },
];

const CONTACT = {
  phone: '0812-3456-7890',
  email: 'halo@rauma.id',
  hours: 'Senin – Sabtu, 09:00 – 17:00 WIB',
};

const QUICK_LINKS = [
  { label: 'Tentang Kami', href: '#' },
  { label: 'Cara Kerja', href: '#' },
  { label: 'Perumahan', to: '/perumahan' },
  { label: 'Pasang Iklan', to: '/posting' },
];

export default function Footer() {
  return (
    <footer className="mt-16 bg-navy text-cream/80">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-10 sm:grid-cols-[1.3fr_1fr_1fr]">
          {/* Kolom 1: Logo, deskripsi, social media */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>🏠</span>
              <span className="font-display text-2xl font-bold text-white">RAUMA</span>
            </div>
            <p className="mt-3 max-w-xs text-sm">
              Rauma.id adalah platform jual beli rumah KPR yang mudah dan gratis untuk
              seluruh masyarakat Indonesia.
            </p>
            <div className="mt-4 flex gap-3">
              {SOCIAL_LINKS.map(({ label, Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 hover:border-gold hover:bg-white/5"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Kolom 2: Tautan */}
          <div>
            <p className="text-sm font-semibold text-white">Tautan</p>
            <ul className="mt-3 space-y-2 text-sm">
              {QUICK_LINKS.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link to={l.to} className="hover:text-white">{l.label}</Link>
                  ) : (
                    <a href={l.href} className="hover:text-white">{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Kolom 3: Download aplikasi, lalu Hubungi Kami di bawahnya */}
          <div>
            <p className="text-sm font-semibold text-white">Download Aplikasi Kami</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {/*
                Taruh file badge resmi di folder /public, lalu pakai src="/nama-file".
                Unduh badge resmi (BUKAN tangkapan layar/jiplakan) di:
                - Apple: developer.apple.com/app-store/marketing/guidelines/#section-badges
                - Google: play.google.com/intl/en_us/badges/
                Sebelum file itu ada, badge ini akan tampil kosong/patah - itu wajar,
                normal begitu kamu upload file aslinya ke /public.
              */}
              <a href="#" target="_blank" rel="noreferrer">
                <img src="/app-store-badge.svg" alt="Download di App Store" className="h-10" />
              </a>
              <a href="#" target="_blank" rel="noreferrer">
                <img src="/google-play-badge.png" alt="Tersedia di Google Play" className="h-10" />
              </a>
            </div>

            <div className="mt-6 border-t border-white/10 pt-6">
              <p className="text-sm font-semibold text-white">Hubungi Kami</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span aria-hidden>📞</span> {CONTACT.phone}
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden>✉️</span> {CONTACT.email}
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden>🕒</span> {CONTACT.hours}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-white/10 pt-6 text-xs text-cream/50">
          © {new Date().getFullYear()} Rauma.id. Seluruh hak cipta dilindungi.
        </div>
      </div>
    </footer>
  );
}
