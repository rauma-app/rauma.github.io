import React, { useState } from 'react';

/**
 * Tombol share, dipakai mengambang di pojok foto (sebelahan sama
 * SaveButton) di halaman detail iklan & profil penjual.
 *
 * Di HP (Android/iOS): buka menu share BAWAAN sistem operasi -- otomatis
 * isinya semua app yang keinstall (WhatsApp, Instagram, dst), TANPA kita
 * perlu integrasi API apapun ke tiap sosmed.
 *
 * Di desktop/browser yang gak dukung Web Share API: fallback jadi
 * "salin link" ke clipboard.
 */
export default function ShareButton({ title, text, url, className = '' }) {
  const [copied, setCopied] = useState(false);

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const shareUrl = url || window.location.href;

    // navigator.share cuma tersedia di konteks aman (https) dan browser
    // yang dukung (kebanyakan browser HP modern; sebagian besar browser
    // desktop belum dukung -- makanya ada fallback di bawah).
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch (err) {
        // AbortError = user batal milih app share-nya sendiri, bukan error
        if (err.name !== 'AbortError') {
          console.error('Gagal share:', err);
        }
      }
      return;
    }

    // Fallback desktop: salin link ke clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Gagal menyalin link:', err);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Bagikan"
      title={copied ? 'Link tersalin!' : 'Bagikan'}
      className={`group flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-lg backdrop-blur transition-transform hover:scale-105 active:scale-90 ${className}`}
    >
      {copied ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 fill-none stroke-forest"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 fill-none stroke-ink/60 group-hover:stroke-forest"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.5 6.8-3.9M8.6 13.5l6.8 3.9" />
        </svg>
      )}
    </button>
  );
}
