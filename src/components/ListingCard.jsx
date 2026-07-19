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
      <div className="p-4">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold text-navy">
            {formatRupiahShort(listing.price)}
          </span>
          <span className="text-sm text-ink/50">· {formatMonthlyShort(monthly)}</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-sm text-ink/60">
          <span aria-hidden>📍</span>
          <span>
            {listing.kecamatan ? `${listing.kecamatan} - ` : ''}
            {listing.kabupaten}
          </span>
        </div>
      </div>
    </Link>
  );
}
