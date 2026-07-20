import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import ImageSlider from '../components/ImageSlider';
import KPRSlider from '../components/KPRSlider';
import ListingCard from '../components/ListingCard';
import { calculateKPR, formatRupiah, formatRupiahShort, formatMonthlyShort } from '../lib/kpr';

const SPEC_ROWS = [
  { key: 'luasTanah', label: 'Luas Tanah', icon: '📐', suffix: ' m²' },
  { key: 'luasBangunan', label: 'Luas Bangunan', icon: '🏠', suffix: ' m²' },
  { key: 'bedrooms', label: 'Kamar Tidur', icon: '🛏️', suffix: '' },
  { key: 'bathrooms', label: 'Kamar Mandi', icon: '🚿', suffix: '' },
  { key: 'electricity', label: 'Daya Listrik', icon: '⚡', suffix: '' },
  { key: 'air', label: 'Air', icon: '💧', suffix: '' },
  { key: 'sertifikat', label: 'Sertifikat', icon: '📋', suffix: '' },
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
          where('kabupaten', '==', listing.kabupaten)
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <ImageSlider images={listing.images} alt={listing.kecamatan} aspect="aspect-[16/10]" />

      <div className="mt-6">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="font-display text-3xl font-bold text-navy">{formatRupiahShort(listing.price)}</p>
          <p className="text-sm text-ink/50">
            Mulai {formatMonthlyShort(calculateKPR(listing.price).monthly)}
          </p>
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
        <div className="flex items-center gap-3">
          {listing.ownerPhoto && (
            <img src={listing.ownerPhoto} alt={listing.ownerName} referrerPolicy="no-referrer" className="h-11 w-11 rounded-full object-cover" />
          )}
          <span className="font-semibold text-ink">{listing.ownerName}</span>
        </div>
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

      <section className="mt-8">
        <KPRSlider price={listing.price} />
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
