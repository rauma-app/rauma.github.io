import React from 'react';
import { Link } from 'react-router-dom';
import { FaBed, FaBath, FaVectorSquare, FaRulerCombined } from 'react-icons/fa';
import ImageSlider from './ImageSlider';
import { formatRupiahShort, formatMonthlyShort } from '../lib/kpr';
import { slugifyTitle } from '../lib/slugify';

export default function ListingCard({ listing }) {
  // Fallback: listing lama (sebelum migrasi kolom kabupaten/kecamatan) cuma
  // punya field `location`, jadi tetap tampilkan itu kalau kabupaten kosong.
  const kabupatenText = listing.kabupaten || listing.location || '';
  const titleSlug = slugifyTitle(listing.title);

  return (
    <Link
      to={
        listing.perumahanSlug
          ? `/perumahan/${listing.perumahanSlug}`
          : titleSlug
            ? `/id/${listing.id}/${titleSlug}`
            : `/id/${listing.id}`
      }
      className="group block overflow-hidden rounded-2xl border border-line bg-paper transition-shadow hover:shadow-lg"
    >
      <ImageSlider
        images={listing.images}
        alt={listing.title || listing.kecamatan}
        ratio="1 / 1"
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

        {/* Baris spesifikasi ringkas -- cuma tampil kalau datanya ada,
            listing lama yang belum pernah diisi gak bakal nampilin apa-apa
            di baris ini (gak ada angka "0" yang nyasar/salah). */}
        {(listing.bedrooms || listing.bathrooms || listing.luasTanah || listing.luasBangunan) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-ink/50 sm:mt-2 sm:text-xs">
            {listing.bedrooms ? (
              <span className="flex items-center gap-1">
                <FaBed size={11} /> {listing.bedrooms}
              </span>
            ) : null}
            {listing.bathrooms ? (
              <span className="flex items-center gap-1">
                <FaBath size={11} /> {listing.bathrooms}
              </span>
            ) : null}
            {listing.luasTanah ? (
              <span className="flex items-center gap-1">
                <FaVectorSquare size={10} /> LT {listing.luasTanah}m²
              </span>
            ) : null}
            {listing.luasBangunan ? (
              <span className="flex items-center gap-1">
                <FaRulerCombined size={10} /> LB {listing.luasBangunan}m²
              </span>
            ) : null}
          </div>
        )}
      </div>
    </Link>
  );
}
