import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// `ratio` dipakai lewat inline style (CSS aspect-ratio), BUKAN lewat
// class Tailwind seperti sebelumnya -- supaya nggak bergantung pada
// Tailwind berhasil men-generate class arbitrary value dari default
// parameter. Formatnya string biasa, misal "5 / 3" atau "7 / 4".
//
// `enableLightbox`: kalau true, klik foto akan membuka foto ukuran
// penuh (tidak di-crop) dengan tombol close & bisa geser ke foto lain.
// Sengaja default-nya FALSE supaya kartu di grid Home (ListingCard)
// tidak berubah perilakunya -- di situ klik foto tetap berarti
// "buka halaman listing ini", bukan buka lightbox.
export default function ImageSlider({
  images = [],
  alt = '',
  ratio = '7 / 5',
  rounded = 'rounded-2xl',
  enableLightbox = false,
}) {
  const list = images.length ? images : ['/placeholder-house.jpg'];
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Kunci scroll halaman belakang selagi lightbox terbuka.
  useEffect(() => {
    if (lightboxOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [lightboxOpen]);

  // Tutup dengan tombol Escape.
  useEffect(() => {
    if (!lightboxOpen) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') setLightboxOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen]);

  function openLightbox(i) {
    if (!enableLightbox) return;
    setLightboxIndex(i);
    setLightboxOpen(true);
  }

  return (
    <>
      <div className="relative">
        <Swiper
          modules={[Pagination]}
          pagination={{ clickable: true }}
          style={{ aspectRatio: ratio }}
          className={`w-full ${rounded} overflow-hidden`}
        >
          {list.map((src, i) => (
            <SwiperSlide key={i}>
              <img
                src={src}
                alt={`${alt} - foto ${i + 1}`}
                className={`h-full w-full object-cover ${enableLightbox ? 'cursor-zoom-in' : ''}`}
                loading="lazy"
                onClick={() => openLightbox(i)}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {enableLightbox && (
          <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M15 3h6v6" />
              <path d="M9 21H3v-6" />
              <path d="M21 3l-7 7" />
              <path d="M3 21l7-7" />
            </svg>
            Ketuk untuk perbesar
          </div>
        )}
      </div>

      {enableLightbox && lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Tutup"
            className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-forest text-white shadow-lg hover:bg-forest-dark"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-7 w-7">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Swiper container dikasih inline style (bukan class Tailwind
              "absolute inset-0") supaya PASTI menang dari CSS bawaan
              Swiper sendiri (.swiper{position:relative}) -- soalnya
              class Tailwind vs class Swiper punya specificity yang
              sama, jadi siapa menang tergantung urutan CSS ke-load,
              dan urutan itu bisa beda antara mode dev & hasil build
              production. Inline style selalu menang, jadi ini aman
              dari masalah "kadang jalan kadang nggak" itu. */}
          <Swiper
            modules={[Navigation, Keyboard]}
            navigation
            keyboard={{ enabled: true }}
            initialSlide={lightboxIndex}
            style={{ position: 'absolute', inset: 0 }}
          >
            {list.map((src, i) => (
              <SwiperSlide
                key={i}
                style={{
                  display: 'flex',
                  height: '100%',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                className="p-4"
              >
                <img
                  src={src}
                  alt={`${alt} - foto ${i + 1}`}
                  className="max-h-full max-w-full object-contain"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}
    </>
  );
}
