import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

export default function ImageSlider({ images = [], alt = '', aspect = 'aspect-[4/3]', rounded = 'rounded-2xl' }) {
  const list = images.length ? images : ['/placeholder-house.jpg'];

  return (
    <Swiper
      modules={[Pagination]}
      pagination={{ clickable: true }}
      className={`w-full ${aspect} ${rounded} overflow-hidden`}
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
