import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { d1Api } from '../lib/d1Api';
import ImageSlider from '../components/ImageSlider';
import ListingCard from '../components/ListingCard';
import Seo from '../components/Seo';
import VerifiedBadge from '../components/VerifiedBadge';
import { ADMIN_UIDS } from '../lib/admin';
import { PREMIUM_UIDS } from '../lib/premium';
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
        const data = await d1Api.getListingById(id);
        if (data) {
          // Parse gambar dengan aman
          let parsedImages = [];
          try {
            parsedImages = typeof data.images === 'string' ? JSON.parse(data.images) : data.images;
          } catch (e) {
            parsedImages = [];
          }

          if (!Array.isArray(parsedImages) || parsedImages.length === 0) {
            parsedImages = ['/placeholder-house.jpg'];
          }

          setListing({
            ...data,
            images: parsedImages,
            price: Number(data.price) || 0,
            ownerUid: data.ownerUid || data.seller_uid || '',
            ownerName: data.ownerName || data.seller_name || 'Penjual',
            ownerPhoto: data.ownerPhoto || data.seller_photo || '',
            whatsapp: data.whatsapp || data.seller_phone || '',
            kabupaten: data.kabupaten || data.location || 'Lokasi',
          });
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Gagal mengambil data listing:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!listing?.kabupaten) return;
    let cancelled = false;

    async function loadRelated() {
      try {
        const allListings = await d1Api.getListings();
        if (cancelled) return;

        const others = (allListings || []).filter(
          (l) => l.id !== listing.id && (l.kabupaten === listing.kabupaten || l.location === listing.kabupaten)
        );

        const sameKecamatan = others.filter((l) => l.kecamatan && l.kecamatan === listing.kecamatan);
        const rest = others.filter((l) => !l.kecamatan || l.kecamatan !== listing.kecamatan);
        setRelated([...sameKecamatan, ...rest].slice(0, 4));
      } catch (err) {
        console.error('Gagal mengambil iklan terkait:', err);
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
        <Link to="/" className="mt-4 inline-block font-semibold text-forest underline">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  // Format Angka & Teks dengan Proteksi Fallback
  const formattedPriceShort = formatRupiahShort ? formatRupiahShort(listing.price) : `Rp ${listing.price.toLocaleString('id-ID')}`;
  const formattedPriceFull = formatRupiah ? formatRupiah(listing.price) : `Rp ${listing.price.toLocaleString('id-ID')}`;

  const waNumber = (listing.whatsapp || '').replace(/[^0-9]/g, '');
  const waLink = waNumber
    ? `https://wa.me/${waNumber.startsWith('0') ? '62' + waNumber.slice(1) : waNumber}?text=${encodeURIComponent(
        `Halo, saya tertarik dengan rumah di ${listing.kecamatan ? listing.kecamatan + ' - ' : ''}${listing.kabupaten} (${formattedPriceFull}).`
      )}`
    : null;

  const lokasiText = listing.kecamatan ? `${listing.kecamatan}, ${listing.kabupaten}` : listing.kabupaten;
  const seoTitle = `Rumah Dijual di ${lokasiText} - ${formattedPriceShort}`;
  const seoDescription = `Rumah dijual di ${lokasiText} harga ${formattedPriceFull}. Lihat detail & hubungi penjual di Rauma.`;

  const adminList = Array.isArray(ADMIN_UIDS) ? ADMIN_UIDS : [];
  const premiumList = Array.isArray(PREMIUM_UIDS) ? PREMIUM_UIDS : [];
  const isOwnerAdmin = adminList.includes(listing.ownerUid);
  const isOwnerPremium = premiumList.includes(listing.ownerUid);
  const isOwnerVerified = isOwnerAdmin || isOwnerPremium;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {Seo && (
        <Seo
          title={seoTitle}
          description={seoDescription}
          path={`/id/${listing.id}`}
          image={listing.images?.[0]}
        />
      )}

      {/* Slider Gambar */}
      {ImageSlider ? (
        <ImageSlider images={listing.images} alt={listing.title || lokasiText} ratio="3 / 2" enableLightbox />
      ) : (
        <img src={listing.images?.[0]} alt={listing.title} className="w-full h-64 object-cover rounded-2xl" />
      )}

      {/* Informasi Utama */}
      <div className="mt-6">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="font-display text-3xl font-bold text-navy">{formattedPriceShort}</p>
          {listing.cicilanPerBulan && formatMonthlyShort && (
            <p className="text-sm text-ink/50">
              Cicilan mulai {formatMonthlyShort(listing.cicilanPerBulan)}
            </p>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-ink/60">
          <span>📍</span>
          <span>{listing.kecamatan ? `${listing.kecamatan} - ` : ''}{listing.kabupaten}</span>
        </div>
      </div>

      {/* Tabel Spesifikasi */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-navy mb-3">Spesifikasi</h2>
        <dl className="divide-y divide-line rounded-2xl border border-line bg-white">
          {SPEC_ROWS.filter((row) => listing[row.key]).map((row) => (
            <div key={row.key} className="flex items-center justify-between px-4 py-3">
              <dt className="flex items-center gap-2 text-sm text-ink/60">
                <span>{row.icon}</span> {row.label}
              </dt>
              <dd className="text-sm font-medium text-ink">
                {listing[row.key]}{row.suffix}
              </dd>
            </div>
          ))}
          {listing.videoUrl && (
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="flex items-center gap-2 text-sm text-ink/60">
                <span>🎥</span> Video
              </dt>
              <dd className="text-sm font-medium">
                <a href={listing.videoUrl} target="_blank" rel="noreferrer" className="text-forest underline font-semibold">
                  Lihat Video
                </a>
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Deskripsi */}
      {listing.description && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-navy mb-3">Deskripsi</h2>
          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">
              {listing.description}
            </p>
          </div>
        </section>
      )}

      {/* Kontak Penjual */}
      <section className="mt-8 flex items-center justify-between rounded-2xl border border-line bg-white p-4">
        {isOwnerVerified ? (
          <Link to={`/penjual/${listing.ownerUid}`} className="flex items-center gap-3 hover:opacity-80">
            {listing.ownerPhoto && (
              <img
                src={listing.ownerPhoto}
                alt={listing.ownerName}
                referrerPolicy="no-referrer"
                className="h-11 w-11 rounded-full object-cover"
              />
            )}
            <span className="flex items-center gap-1 font-semibold text-ink">
              {listing.ownerName}
              {VerifiedBadge && <VerifiedBadge color={isOwnerAdmin ? 'gold' : 'blue'} />}
            </span>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            {listing.ownerPhoto && (
              <img
                src={listing.ownerPhoto}
                alt={listing.ownerName}
                referrerPolicy="no-referrer"
                className="h-11 w-11 rounded-full object-cover"
              />
            )}
            <span className="font-semibold text-ink">{listing.ownerName}</span>
          </div>
        )}

{waLink && (
  <a
    href={waLink}
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1EBE5B] transition-colors shadow-sm"
  >
    {/* WhatsApp SVG Icon */}
    <svg
      className="w-5 h-5 fill-current"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.333 4.994L2 22l5.133-1.345a9.967 9.967 0 0 0 4.877 1.27h.004c5.507 0 9.99-4.478 9.99-9.985 0-2.667-1.038-5.176-2.924-7.062A9.92 9.92 0 0 0 12.012 2zm0 18.293h-.003a8.31 8.31 0 0 1-4.24-1.164l-.304-.181-3.152.825.84-3.072-.199-.316a8.293 8.293 0 0 1-1.272-4.398c0-4.58 3.727-8.307 8.308-8.307 2.219 0 4.305.865 5.872 2.433a8.267 8.267 0 0 1 2.428 5.874c-.001 4.58-3.728 8.306-8.278 8.306z" />
    </svg>
    <span>Chat Sekarang</span>
  </a>
)}
        
        
      </section>

      {/* Rekomendasi Terkait */}
      {related.length > 0 && ListingCard && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-navy mb-3">
            Rumah Lain di {listing.kabupaten}
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
          
