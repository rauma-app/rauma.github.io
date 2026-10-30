import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { slugifyTitle } from '../lib/slugify';
import { cleanOverview, overviewLabel, normalizeAir } from '../lib/overview';
import { d1Api } from '../lib/d1Api';
import ImageSlider from '../components/ImageSlider';
import ListingCard from '../components/ListingCard';
import Seo from '../components/Seo';
import VerifiedBadge from '../components/VerifiedBadge';
import SaveButton from '../components/SaveButton';
import ShareButton from '../components/ShareButton';
import { ADMIN_UIDS } from '../lib/admin';
import { usePremium } from '../context/PremiumContext';
import { useAuth } from '../context/AuthContext';
import { getAnonId } from '../lib/anon';
import { formatRupiah, formatRupiahShort, formatMonthlyShort } from '../lib/kpr';
import { FaChevronDown, FaChevronUp, FaWhatsapp, FaRulerCombined, FaVectorSquare, FaBed, FaBath, FaBolt, FaTint, FaFileContract, FaCity, FaVideo } from 'react-icons/fa';

// Baris sisa spesifikasi (Luas & Kamar sudah digabung terpisah, lihat di bawah).
// Icon plain (text-ink, ngikutin warna teks biasa) -- bukan emoji lagi,
// biar tampilannya konsisten & otomatis kebalik jadi putih kalau HP/
// browser orang lagi mode gelap (sama kayak teks lain di halaman ini).
const SPEC_ROWS = [
  // Sertifikat, listrik, dan air dipindah ke kartu Overview (lihat overviewChips).
  { key: 'unitTersedia', label: 'Unit Tersedia', Icon: FaCity, suffix: ' unit' },
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

// Jumlah kamar di halaman iklan. Disimpan sebagai TOTAL (mis. 5) + jumlah
// kamar tambahan (mis. 1) -> ditampilkan "4+1" tanpa keterangan tambahan.
// Tanpa kamar tambahan tampil angka biasa. (Kartu iklan tetap menampilkan
// total supaya ringkas.)
function formatRooms(total, extra) {
  const t = Number(total) || 0;
  const e = Math.min(Math.max(Number(extra) || 0, 0), t);
  if (!e) return String(total);
  return `${t - e}+${e}`;
}

// Baris Spesifikasi: label di kiri (abu), lalu ": nilai" mulai di titik
// yang SAMA di setiap baris (kolom label lebar tetap), dipisah garis tipis.
// Tanpa icon & tanpa kartu. `Icon` masih diterima di props supaya pemanggil
// lama tidak perlu diubah, tapi sengaja tidak ditampilkan.
// Kolom label: 9.5rem di HP, 11rem di layar sedang ke atas -- jadi di
// desktop pun titik dua tetap rapi sejajar & dekat dengan labelnya.
// eslint-disable-next-line no-unused-vars
function SpecCard({ Icon, label, value }) {
  return (
    <div className="grid grid-cols-[9.5rem_1fr] items-baseline gap-x-2 border-b border-line py-3 md:grid-cols-[11rem_1fr]">
      <span className="text-sm text-ink/60">{label}</span>
      <span className="flex gap-2 text-base font-medium text-ink">
        <span aria-hidden="true">:</span>
        <span className="min-w-0">{value}</span>
      </span>
    </div>
  );
}

export default function Listing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { premiumMap } = usePremium();
  const { user } = useAuth();
  const [related, setRelated] = useState([]);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false); // tertutup di awal
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);

  // Rapihin URL di address bar biar selalu ikut judul TERBARU -- link lama
  // tanpa slug, atau slug basi (judul pernah diubah setelah link dibagikan),
  // otomatis "didandanin" ke URL kanonik. Pakai replace (bukan push) biar
  // gak nambah entry baru di tombol back, dan ini bukan navigasi/reload --
  // cuma ganti teks di address bar.
  //
  // PENTING: hook ini harus dipanggil SELALU di posisi yang sama tiap
  // render (makanya ditaruh di sini, di atas, sebelum return bersyarat
  // apapun kayak "if (loading) return ..." di bawah) -- kalau sebuah hook
  // cuma kepanggil pas kondisi tertentu, React bakal error "Rendered more
  // hooks than during the previous render" (React error #310). `listing`
  // masih bisa null pas efek ini pertama kali jalan (data belum ke-load),
  // makanya logic-nya di-guard di DALAM body-nya, bukan dengan skip
  // manggil hook-nya.
  useEffect(() => {
    if (!listing) return;
    // JANGAN rapihin URL kalau data yang tampil BUKAN milik URL saat ini.
    // Pas user klik kartu "Rumah Lain", URL sudah berubah ke listing B
    // tapi `listing` di state masih listing A (sengaja dipertahankan biar
    // gak jedag-jedug). Tanpa guard ini, efek di bawah menganggap URL
    // "salah" lalu navigate() balik ke listing A -- itu penyebab klik
    // iklan lain cuma scroll ke atas dan tetap di iklan yang sama.
    if (loading) return;
    const titleSlug = slugifyTitle(listing.title);
    const canonical = titleSlug ? `/id/${listing.id}/${titleSlug}` : `/id/${listing.id}`;
    if (!id || String(listing.id) !== String(id)) return;
    if (window.location.pathname !== canonical) {
      // window.history.replaceState (bukan navigate) supaya cuma ganti
      // teks di address bar: gak memicu render ulang router & gak
      // memicu ScrollToTop lagi.
      window.history.replaceState(window.history.state, '', canonical + window.location.search + window.location.hash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing, loading, id]);

  useEffect(() => {
    // Penanda "request ini masih berlaku?" -- kepake di bawah buat nolak
    // hasil fetch yang telat nyampe SETELAH user udah pindah ke listing
    // lain (misal klik cepat 2 listing berturut-turut, request pertama
    // belum tentu selesai duluan). Tanpa ini, data listing LAMA yang baru
    // nyampe belakangan bisa nimpa listing BARU yang lagi ditampilkan --
    // itu penyebab sebenarnya dari bug "kadang gagal pindah listing".
    let cancelled = false;

    async function load() {
      setLoading(true);
      setSelectedTypeIndex(0);
      setDescExpanded(false);
      try {
        const data = await d1Api.getListingById(id);
        if (cancelled) return; // request ini sudah basi, abaikan hasilnya
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

          // Catat "dilihat" -- KECUALI kalau yang buka adalah pemilik
          // iklan itu sendiri (biar angkanya jujur, gak numpuk gara-gara
          // pemilik bolak-balik ngecek/ngedit iklannya sendiri).
          const ownerUid = data.ownerUid || data.seller_uid || '';
          if (!user || user.uid !== ownerUid) {
            d1Api.recordListingView(data.id);
          }
        } else if (!cancelled) {
          setNotFound(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Gagal mengambil data listing:', err);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!listing?.id || !(listing.kabupaten || listing.location)) {
      setRelated([]);
      return;
    }
    let cancelled = false;

    // Urutan & filter (se-kabupaten, harga mirip) dikerjakan di server.
    d1Api.getRelatedListings(listing.id, 4).then((items) => {
      if (!cancelled) setRelated(items);
    });

    return () => {
      cancelled = true;
    };
  }, [listing?.id]);

  // PENTING: cuma tampilkan kotak "Memuat..." penuh kalau BENER-BENER
  // belum ada data sama sekali (pembukaan pertama kali). Kalau user
  // sedang pindah dari satu listing ke listing lain (misal klik kartu
  // "Rumah Lain di [Kota]"), `listing` di sini masih berisi data listing
  // yang LAMA selama data yang baru masih di-fetch -- jadi JANGAN
  // dibuang/diganti kotak kecil itu, biarkan halaman lama tetap utuh
  // kelihatan sampai data baru siap. Sebelumnya `if (loading)` di sini
  // sendirian bikin SELURUH halaman collapse jadi kotak kecil tiap kali
  // pindah listing -- gabungan sama ScrollToTop yang paksa lompat ke
  // atas di saat bersamaan, itu yang kerasa "jedag-jedug" pas klik
  // listing lain secara beruntun.
  if (loading && !listing) {
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
  // Overview: hanya key yang dikenal, urut sesuai daftar
  const overviewKeys = cleanOverview(listing.overview);

  // Pecah deskripsi jadi paragraf (dipisah baris kosong) supaya jarak antar
  // paragraf konsisten & rapi. ISI TEKS TIDAK DIUBAH; baris tunggal di dalam
  // paragraf (mis. "Tipe 7x12 / Mulai dari 1.6M") tetap utuh.
  const descParagraphs = (listing.description || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean);
  // Paragraf pertama yang pendek & tidak diakhiri tanda baca = judul/pembuka
  // -> ditampilkan lebih besar dengan font serif.
  const descHasHeadline =
    descParagraphs.length > 1 &&
    descParagraphs[0].length <= 100 &&
    !/[.!?:]$/.test(descParagraphs[0]);
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
    bedroomsExtra: activeType ? activeType.bedroomsExtra : listing.bedroomsExtra,
    bathroomsExtra: activeType ? activeType.bathroomsExtra : listing.bathroomsExtra,
    electricity: activeType ? activeType.electricity : listing.electricity,
  };

  // Isi kartu Overview, urut: sertifikat, listrik (ikut tipe unit yang dipilih),
  // air, lebar muka, bangunan tahun, lalu pilihan centang penjual.
  // Teks polos tanpa awalan (mis. "SHM", "1300 VA", "Jet Pump").
  const lebarMukaNum = Number(listing.lebarMuka);
  const tahunNum = Number(listing.tahunBangun);
  const overviewChips = [
    listing.sertifikat,
    activeSpec.electricity,
    normalizeAir(listing.air),
    lebarMukaNum > 0 ? `Lebar Muka ${String(lebarMukaNum).replace('.', ',')}` : null,
    tahunNum > 0 ? `Bangunan ${tahunNum}` : null,
    ...overviewKeys.map((key) => overviewLabel(key)),
  ].filter(Boolean);
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

  // Listing non-perumahan sekarang bisa punya judul sendiri dari user
  // (field "Judul Listing" di form posting) -- kalau ada, itu yang dipakai
  // buat judul di Google/WhatsApp, karena itu yang paling deskriptif &
  // paling mewakili listing ini (lebih baik dari judul generik "Rumah
  // Dijual di ..."). Listing lama yang titlenya masih hasil auto-generate
  // ("Rumah di Cikalongwetan") tetap kebaca wajar juga kalau dipakai di sini.
  const seoTitle = listing.perumahanName
    ? `${listing.perumahanName} - Rumah Dijual di ${lokasiText}`
    : listing.title
      ? `${listing.title} - ${formattedPriceShort}`
      : `Rumah Dijual di ${lokasiText} - ${formattedPriceShort}`;

  // Judul untuk <title> (hasil Google & tab browser): polos, TANPA harga dan
  // TANPA nama situs. Harus sama dengan `pageTitle` di cloudflare-worker.
  const pageTitle = listing.perumahanName
    ? `${listing.perumahanName} - Rumah Dijual di ${lokasiText}`
    : listing.title || `Rumah Dijual di ${lokasiText}`;

  const seoDescription = listing.perumahanName
    ? `${listing.perumahanName} - hunian di ${lokasiText} mulai ${formattedPriceShort}.${
        daftarTipe ? ` Tersedia tipe ${daftarTipe}.` : ''
      } Lihat detail lengkap & hubungi penjual di Rauma.`
    : `${listing.title ? `${listing.title}. ` : ''}Rumah dijual di ${lokasiText} harga ${formattedPriceFull}. Lihat detail & hubungi penjual di Rauma.`;

  const adminList = Array.isArray(ADMIN_UIDS) ? ADMIN_UIDS : [];
  const isOwnerAdmin = adminList.includes(listing.ownerUid);
  const isOwnerPremium = Boolean(listing.ownerUid && premiumMap && premiumMap[listing.ownerUid] !== undefined);
  const isOwnerVerified = isOwnerAdmin || isOwnerPremium;

  const titleSlug = slugifyTitle(listing.title);
  const canonicalPath = titleSlug ? `/id/${listing.id}/${titleSlug}` : `/id/${listing.id}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Garis loading tipis di paling atas layar -- muncul SELAMA data
          listing baru masih diambil (misal abis klik kartu "Rumah Lain").
          Konten listing LAMA sengaja tetap ditampilkan di bawahnya (gak
          di-collapse) biar gak kasar/jedag-jedug, tapi garis ini yang
          kasih tahu "lagi proses pindah ke listing lain", biar gak
          kelihatan kayak macet/gagal padahal cuma masih loading. */}
      {loading && (
        <div className="fixed inset-x-0 top-0 z-40 h-1 animate-pulse bg-forest" />
      )}

      {Seo && (
        <Seo
          title={seoTitle}
          pageTitle={pageTitle}
          description={seoDescription}
          path={canonicalPath}
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
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
          <ShareButton
            title={listing.perumahanName || listing.title}
            text={`${listing.perumahanName || listing.title} - ${formattedPriceShort}`}
          />
          <SaveButton listingId={listing.id} />
        </div>
      </div>

      {/* Informasi Utama */}
      <div className="mt-6">
        {hasMultipleTypes && activeType?.name && (
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">{activeType.name}</p>
        )}
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="text-3xl font-bold text-navy">{formattedPriceShort}</p>
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
        {/* Judul listing (manual dari user, atau auto-generate kalau
            dikosongin pas posting) -- sengaja ditaruh di bawah harga &
            lokasi, bukan di atas, biar harga tetap jadi fokus utama mata
            begitu halaman dibuka. */}
        {listing.title && !listing.perumahanName && (
          <h1 className="mt-2 text-lg font-semibold text-navy">{listing.title}</h1>
        )}
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

      {/* Tabel Spesifikasi -- grid kartu kecil (icon + label + value),
          gaya minimalis kayak Rumah123/99.co. Tiap kartu berdiri sendiri
          (bukan list panjang ke bawah), lebih cepat discan mata. */}
      <section className="mt-8">
        <h2 className="section-rule text-xl font-semibold text-navy">Spesifikasi</h2>
        {/* 1 kolom di semua ukuran layar; lebar kolom label diatur di SpecCard. */}
        <div>
          {activeSpec.luasTanah && (
            <SpecCard Icon={FaVectorSquare} label="Luas Tanah" value={`${activeSpec.luasTanah}m²`} />
          )}
          {activeSpec.luasBangunan && (
            <SpecCard Icon={FaRulerCombined} label="Luas Bangunan" value={`${activeSpec.luasBangunan}m²`} />
          )}
          {activeSpec.bedrooms && (
            <SpecCard Icon={FaBed} label="Kamar Tidur" value={formatRooms(activeSpec.bedrooms, activeSpec.bedroomsExtra)} />
          )}
          {activeSpec.bathrooms && (
            <SpecCard Icon={FaBath} label="Kamar Mandi" value={formatRooms(activeSpec.bathrooms, activeSpec.bathroomsExtra)} />
          )}
          {SPEC_ROWS.filter((row) => listing[row.key]).map((row) => (
            <SpecCard key={row.key} Icon={row.Icon} label={row.label} value={`${listing[row.key]}${row.suffix}`} />
          ))}
        </div>

        {listing.videoUrl && (
          <a
            href={listing.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-forest hover:bg-cream"
          >
            <FaVideo className="text-ink" /> Lihat Video Properti
          </a>
        )}
      </section>

      {/* Overview (hanya tampil kalau penjual mencentang sesuatu). Tertutup di
          awal; polos tanpa kotak putih, tiap label punya latar navy tipis. */}
      {overviewChips.length > 0 && (
        <section className="mt-4">
          <button
            type="button"
            onClick={() => setOverviewOpen((o) => !o)}
            aria-expanded={overviewOpen}
            className="flex w-full items-center justify-between border-b border-line py-3.5 text-left"
          >
            <span className="text-base font-semibold text-navy">Overview</span>
            {overviewOpen ? (
              <FaChevronUp className="text-ink/50" size={14} />
            ) : (
              <FaChevronDown className="text-ink/50" size={14} />
            )}
          </button>
          {overviewOpen && (
            <div className="flex flex-wrap gap-2 pt-4">
              {overviewChips.map((text, i) => (
                <span
                  key={`${text}-${i}`}
                  className="rounded-full bg-navy/10 px-3.5 py-1.5 text-sm font-medium text-navy"
                >
                  {text}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Material Bangunan (opsional, hanya tampil kalau ada isinya) */}
      {MATERIAL_ROWS.some((row) => listing[row.key]) && (
        <section className="mt-4">
          <div className="rounded-2xl border border-line bg-white">
            <button
              type="button"
              onClick={() => setMaterialOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left"
            >
              <span className="text-base font-semibold text-navy">Material</span>
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

      {/* Deskripsi -- gaya editorial: tanpa kotak, huruf lega, pembuka serif */}
      {listing.description && (
        <section className="mt-10">
          <h2 className="section-rule text-xl font-semibold text-navy">Deskripsi</h2>
          <div className="relative sm:max-w-[68ch]">
            <div
              className={`space-y-5 text-[15px] leading-[1.85] text-ink/85 sm:text-base sm:leading-[1.9] ${
                !descExpanded && isDescLong ? 'max-h-[14rem] overflow-hidden' : ''
              }`}
            >
              {descParagraphs.map((para, i) =>
                i === 0 && descHasHeadline ? (
                  <p
                    key={i}
                    className="font-display text-lg font-medium leading-snug text-navy sm:text-xl"
                  >
                    {para}
                  </p>
                ) : (
                  <p key={i} className="whitespace-pre-line">
                    {para}
                  </p>
                )
              )}
            </div>
            {!descExpanded && isDescLong && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cream via-cream/90 to-transparent" />
            )}
          </div>
          {isDescLong && (
            <button
              type="button"
              onClick={() => setDescExpanded((v) => !v)}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-navy/25 px-5 py-2 text-sm font-semibold text-navy transition hover:bg-navy hover:text-white"
            >
              {descExpanded ? 'Sembunyikan' : 'Selengkapnya'}
              {descExpanded ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
            </button>
          )}
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
            {/* Nama + centang dalam satu baris flex: centang tidak akan turun ke
                baris baru walau browser dalam aplikasi (Threads/Instagram) merender
                teks sedikit lebih lebar; yang mengalah adalah nama (turun baris). */}
            <span className="flex min-w-0 flex-1 items-center gap-1.5 font-semibold text-ink">
              <span className="min-w-0 leading-tight">{listing.perumahanName}</span>
              <VerifiedBadge color="blue" />
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
            className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
          >
            {listing.ownerPhoto && (
              <img
                src={listing.ownerPhoto}
                alt={listing.ownerName}
                referrerPolicy="no-referrer"
                className="h-11 w-11 shrink-0 rounded-full object-cover"
              />
            )}
            <span className="flex min-w-0 flex-1 items-center gap-1.5 font-semibold text-ink">
              <span className="min-w-0 leading-tight">{listing.ownerName}</span>
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
          <h2 className="text-xl font-semibold text-navy mb-3">
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
