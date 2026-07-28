import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import ImageSlider from '../components/ImageSlider';
import ListingCard from '../components/ListingCard';
import Seo from '../components/Seo';
import VerifiedBadge from '../components/VerifiedBadge';
import { ADMIN_UIDS } from '../lib/admin';
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
    image: listing.images && listing.images.length
