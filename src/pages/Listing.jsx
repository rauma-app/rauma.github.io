import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { d1Api } from '../lib/d1Api';
import ImageSlider from '../components/ImageSlider';
import ListingCard from '../components/ListingCard';
import Seo from '../components/Seo';
import VerifiedBadge from '../components/VerifiedBadge';
import SaveButton from '../components/SaveButton';
import { ADMIN_UIDS } from '../lib/admin';
import { usePremium } from '../context/PremiumContext';
import { formatRupiah, formatRupiahShort, formatMonthlyShort } from '../lib/kpr';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

// Baris sisa spesifikasi (Luas & Kamar sudah digabung terpisah, lihat di bawah)
const SPEC_ROWS = [
  { key: 'electricity', label: 'Daya Listrik', icon: '⚡', suffix: '' },
  { key: 'air', label: 'Air', icon: '💧', suffix: '' },
  { key: 'sertifikat', label: 'Sertifikat', icon: '📋', suffix: '' },
  { key: 'unitTersedia', label: 'Unit Tersedia', icon: '🏘️', suffix: ' unit' },
];

// Material bangunan (opsional) - hanya tampil kalau ada isinya
const MATERIAL_ROWS = [
  { key: 'materialPondasi', label: 'Pondasi' },
  { key: 'materialDinding', label: 'Dinding' },
  { key: 'materialAtap', label: 'Penutup Atap' },
  { key: 'materialKusen', label: 'Kusen' },
  { key: 'materialLantai', label: 'Lantai' },
  { key: 'materialKloset', label: 'Kloset' },
];

export default function Listing() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { premiumMap } = usePremium();
  const [related, setRelated] = useState([]);
  const [materialOpen, setMaterialOpen] = useState(false);

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

  // Harga versi ringkas khusus buat pesan WhatsApp, contoh: "Rp 900jt" / "Rp 1,2M"
  // (beda dari formattedPriceShort yang pakai "900 Jt" dengan spasi & huruf besar)
  const formattedPriceWA = (() => {
    const value = listing.price;
    if (value == null || Number.isNaN(value)) return '-';
    if (value >= 1_000_000_000) {
      return `Rp ${(value / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')}M`;
    }
    if (value >= 1_000_000) {
      return `Rp ${Math.round(value / 1_000_000)}jt`;
    }
    return formattedPriceFull;
  })();

  // URL halaman iklan ini, ikut disertakan di pesan WhatsApp
  const listingUrl = typeof window !== 'undefined' ? window.location.href : '';

  const waNumber = (listing.whatsapp || '').replace(/[^0-9]/g, '');
  const waLink = waNumber
    ? `https://wa.me/${waNumber.startsWith('0') ? '62' + waNumber.slice(1) : waNumber}?text=${encodeURIComponent(
        `Halo, saya tertarik dengan rumah di ${listing.kecamatan ? listing.kecamatan + ' - ' : ''}${listing.kabupaten} (${formattedPriceWA}).\n\n${listingUrl}`
      )}`
    : null;

  const lokasiText = listing.kecamatan ? `${listing.kecamatan}, ${listing.kabupaten}` : listing.kabupaten;
  const seoTitle = `Rumah Dijual di ${lokasiText} - ${formattedPriceShort}`;
  const seoDescription = `Rumah dijual di ${lokasiText} harga ${formattedPriceFull}. Lihat detail & hubungi penjual di Rauma.`;

  const adminList = Array.isArray(ADMIN_UIDS) ? ADMIN_UIDS : [];
  const isOwnerAdmin = adminList.includes(listing.ownerUid);
  const isOwnerPremium = Boolean(listing.ownerUid && premiumMap && premiumMap[listing.ownerUid] !== undefined);
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
      <div className="relative">
        {ImageSlider ? (
          <ImageSlider images={listing.images} alt={listing.title || lokasiText} ratio="3 / 2" enableLightbox />
        ) : (
          <img src={listing.images?.[0]} alt={listing.title} className="w-full h-64 object-cover rounded-2xl" />
        )}
        <SaveButton listingId={listing.id} className="absolute bottom-3 right-3 z-10" />
      </div>

      {/* Informasi Utama */}
      <div className="mt-6">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="font-display text-3xl font-bold text-navy">{formattedPriceShort}</p>
          {listing.cicilanPerBulan && formatMonthlyShort && (
            <p className="text-sm text-ink/50">
              Mulai {formatMonthlyShort(listing.cicilanPerBulan)}
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
          {listing.luasBangunan && listing.luasTanah && (
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="flex items-center gap-2 text-sm text-ink/60">
                <span>📐</span> Luas Bangunan &amp; Tanah
              </dt>
              <dd className="text-sm font-medium text-ink">
                {listing.luasBangunan}m² / {listing.luasTanah}m²
              </dd>
            </div>
          )}
          {listing.bedrooms && listing.bathrooms && (
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="flex items-center gap-2 text-sm text-ink/60">
                <span>🛏️</span> Kamar Tidur &amp; Mandi
              </dt>
              <dd className="text-sm font-medium text-ink">
                {listing.bedrooms} / {listing.bathrooms}
              </dd>
            </div>
          )}
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

      {/* Material Bangunan (opsional, hanya tampil kalau ada isinya) */}
      {MATERIAL_ROWS.some((row) => listing[row.key]) && (
        <section className="mt-4">
          <div className="rounded-2xl border border-line bg-white">
            <button
              type="button"
              onClick={() => setMaterialOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left"
            >
              <span className="font-display text-base font-semibold text-navy">Material</span>
              {materialOpen ? (
                <FaChevronUp className="text-ink/50" size={14} />
              ) : (
                <FaChevronDown className="text-ink/50" size={14} />
              )}
            </button>
            {materialOpen && (
              <dl className="divide-y divide-line border-t border-line">
                {MATERIAL_ROWS.filter((row) => listing[row.key]).map((row) => (
                  <div key={row.key} className="flex items-center justify-between px-4 py-3">
                    <dt className="text-sm text-ink/60">{row.label}</dt>
                    <dd className="text-sm font-medium text-ink">{listing[row.key]}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>
      )}

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
            className="flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1EBE57]"
          >
            <span>💬</span> Chat Sekarang
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
