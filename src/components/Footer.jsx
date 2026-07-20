import React from 'react';
import { Link } from 'react-router-dom';

// GANTI nilai-nilai placeholder di bawah ini dengan data asli kamu.
const SOCIAL_LINKS = [
  { label: 'Instagram', icon: '📷', href: '#' },
  { label: 'Facebook', icon: '📘', href: '#' },
  { label: 'TikTok', icon: '🎵', href: '#' },
  { label: 'YouTube', icon: '▶️', href: '#' },
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
          {/* Logo, tagline, social */}
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
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-base hover:border-gold hover:bg-white/5"
                >
                  <span aria-hidden>{s.icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Link cepat */}
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

          {/* Kontak */}
          <div>
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

        {/* Download aplikasi (placeholder desain sendiri, ganti dengan badge resmi kalau app sudah rilis) */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-sm font-semibold text-white">Download Aplikasi Kami</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href="#"
              className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm hover:border-gold"
            >
              <span aria-hidden>🍎</span>
              <span>
                <span className="block text-[10px] text-cream/60">Download di</span>
                <span className="block font-semibold text-white">App Store</span>
              </span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm hover:border-gold"
            >
              <span aria-hidden>▶</span>
              <span>
                <span className="block text-[10px] text-cream/60">Tersedia di</span>
                <span className="block font-semibold text-white">Google Play</span>
              </span>
            </a>
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
