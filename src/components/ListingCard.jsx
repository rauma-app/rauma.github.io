import React from 'react';
import { Link } from 'react-router-dom';
import ImageSlider from './ImageSlider';
import { calculateKPR, formatRupiahShort, formatMonthlyShort } from '../lib/kpr';

export default function ListingCard({ listing }) {
  const { monthly } = calculateKPR(listing.price);

  return (
    <Link
      to={`/id/${listing.id}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-paper transition-shadow hover:shadow-lg"
    >
      <ImageSlider images={listing.images} alt={listing.title || listing.kecamatan} rounded="rounded-none" />
      <div className="p-3 sm:p-4">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="font-display text-base font-semibold text-navy sm:text-xl">
            {formatRupiahShort(listing.price)}
          </span>
          <span className="text-xs text-ink/50 sm:text-sm">· {formatMonthlyShort(monthly)}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-xs text-ink/60 sm:mt-2 sm:text-sm">
          <span aria-hidden>📍</span>
          <span className="line-clamp-1">
            {listing.kecamatan ? `${listing.kecamatan} - ` : ''}
            {listing.kabupaten}
          </span>
        </div>
      </div>
    </Link>
  );
}
