import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram, FaFacebook, FaTiktok, FaYoutube } from 'react-icons/fa';

// GANTI nilai-nilai placeholder di bawah ini dengan data asli kamu.
const SOCIAL_LINKS = [
  { label: 'Instagram', Icon: FaInstagram, href: 'https://www.instagram.com/rauma.id' },
  { label: 'Facebook', Icon: FaFacebook, href: '#' },
  { label: 'TikTok', Icon: FaTiktok, href: 'https://tiktok.com/@rauma.id' },
  { label: 'YouTube', Icon: FaYoutube, href: '#' },
];

const CONTACT = {
  phone: '+62 851-5622-2635',
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
        <div className="grid gap-10 sm:grid-cols-[1.3fr_1fr_1.3fr]">
          {/* Kolom 1: Logo gambar baru, deskripsi, social media */}
          <div>
            <Link to="/" className="flex items-center gap-2 overflow-visible">
              <img 
                src="/rauma-logo2.png" 
                alt="Rauma" 
                className="h-14 md:h-18 w-auto object-contain" 
              />
            </Link>
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

          {/* Kolom 3: Download Aplikasi (Transparan berdampingan) & Hubungi Kami */}
          <div>
            <div>
              <p className="text-sm font-semibold text-white">Download Aplikasi Kami</p>
              <div className="mt-3 flex flex-row gap-3">
                {/* Tombol App Store Transparan */}
                <a
                  href="#"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-white border border-white/20 hover:bg-white/10 hover:border-white/40 transition-colors"
                >
                  <svg className="h-5 w-5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.83 5.43c.64-.78 1.07-1.86.95-2.94-1 .04-2.22.67-2.91 1.45-.58.65-1.09 1.74-.95 2.8 1.12.09 2.26-.59 2.91-1.31z"/>
                  </svg>
                  <div className="text-left">
                    <p className="text-[9px] uppercase leading-tight text-cream/60">Download di</p>
                    <p className="text-xs font-medium leading-tight">App Store</p>
                  </div>
                </a>

                {/* Tombol Google Play Transparan */}
                <a
                  href="#"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-white border border-white/20 hover:bg-white/10 hover:border-white/40 transition-colors"
                >
                  <svg className="h-5 w-5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a1.472 1.472 0 0 1-.36-.992V2.806c0-.38.13-.715.36-.992zM14.92 13.128l2.062 2.062-11.45 6.643c-.456.265-.912.23-1.228-.053l10.616-8.652zm0-2.256L4.256 2.22c.316-.283.772-.318 1.228-.053l11.45 6.643-2.062 2.062zm1.66 1.66l2.973 1.724c.732.424.732 1.116 0 1.54l-2.973 1.724-2.256-2.256 2.256-2.256z"/>
                  </svg>
                  <div className="text-left">
                    <p className="text-[9px] uppercase leading-tight text-cream/60">Temukan di</p>
                    <p className="text-xs font-medium leading-tight">Google Play</p>
                  </div>
                </a>
              </div>
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

        {/* Copyright di tengah */}
        <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-cream/50">
          © {new Date().getFullYear()} Rauma.id. Seluruh hak cipta dilindungi.
        </div>
      </div>
    </footer>
  );
}
