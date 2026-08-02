import React from 'react';
import { Link } from 'react-router-dom';
import ImageSlider from './ImageSlider';
import { formatRupiahShort, formatMonthlyShort } from '../lib/kpr';

export default function ListingCard({ listing }) {
  // Fallback: listing lama (sebelum migrasi kolom kabupaten/kecamatan) cuma
  // punya field `location`, jadi tetap tampilkan itu kalau kabupaten kosong.
  const kabupatenText = listing.kabupaten || listing.location || '';

  return (
    <Link
      to={`/id/${listing.id}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-paper transition-shadow hover:shadow-lg"
    >
      <ImageSlider
        images={listing.images}
        alt={listing.title || listing.kecamatan}
        ratio="3 / 4"
        rounded="rounded-none"
      />
      <div className="p-3 sm:p-4">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="font-display text-base font-semibold text-navy sm:text-xl">
            {formatRupiahShort(listing.price)}
          </span>
          {listing.cicilanPerBulan ? (
            <span className="text-xs text-ink/50 sm:text-sm">· {formatMonthlyShort(listing.cicilanPerBulan)}</span>
          ) : null}
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-xs text-ink/60 sm:mt-2 sm:text-sm">
          <span aria-hidden>📍</span>
          <span className="line-clamp-1">
            {listing.kecamatan ? `${listing.kecamatan} - ` : ''}
            {kabupatenText}
          </span>
        </div>
      </div>
    </Link>
  );
}
