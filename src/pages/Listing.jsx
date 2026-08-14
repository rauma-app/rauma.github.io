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
import { getAnonId } from '../lib/anon';
import { formatRupiah, formatRupiahShort, formatMonthlyShort } from '../lib/kpr';
import { FaChevronDown, FaChevronUp, FaWhatsapp } from 'react-icons/fa';

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
  const { id, slug } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { premiumMap } = usePremium();
  const [related, setRelated] = useState([]);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setSelectedTypeIndex(0);
      setDescExpanded(false);
      try {
        const data = slug ? await d1Api.getListingBySlug(slug) : await d1Api.getListingById(id);
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

          // Tipe unit (khusus kategori Perumahan, misal "Tipe 36/72" /
          // "Tipe 45/90"). Kalau ada lebih dari 1 tipe, calon pembeli bisa
          // pilih-pilih -- harga/cicilan/luas/kamar/listrik ikut berubah.
          let parsedUnitTypes = [];
          try {
            parsedUnitTypes = typeof data.unitTypes === 'string' ? JSON.parse(data.unitTypes) : data.unitTypes;
          } catch (e) {
            parsedUnitTypes = [];
          }
          if (!Array.isArray(parsedUnitTypes)) parsedUnitTypes = [];

          setListing({
            ...data,
            images: parsedImages,
            price: Number(data.price) || 0,
            unitTypes: parsedUnitTypes,
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
  }, [id, slug]);

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

  // Kalau listing ini punya lebih dari 1 tipe unit (kategori Perumahan),
  // pakai data tipe yang lagi dipilih. Kalau cuma 1 tipe / gak ada sama
  // sekali, pakai data listing seperti biasa (listing lama/kategori lain,
  // tampilannya persis sama seperti sebelum fitur ini ada).
  const hasMultipleTypes = Array.isArray(listing.unitTypes) && listing.unitTypes.length > 1;
  // Deskripsi dianggap "panjang" kalau lumayan banyak karakter ATAU banyak
  // baris (misal daftar poin-poin kayak "GRATIS: Kitchen Set, dst") --
  // baru dipotong & dikasih tombol "Selengkapnya" kalau salah satu kepenuhi.
  const isDescLong =
    (listing.description || '').length > 280 || (listing.description || '').split('\n').length > 6;
  const activeType =
    Array.isArray(listing.unitTypes) && listing.unitTypes.length > 0
      ? listing.unitTypes[selectedTypeIndex] || listing.unitTypes[0]
      : null;
  const activeSpec = {
    price: activeType ? Number(activeType.price) || 0 : listing.price,
    cicilanPerBulan: activeType ? activeType.cicilanPerBulan : listing.cicilanPerBulan,
    luasTanah: activeType ? activeType.luasTanah : listing.luasTanah,
    luasBangunan: activeType ? activeType.luasBangunan : listing.luasBangunan,
    bedrooms: activeType ? activeType.bedrooms : listing.bedrooms,
    bathrooms: activeType ? activeType.bathrooms : listing.bathrooms,
    electricity: activeType ? activeType.electricity : listing.electricity,
  };
  // Foto khusus tipe yang lagi dipilih (kalau diisi penjual). Kalau tipe
  // ini gak punya foto sendiri, tetap pakai foto rumah utama -- listing
  // lama / kategori lain (yang gak punya konsep tipe) otomatis pakai ini juga.
  const activeImages =
    activeType && Array.isArray(activeType.images) && activeType.images.length > 0
      ? activeType.images
      : listing.images;

  // Format Angka & Teks dengan Proteksi Fallback
  const formattedPriceShort = formatRupiahShort ? formatRupiahShort(activeSpec.price) : `Rp ${activeSpec.price.toLocaleString('id-ID')}`;
  const formattedPriceFull = formatRupiah ? formatRupiah(activeSpec.price) : `Rp ${activeSpec.price.toLocaleString('id-ID')}`;

  // Harga versi ringkas khusus buat pesan WhatsApp, contoh: "Rp 900jt" / "Rp 1,2M"
  // (beda dari formattedPriceShort yang pakai "900 Jt" dengan spasi & huruf besar)
  const formattedPriceWA = (() => {
    const value = activeSpec.price;
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
        `Halo, saya tertarik dengan rumah di ${listing.kecamatan ? listing.kecamatan + ' - ' : ''}${listing.kabupaten}${
          activeType?.name ? ` (${activeType.name})` : ''
        } (${formattedPriceWA}).\n\n${listingUrl}`
      )}`
    : null;

  const lokasiText = listing.kecamatan ? `${listing.kecamatan}, ${listing.kabupaten}` : listing.kabupaten;

  // Judul & deskripsi buat Google. Khusus listing PERUMAHAN (punya
  // perumahanName), nama proyeknya ditaruh PALING DEPAN -- ini yang bikin
  // halaman ini relevan waktu orang cari nama proyeknya langsung di
  // Google, bukan cuma kata generik "rumah dijual di [lokasi]".
  const daftarTipe = Array.isArray(listing.unitTypes)
    ? listing.unitTypes.map((t) => t.name).filter(Boolean).join(', ')
    : '';

  const seoTitle = listing.perumahanName
    ? `${listing.perumahanName} - Rumah Dijual di ${lokasiText}`
    : `Rumah Dijual di ${lokasiText} - ${formattedPriceShort}`;

  const seoDescription = listing.perumahanName
    ? `${listing.perumahanName} - hunian di ${lokasiText} mulai ${formattedPriceShort}.${
        daftarTipe ? ` Tersedia tipe ${daftarTipe}.` : ''
      } Lihat detail lengkap & hubungi penjual di Rauma.`
    : `Rumah dijual di ${lokasiText} harga ${formattedPriceFull}. Lihat detail & hubungi penjual di Rauma.`;

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
          path={listing.perumahanSlug ? `/perumahan/${listing.perumahanSlug}` : `/id/${listing.id}`}
          image={activeImages?.[0]}
        />
      )}

      {/* Slider Gambar */}
      <div className="relative">
        {ImageSlider ? (
          <ImageSlider key={selectedTypeIndex} images={activeImages} alt={listing.title || lokasiText} ratio="3 / 2" enableLightbox />
        ) : (
          <img src={activeImages?.[0]} alt={listing.title} className="w-full h-64 object-cover rounded-2xl" />
        )}
        <SaveButton listingId={listing.id} className="absolute bottom-3 right-3 z-10" />
      </div>

      {/* Informasi Utama */}
      <div className="mt-6">
        {hasMultipleTypes && activeType?.name && (
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">{activeType.name}</p>
        )}
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="font-display text-3xl font-bold text-navy">{formattedPriceShort}</p>
          {activeSpec.cicilanPerBulan && formatMonthlyShort && (
            <p className="text-sm text-ink/50">
              Mulai {formatMonthlyShort(activeSpec.cicilanPerBulan)}
            </p>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-ink/60">
          <span>📍</span>
          <span>{listing.kecamatan ? `${listing.kecamatan} - ` : ''}{listing.kabupaten}</span>
        </div>
      </div>

      {/* Pilihan Tipe Unit (cuma muncul kalau listing ini punya >1 tipe) */}
      {hasMultipleTypes && (
        <div className="mt-4 flex flex-wrap gap-2">
          {listing.unitTypes.map((t, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedTypeIndex(idx)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                selectedTypeIndex === idx
                  ? 'border-navy bg-navy text-white'
                  : 'border-line bg-white text-ink/60'
              }`}
            >
              {t.name || `Tipe ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Tabel Spesifikasi */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-navy mb-3">Spesifikasi</h2>
        <dl className="divide-y divide-line rounded-2xl border border-line bg-white">
          {activeSpec.luasBangunan && activeSpec.luasTanah && (
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="flex items-center gap-2 text-sm text-ink/60">
                <span>📐</span> Luas Bangunan &amp; Tanah
              </dt>
              <dd className="text-sm font-medium text-ink">
                {activeSpec.luasBangunan}m² / {activeSpec.luasTanah}m²
              </dd>
            </div>
          )}
          {activeSpec.bedrooms && activeSpec.bathrooms && (
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="flex items-center gap-2 text-sm text-ink/60">
                <span>🛏️</span> Kamar Tidur &amp; Mandi
              </dt>
              <dd className="text-sm font-medium text-ink">
                {activeSpec.bedrooms} / {activeSpec.bathrooms}
              </dd>
            </div>
          )}
          {SPEC_ROWS.filter((row) => (row.key === 'electricity' ? activeSpec.electricity : listing[row.key])).map((row) => (
            <div key={row.key} className="flex items-center justify-between px-4 py-3">
              <dt className="flex items-center gap-2 text-sm text-ink/60">
                <span>{row.icon}</span> {row.label}
              </dt>
              <dd className="text-sm font-medium text-ink">
                {row.key === 'electricity' ? activeSpec.electricity : listing[row.key]}{row.suffix}
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
            <div className="relative">
              <p
                className={`whitespace-pre-line text-sm leading-relaxed text-ink/80 ${
                  !descExpanded && isDescLong ? 'max-h-[7.5rem] overflow-hidden' : ''
                }`}
              >
                {listing.description}
              </p>
              {!descExpanded && isDescLong && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
              )}
            </div>
            {isDescLong && (
              <button
                type="button"
                onClick={() => setDescExpanded((v) => !v)}
                className="mt-2 text-sm font-semibold text-forest hover:underline"
              >
                {descExpanded ? 'Sembunyikan' : 'Selengkapnya'}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Kontak Penjual */}
      <section className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
        {listing.perumahanName ? (
          // Listing dari Admin Perumahan: tampilkan Nama Perumahan (bukan
          // nama akun), centang biru otomatis, TIDAK bisa diklik.
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {listing.perumahanPhoto && (
              <img
                src={listing.perumahanPhoto}
                alt={listing.perumahanName}
                referrerPolicy="no-referrer"
                className="h-11 w-11 shrink-0 rounded-full object-cover"
              />
            )}
            <span className="flex min-w-0 flex-1 items-baseline gap-1.5 font-semibold text-ink">
              <span className="leading-tight">
                {listing.perumahanName}
                <span className="ml-1 inline-block align-middle">
                  <VerifiedBadge color="blue" />
                </span>
              </span>
            </span>
          </div>
        ) : (
          // Nama & foto SEMUA penjual (bukan cuma premium/admin) sekarang
          // bisa diklik untuk masuk ke halaman profil publiknya. Badge
          // centang tetap eksklusif buat admin (emas) & premium (biru).
          // Kalau pemiliknya sudah set username -> link ke /u/username
          // (lebih pendek). Kalau belum -> fallback ke /penjual/uid.
          <Link
            to={listing.ownerUsername ? `/u/${listing.ownerUsername}` : `/penjual/${listing.ownerUid}`}
            className="flex min-w-0 items-center gap-3 hover:opacity-80"
          >
            {listing.ownerPhoto && (
              <img
                src={listing.ownerPhoto}
                alt={listing.ownerName}
                referrerPolicy="no-referrer"
                className="h-11 w-11 shrink-0 rounded-full object-cover"
              />
            )}
            <span className="flex min-w-0 items-center gap-1 truncate font-semibold text-ink">
              <span className="truncate">{listing.ownerName}</span>
              {isOwnerVerified && <VerifiedBadge color={isOwnerAdmin ? 'gold' : 'blue'} />}
            </span>
          </Link>
        )}

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            onClick={() => d1Api.logEvent('whatsapp_click', { anon_id: getAnonId(), listing_id: listing.id })}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#064734] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#053a2a]"
          >
            <FaWhatsapp size={16} /> WhatsApp
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
