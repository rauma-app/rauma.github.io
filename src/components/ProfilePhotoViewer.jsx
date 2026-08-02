import React, { useEffect, useState } from 'react';

/**
 * Foto profil yang bisa diklik buat buka tampilan besar ala "story",
 * khusus akun admin/premium (dikontrol dari luar lewat prop `clickable`).
 * Untuk user biasa, cukup pasang <img> biasa (jangan pakai komponen ini)
 * -- fotonya tetap kelihatan buat semua orang, cuma gak bisa diklik.
 */
/**
 * Foto profil Google (login lewat Google) URL-nya biasanya diakhiri
 * `=s96-c` (thumbnail kecil, 96px). Buat tampilan besar/zoom, kita minta
 * resolusi yang lebih tinggi dengan mengganti angka ukurannya. Kalau
 * fotonya bukan dari Google (gak match pola ini), URL dikembalikan apa
 * adanya, gak error.
 */
function getHighResPhotoUrl(url, size = 500) {
  if (!url) return url;
  if (/=s\d+-c(-\S*)?$/.test(url)) {
    return url.replace(/=s\d+-c(-\S*)?$/, `=s${size}-c`);
  }
  return url;
}

export default function ProfilePhotoViewer({ src, alt, clickable = false, className = '' }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!src) return null;

  return (
    <>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onClick={
          clickable
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(true);
              }
            : undefined
        }
        className={`${className} ${clickable ? 'cursor-pointer' : ''}`}
      />

      {clickable && open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup"
            className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-forest text-white shadow-lg hover:bg-forest-dark"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-7 w-7">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            src={getHighResPhotoUrl(src)}
            alt={alt}
            referrerPolicy="no-referrer"
            className="max-h-[80vh] max-w-[85vw] rounded-2xl object-contain"
          />
        </div>
      )}
    </>
  );
}
