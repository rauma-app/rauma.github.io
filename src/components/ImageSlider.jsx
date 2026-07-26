import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

// `ratio` dipakai lewat inline style (CSS aspect-ratio), BUKAN lewat
// class Tailwind seperti sebelumnya -- supaya nggak bergantung pada
// Tailwind berhasil men-generate class arbitrary value dari default
// parameter. Formatnya string biasa, misal "5 / 3" atau "7 / 4".
export default function ImageSlider({ images = [], alt = '', ratio = '7 / 5', rounded = 'rounded-2xl' }) {
  const list = images.length ? images : ['/placeholder-house.jpg'];

  return (
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
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
