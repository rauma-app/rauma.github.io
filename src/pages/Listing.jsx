import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import ImageSlider from '../components/ImageSlider';
import ListingCard from '../components/ListingCard';
import VerifiedBadge from '../components/VerifiedBadge';
import { ADMIN_UIDS } from '../lib/admin';
import Seo from '../components/Seo';
import { formatRupiah, formatRupiahShort, formatMonthlyShort } from '../lib/kpr';

const SPEC_ROWS = [
  { key: 'luasTanah', label: 'Luas Tanah', icon: '📐', suffix: ' m²' },
  { key: 'luasBangunan', label: 'Luas Bangunan', icon: '🏠', suffix: ' m²' },
  { key: 'bedrooms', label: 'Kamar Tidur', icon: '🛏️', suffix: '' },
  { key: 'bathrooms', label: 'Kamar Mandi', icon: '🚿', suffix: '' },
  { key: 'electricity', label: 'Daya Listrik', icon: '⚡', suffix: '' },
  { key: 'air', label: 'Air', icon: '💧', suffix: '' },
  { key: 'sertifikat', label: 'Sertifikat', icon: '📋', suffix: '' },
  { key: 'unitTersedia', label: 'Unit Tersedia', icon: '🏘️', suffix: ' unit' },
];

export default function Listing() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'listings', id));
        if (snap.exists()) {
          setListing({ id: snap.id, ...snap.data() });
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Cari iklan lain di kabupaten/kecamatan yang sama, kecuali iklan ini sendiri.
  useEffect(() => {
    if (!listing?.kabupaten) return;
    let cancelled = false;

    async function loadRelated() {
      try {
        const q = query(
          collection(db, 'listings'),
          where('kabupaten', '==', listing.kabupaten),
          where('status', '==', 'approved')
        );
        const snap = await getDocs(q);
        if (cancelled) return;

        const others = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((l) => l.id !== listing.id);

        // Prioritaskan yang kecamatannya sama persis, sisanya di belakang.
        const sameKecamatan = others.filter((l) => l.kecamatan === listing.kecamatan);
        const rest = others.filter((l) => l.kecamatan !== listing.kecamatan);
        setRelated([...sameKecamatan, ...rest].slice(0, 4));
      } catch (err) {
        console.error(err);
      }
    }

    loadRelated();
    return () => {
      cancelled = true;
    };
  }, [listing]);

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-ink/50">Memuat...</div>;
  }

  if (notFound || !listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink/60">Iklan tidak ditemukan.</p>
        <Link to="/" className="mt-4 inline-block text-forest underline">Kembali ke beranda</Link>
      </div>
    );
  }

  const waNumber = (listing.whatsapp || '').replace(/[^0-9]/g, '');
  const waLink = waNumber
    ? `https://wa.me/${waNumber.startsWith('0') ? '62' + waNumber.slice(1) : waNumber}?text=${encodeURIComponent(
        `Halo, saya tertarik dengan rumah di ${listing.kecamatan ? listing.kecamatan + ' - ' : ''}${listing.kabupaten} (${formatRupiah(listing.price)}).`
      )}`
    : null;

  const lokasiText = listing.kecamatan ? `${listing.kecamatan}, ${listing.kabupaten}` : listing.kabupaten;
  const seoTitle = `Rumah Dijual di ${lokasiText} - ${formatRupiahShort(listing.price)}`;
  const seoDescription = `Rumah dijual di ${lokasiText} harga ${formatRupiah(listing.price)}${
    listing.luasTanah ? `, LT ${listing.luasTanah}m²` : ''
  }${listing.luasBangunan ? `, LB ${listing.luasBangunan}m²` : ''}${
    listing.bedrooms ? `, ${listing.bedrooms} kamar tidur` : ''
  }${
    listing.cicilanPerBulan ? `. Cicilan mulai ${formatMonthlyShort(listing.cicilanPerBulan)}` : ''
  }. Lihat detail & hubungi penjual di Rauma.`;
  const seoJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: seoTitle,
    description: seoDescription,
    image: listing.images && listing.images.length ? listing.images : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IDR',
      price: listing.price,
      availability: 'https://schema.org/InStock',
    },
    ...(listing.lat && listing.lon
      ? {
          additionalProperty: {
            '@type': 'PropertyValue',
            name: 'Lokasi',
            value: lokasiText,
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Seo
        title={seoTitle}
        description={seoDescription}
        path={`/id/${listing.id}`}
        image={listing.images && listing.images[0]}
        jsonLd={seoJsonLd}
      />
      <ImageSlider images={listing.images} alt={listing.kecamatan} ratio="3 / 2" enableLightbox />

      <div className="mt-6">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="font-display text-3xl font-bold text-navy">{formatRupiahShort(listing.price)}</p>
          {listing.cicilanPerBulan ? (
            <p className="text-sm text-ink/50">
              Cicilan mulai {formatMonthlyShort(listing.cicilanPerBulan)}
            </p>
          ) : null}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-ink/60">
          <span aria-hidden>📍</span>
          <span>{listing.kecamatan ? `${listing.kecamatan} - ` : ''}{listing.kabupaten}</span>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="section-rule font-display text-xl font-semibold text-navy">Spesifikasi</h2>
        <dl className="divide-y divide-line rounded-2xl border border-line bg-white">
          {SPEC_ROWS.filter((row) => listing[row.key]).map((row) => (
            <div key={row.key} className="flex items-center justify-between px-4 py-3">
              <dt className="flex items-center gap-2 text-sm text-ink/60">
                <span aria-hidden>{row.icon}</span> {row.label}
              </dt>
              <dd className="text-sm font-medium text-ink">
                {listing[row.key]}{row.suffix}
              </dd>
            </div>
          ))}
          {listing.videoUrl && (
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="flex items-center gap-2 text-sm text-ink/60">
                <span aria-hidden>🎥</span> Video
              </dt>
              <dd className="text-sm font-medium">
                <a
                  href={listing.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-forest underline"
                >
                  Lihat Video
                </a>
              </dd>
            </div>
          )}
        </dl>
      </section>

      {listing.description && (
        <section className="mt-8">
          <h2 className="section-rule font-display text-xl font-semibold text-navy">Deskripsi</h2>
          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">
              {listing.description}
            </p>
          </div>
        </section>
      )}

      <section className="mt-8 flex items-center justify-between rounded-2xl border border-line bg-white p-4">
        <Link
          to={listing.ownerUid ? `/penjual/${listing.ownerUid}` : '#'}
          className={`flex items-center gap-3 ${listing.ownerUid ? 'hover:opacity-80' : 'pointer-events-none'}`}
        >
          {listing.ownerPhoto && (
            <img src={listing.ownerPhoto} alt={listing.ownerName} referrerPolicy="no-referrer" className="h-11 w-11 rounded-full object-cover" />
          )}
          <span className="flex items-center gap-1 font-semibold text-ink underline-offset-2 hover:underline">
  {listing.ownerName}
  {ADMIN_UIDS.includes(listing.ownerUid) && <VerifiedBadge />}
</span>
        </Link>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-full bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark"
          >
            <span aria-hidden>💬</span> Chat Sekarang
          </a>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="section-rule font-display text-xl font-semibold text-navy">
            Rumah Lain di {listing.kecamatan || listing.kabupaten}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {related.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
