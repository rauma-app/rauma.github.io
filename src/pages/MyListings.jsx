import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { d1Api } from '../lib/d1Api';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../lib/admin';
import ImageSlider from '../components/ImageSlider';
import Pagination from '../components/Pagination';
import { formatMonthlyShort, formatRupiahShort } from '../lib/kpr';
import { FaEye } from 'react-icons/fa';

const STATUS_LABELS = {
  pending: { text: 'Menunggu Persetujuan', className: 'bg-amber-100 text-amber-700' },
  approved: { text: 'Tayang', className: 'bg-forest/10 text-forest' },
  rejected: { text: 'Ditolak', className: 'bg-red-100 text-red-600' },
  sold: { text: 'Terjual', className: 'bg-slate-200 text-slate-600' },
};

const MY_PAGE_SIZE = 8; // jumlah iklan per halaman

export default function MyListings() {
  const { user } = useAuth();

  // Badge status ("Menunggu Persetujuan" / "Tayang" dst) cuma berguna
  // buat user biasa & premium, karena iklan mereka DITINJAU dulu sebelum
  // tayang. Admin Perumahan & Admin utama iklannya auto-approve begitu
  // posting, jadi badge-nya cuma bakal langsung "Tayang" terus -- gak ada
  // gunanya ditampilin, malah bikin ramai gak perlu.
  const showStatusBadge = !isAdmin(user);

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Filter lokasi & nomor halaman disimpan di URL (?lokasi=...&hal=2) supaya
  // tombol Back dari halaman lain kembali ke tampilan yang sama.
  const [searchParams, setSearchParams] = useSearchParams();
  // Bentuk nilai: 'all' | 'kab::kota cimahi' | 'kec::coblong|kota bandung'.
  // ?kec= adalah format lama (tanpa awalan) -> dianggap filter kecamatan.
  const legacyKec = searchParams.get('kec');
  const locParam = searchParams.get('lokasi') || (legacyKec ? `kec::${legacyKec}` : 'all');
  const sortBy = searchParams.get('urut') === 'dilihat' ? 'views' : 'newest'; // 'newest' | 'views'
  const rawPage = parseInt(searchParams.get('hal') || '1', 10);
  const pageParam = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const gridRef = useRef(null);

  function updateParams(changes, replace) {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([k, v]) => {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    });
    setSearchParams(next, { replace });
  }
  // Ganti filter -> kembali ke halaman 1 (tanpa menambah riwayat Back)
  const setLocFilter = (v) => updateParams({ lokasi: v === 'all' ? null : v, kec: null, hal: null }, true);
  const setSortBy = (v) => updateParams({ urut: v === 'views' ? 'dilihat' : null, hal: null }, true);
  function goToPage(n) {
    updateParams({ hal: n <= 1 ? null : String(n) }, false);
    requestAnimationFrame(() => {
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Menu "Hapus" versi lengkap (Sudah Terjual / Hapus Saja) berlaku buat
  // SEMUA user -- supaya dashboard statistik Admin (nilai properti terjual)
  // ngitung transaksi dari SEMUA orang, bukan cuma premium/admin. Yang
  // TETAP dibatasi cuma tampilan "unit terjual" di halaman profil publik
  // (itu logikanya ada di SellerProfile.jsx, cuma premium/admin yang punya
  // halaman profil).
  const canTrackSold = true;

  // activeListing = listing yang sedang dibuka menu Hapus-nya.
  // step: 'menu' (pilih Sudah Terjual / Hapus Saja) atau 'qty' (isi jumlah unit, khusus perumahan)
  const [activeListing, setActiveListing] = useState(null);
  const [step, setStep] = useState('menu');
  const [soldQty, setSoldQty] = useState('1');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      // status: 'all' -> tampilkan punya sendiri apapun statusnya (pending/approved/rejected/sold)
      const data = await d1Api.getListings({ owner: user.uid, status: 'all' });
      setListings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function closeMenu() {
    setActiveListing(null);
    setStep('menu');
    setSoldQty('1');
  }

  async function handleDeleteOnly(id) {
    setDeletingId(id);
    try {
      await d1Api.deleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus iklan. Coba lagi ya.');
    } finally {
      setDeletingId(null);
      closeMenu();
    }
  }

  // Untuk user biasa (bukan premium/admin): tombol Hapus langsung konfirmasi,
  // tanpa opsi "Sudah Terjual" -- perilaku sama seperti sebelumnya.
  async function handleSimpleDelete(id) {
    const confirmed = window.confirm('Yakin mau hapus iklan ini? Tindakan ini tidak bisa dibatalkan.');
    if (!confirmed) return;
    handleDeleteOnly(id);
  }

  function getUnitTersedia(listing) {
    const n = Number(listing.unitTersedia);
    return Number.isFinite(n) ? n : null;
  }

  function isMultiUnit(listing) {
    const n = getUnitTersedia(listing);
    return n !== null && n > 1;
  }

  function openSoldFlow(listing) {
    if (isMultiUnit(listing)) {
      setSoldQty('1');
      setStep('qty');
    } else {
      handleMarkSold(listing, 1);
    }
  }

  async function handleMarkSold(listing, amount) {
    setProcessingId(listing.id);
    try {
      const res = await d1Api.markListingSold(listing.id, amount);
      setListings((prev) =>
        prev.map((l) =>
          l.id === listing.id
            ? {
                ...l,
                status: res.newStatus || l.status,
                unitTersedia: res.newUnitTersedia != null ? res.newUnitTersedia : l.unitTersedia,
              }
            : l
        )
      );
    } catch (err) {
      console.error(err);
      alert('Gagal menandai terjual. Coba lagi ya.');
    } finally {
      setProcessingId(null);
      closeMenu();
    }
  }

  // Pilihan lokasi dari iklan milik sendiri (semua status), lengkap dengan jumlahnya:
  //  - Kota / Kabupaten: iklan lama yang tidak punya kecamatan tetap tercakup
  //    (memakai field `location` kalau `kabupaten` kosong, sama seperti di kartu iklan).
  //  - Kecamatan: nama kota/kabupaten ikut ditulis karena nama kecamatan yang sama
  //    bisa ada di tempat berbeda.
  // Diurut abjad supaya gampang dicari: "sudah pernah upload rumah di sini belum?".
  const locationOptions = useMemo(() => {
    const clean = (v) => String(v || '').trim().replace(/\s+/g, ' ');
    const kabMap = new Map();
    const kecMap = new Map();
    for (const l of listings) {
      const kab = clean(l.kabupaten || l.location);
      const kec = clean(l.kecamatan);
      if (kab) {
        const k = kab.toLowerCase();
        const cur = kabMap.get(k) || { value: `kab::${k}`, label: kab, count: 0 };
        cur.count += 1;
        kabMap.set(k, cur);
      }
      if (kec) {
        const k = `${kec.toLowerCase()}|${kab.toLowerCase()}`;
        const cur = kecMap.get(k) || { value: `kec::${k}`, label: kab ? `${kec}, ${kab}` : kec, count: 0 };
        cur.count += 1;
        kecMap.set(k, cur);
      }
    }
    const byLabel = (a, b) => a.label.localeCompare(b.label, 'id');
    return { kabupaten: [...kabMap.values()].sort(byLabel), kecamatan: [...kecMap.values()].sort(byLabel) };
  }, [listings]);

  // Nilai ?lokasi= di URL yang pilihannya sudah tidak ada dianggap "semua"
  const locFilter =
    locParam === 'all' ||
    locationOptions.kabupaten.some((o) => o.value === locParam) ||
    locationOptions.kecamatan.some((o) => o.value === locParam)
      ? locParam
      : 'all';

  const filteredListings = useMemo(() => {
    if (locFilter === 'all') return listings;
    const norm = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
    if (locFilter.startsWith('kab::')) {
      const target = locFilter.slice(5);
      return listings.filter((l) => norm(l.kabupaten || l.location) === target);
    }
    const [kec, kab] = locFilter.slice(5).split('|');
    return listings.filter((l) => norm(l.kecamatan) === kec && norm(l.kabupaten || l.location) === (kab || ''));
  }, [listings, locFilter]);

  // Urutan: "Terbaru" = urutan dari server; "Paling banyak dilihat" = viewCount
  // terbesar dulu (yang jumlahnya sama tetap berurutan terbaru, karena sort stabil).
  const sortedListings = useMemo(() => {
    if (sortBy !== 'views') return filteredListings;
    return [...filteredListings].sort((a, b) => (Number(b.viewCount) || 0) - (Number(a.viewCount) || 0));
  }, [filteredListings, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedListings.length / MY_PAGE_SIZE));
  const currentPage = Math.min(pageParam, totalPages);
  const pageListings = sortedListings.slice((currentPage - 1) * MY_PAGE_SIZE, currentPage * MY_PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-navy">Iklan Saya</h1>

      {loading && <p className="mt-6 text-sm text-ink/50">Memuat...</p>}

      {!loading && listings.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-ink/60">Kamu belum punya iklan.</p>
        </div>
      )}

      {/* Urutan: terbaru / paling banyak dilihat (jumlah dilihat hanya terlihat di sini) */}
      {listings.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Urutkan iklan">
          {[
            { key: 'newest', label: 'Terbaru' },
            { key: 'views', label: 'Paling banyak dilihat' },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSortBy(opt.key)}
              aria-pressed={sortBy === opt.key}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                sortBy === opt.key ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Filter lokasi (kota/kabupaten & kecamatan): bantu cek apakah rumah yang mau diunggah sudah ada */}
      {(locationOptions.kabupaten.length > 0 || locationOptions.kecamatan.length > 0) && listings.length > 1 && (
        <div className="mt-3 sm:max-w-xs">
          <select
            value={locFilter}
            onChange={(e) => setLocFilter(e.target.value)}
            aria-label="Filter lokasi"
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none"
          >
            <option value="all">Semua lokasi ({listings.length})</option>
            {locationOptions.kabupaten.length > 0 && (
              <optgroup label="Kota / Kabupaten">
                {locationOptions.kabupaten.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} ({o.count})
                  </option>
                ))}
              </optgroup>
            )}
            {locationOptions.kecamatan.length > 0 && (
              <optgroup label="Kecamatan">
                {locationOptions.kecamatan.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} ({o.count})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

      <div ref={gridRef} className="mt-6 grid scroll-mt-28 grid-cols-2 gap-4 sm:grid-cols-4">
        {pageListings.map((listing) => {
          const statusInfo = STATUS_LABELS[listing.status] || STATUS_LABELS.pending;
          const isSold = listing.status === 'sold';
          return (
            <div key={listing.id} className="overflow-hidden rounded-2xl border border-line bg-paper">
              <Link
                to={`/id/${listing.id}`}
                className="relative block"
              >
                <ImageSlider images={listing.images} alt={listing.kecamatan} rounded="rounded-none" />
                <div className="absolute left-2 top-2 z-20 flex items-center gap-1">
                  {showStatusBadge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${statusInfo.className}`}
                    >
                      {statusInfo.text}
                    </span>
                  )}
                  {/* Jumlah dilihat -- PRIVAT, cuma keliatan di sini
                      (halaman "Listing Saya"), gak ditampilin ke publik. */}
                  <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                    <FaEye size={9} /> {listing.viewCount || 0}
                  </span>
                </div>
              </Link>
              <div className="p-3 sm:p-4">
                <Link
                  to={`/id/${listing.id}`}
                  className="block"
                >
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="font-display text-base font-semibold text-navy sm:text-xl">
                      {formatRupiahShort(listing.price)}
                    </span>
                    {listing.cicilanPerBulan ? (
                      <span className="text-xs text-ink/50 sm:text-sm">· {formatMonthlyShort(listing.cicilanPerBulan)}</span>
                    ) : null}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-ink/60 sm:text-sm">
                    <span aria-hidden>📍</span>
                    <span className="line-clamp-1">
                      {listing.kecamatan ? `${listing.kecamatan} - ` : ''}
                      {listing.kabupaten}
                    </span>
                  </div>
                </Link>

                {isSold ? (
                  // Riwayat -- sudah terjual, cuma sisa opsi hapus dari riwayat.
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteOnly(listing.id)}
                      disabled={deletingId === listing.id}
                      className="w-full rounded-full border border-line py-1.5 text-center text-xs font-semibold text-ink/50 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                    >
                      {deletingId === listing.id ? 'Menghapus...' : 'Hapus dari riwayat'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Link
                      to={`/posting/${listing.id}`}
                      className="flex-1 rounded-full border border-line py-1.5 text-center text-xs font-semibold text-ink hover:border-forest hover:text-forest"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        canTrackSold ? setActiveListing(listing) : handleSimpleDelete(listing.id)
                      }
                      disabled={deletingId === listing.id || processingId === listing.id}
                      className="flex-1 rounded-full border border-red-200 py-1.5 text-center text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === listing.id ? 'Menghapus...' : 'Hapus'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Pagination page={currentPage} totalPages={totalPages} onChange={goToPage} />

      {/* Popup "Hapus" khusus premium/admin: pilih Sudah Terjual atau Hapus Saja */}
      {activeListing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={closeMenu}>
          <div
            className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {step === 'menu' && (
              <>
                <h3 className="font-display text-lg font-semibold text-navy">Hapus Iklan</h3>
                <p className="mt-1 text-sm text-ink/50">Rumah ini kenapa mau dihapus?</p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => openSoldFlow(activeListing)}
                    disabled={processingId === activeListing.id}
                    className="rounded-full bg-forest py-2.5 text-sm font-semibold text-white hover:bg-forest/90 disabled:opacity-50"
                  >
                    {processingId === activeListing.id ? 'Menyimpan...' : 'Sudah Terjual'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const confirmed = window.confirm('Yakin mau hapus iklan ini tanpa dicatat sebagai terjual?');
                      if (confirmed) handleDeleteOnly(activeListing.id);
                    }}
                    disabled={deletingId === activeListing.id}
                    className="rounded-full border border-red-200 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === activeListing.id ? 'Menghapus...' : 'Hapus Saja'}
                  </button>
                  <button type="button" onClick={closeMenu} className="py-2.5 text-sm text-ink/50">
                    Batal
                  </button>
                </div>
              </>
            )}

            {step === 'qty' && (
              <>
                <h3 className="font-display text-lg font-semibold text-navy">Berapa Unit yang Terjual?</h3>
                <p className="mt-1 text-sm text-ink/50">
                  Sisa unit saat ini: {getUnitTersedia(activeListing)}. Iklan akan tetap tayang selama masih ada sisa unit.
                </p>
                <input
                  type="number"
                  min={1}
                  max={getUnitTersedia(activeListing)}
                  value={soldQty}
                  onChange={(e) => setSoldQty(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm"
                />
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const max = getUnitTersedia(activeListing) || 1;
                      const qty = Math.min(Math.max(Math.floor(Number(soldQty) || 1), 1), max);
                      handleMarkSold(activeListing, qty);
                    }}
                    disabled={processingId === activeListing.id}
                    className="rounded-full bg-forest py-2.5 text-sm font-semibold text-white hover:bg-forest/90 disabled:opacity-50"
                  >
                    {processingId === activeListing.id ? 'Menyimpan...' : 'Tandai Terjual'}
                  </button>
                  <button type="button" onClick={closeMenu} className="py-2.5 text-sm text-ink/50">
                    Batal
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
