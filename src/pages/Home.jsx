import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
// Impor API Helper D1
import { d1Api } from '../lib/d1Api';

import ListingCard from '../components/ListingCard';
import Pagination from '../components/Pagination';
import { slugifySearch } from '../lib/searchParser';
import Seo from '../components/Seo';

import iconTermurah from '../assets/icons/termurah.svg';
import iconTermahal from '../assets/icons/termahal.svg';
import iconSubsidi from '../assets/icons/rumah_subsidi.svg';
import iconCariProperti from '../assets/icons/jual_cepat.svg';
import iconTakeOverKPR from '../assets/icons/kpr_syariah.svg';
import iconKalkulatorKPR from '../assets/icons/nabung.svg';

const CATEGORY_SHORTCUTS = [
  { icon: iconTermurah, label: 'Pasti Pas', to: '/termurah' },
  { icon: iconTermahal, label: 'HNWI', to: '/termahal' },
  { icon: iconSubsidi, label: 'Rumah Subsidi', to: '/subsidi' },
  { icon: iconCariProperti, label: 'Carikan Properti', to: '/carikan-properti' },
  { icon: iconTakeOverKPR, label: 'Take Over KPR', to: '/take-over-kpr' },
  { icon: iconKalkulatorKPR, label: 'Kalkulator KPR', to: '/kalkulator-kpr' },
];

const PRIBADI_PAGE_SIZE = 8;
const PERUMAHAN_ROW_LIMIT = 8;

// Ditampilkan kalau daftar GAGAL dimuat (beda dari "memang belum ada iklan"),
// biar pengunjung tidak mengira situs kosong.
function LoadErrorNotice({ message, onRetry }) {
  return (
    <div className="mt-4 rounded-2xl border border-line bg-white p-4">
      <p className="text-sm font-medium text-ink/80">Iklan belum berhasil dimuat.</p>
      <p className="mt-1 text-xs text-ink/40">
        Cek koneksi internet, lalu coba lagi. Kalau dibuka dari Instagram, coba buka lewat Chrome.
      </p>
      <p className="mt-1 break-words text-[11px] text-ink/30">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white"
      >
        Coba lagi
      </button>
    </div>
  );
}

// Rapikan 1 iklan dari D1 supaya aman dipakai ListingCard
function normalizeHome(item) {
  let parsedImages = [];
  try {
    if (typeof item.images === 'string') {
      parsedImages = JSON.parse(item.images);
    } else if (Array.isArray(item.images)) {
      parsedImages = item.images;
    }
  } catch (e) {
    parsedImages = [];
  }
  return {
    ...item,
    images: parsedImages,
    imageUrls: parsedImages,
    coverImage: parsedImages[0] || item.coverImage || '/placeholder.jpg',
    price: Number(item.price) || 0,
  };
}

// Browser dalam aplikasi (Instagram, dll.) kadang gagal di percobaan
// pertama -> coba sekali lagi sebelum menyerah.
async function withRetry(fn) {
  try {
    return await fn();
  } catch (firstErr) {
    await new Promise((r) => setTimeout(r, 1200));
    return fn();
  }
}

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  // ---- Perumahan: deretan mendatar, "Lihat lainnya" di ujung ----
  const [perumahan, setPerumahan] = useState([]);
  const [hasMorePerumahan, setHasMorePerumahan] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [perumahanLoading, setPerumahanLoading] = useState(true);
  const [perumahanError, setPerumahanError] = useState('');

  // ---- Rumah Pribadi: grid dengan nomor halaman. Nomor halaman disimpan di
  // URL (?hal=2) supaya tombol Back dari halaman iklan kembali ke halaman
  // yang sama. ----
  const rawPage = parseInt(searchParams.get('hal') || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const [pribadi, setPribadi] = useState([]);
  const [pribadiTotal, setPribadiTotal] = useState(null); // null = belum diketahui
  const pribadiTotalRef = useRef(null);
  const [pribadiLoading, setPribadiLoading] = useState(true);
  const [pribadiError, setPribadiError] = useState('');
  const pribadiSectionRef = useRef(null);
  const shouldScrollRef = useRef(false);

  const loadPerumahan = useCallback(async () => {
    setPerumahanLoading(true);
    setPerumahanError('');
    try {
      const raw = await withRetry(() =>
        d1Api.getListings({ type: 'perumahan', limit: PERUMAHAN_ROW_LIMIT + 1, throwOnError: true })
      );
      const data = (raw || []).map(normalizeHome);
      setPerumahan(data.slice(0, PERUMAHAN_ROW_LIMIT));
      setHasMorePerumahan(data.length > PERUMAHAN_ROW_LIMIT);
    } catch (err) {
      console.error('Gagal memuat perumahan:', err);
      setPerumahanError(err?.message || 'Koneksi bermasalah');
    } finally {
      setPerumahanLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPerumahan();
  }, [loadPerumahan]);

  const loadPribadi = useCallback(async (p) => {
    setPribadiLoading(true);
    setPribadiError('');
    try {
      // Total dihitung sekali saja (di-cache server 5 menit)
      const [raw, total] = await withRetry(() =>
        Promise.all([
          d1Api.getListings({
            type: 'pribadi',
            limit: PRIBADI_PAGE_SIZE,
            offset: (p - 1) * PRIBADI_PAGE_SIZE,
            throwOnError: true,
          }),
          pribadiTotalRef.current === null
            ? d1Api.getListingsCount({ type: 'pribadi' })
            : Promise.resolve(pribadiTotalRef.current),
        ])
      );
      if (total !== null) {
        pribadiTotalRef.current = total;
        setPribadiTotal(total);
      }
      setPribadi((raw || []).map(normalizeHome));
    } catch (err) {
      console.error('Gagal memuat rumah pribadi:', err);
      setPribadiError(err?.message || 'Koneksi bermasalah');
    } finally {
      setPribadiLoading(false);
      if (shouldScrollRef.current) {
        shouldScrollRef.current = false;
        requestAnimationFrame(() => {
          pribadiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    }
  }, []);

  useEffect(() => {
    loadPribadi(page);
  }, [page, loadPribadi]);

  // Jumlah halaman: dari total kalau diketahui; kalau hitungan gagal, perkirakan
  // dari isi halaman ini (penuh -> kemungkinan masih ada halaman berikutnya).
  const totalPages =
    pribadiTotal !== null
      ? Math.max(1, Math.ceil(pribadiTotal / PRIBADI_PAGE_SIZE))
      : pribadi.length === PRIBADI_PAGE_SIZE
        ? page + 1
        : page;

  // ?hal=99 (di luar jangkauan) -> kembalikan ke halaman terakhir
  useEffect(() => {
    if (pribadiTotal !== null && page > totalPages) {
      setSearchParams(totalPages > 1 ? { hal: String(totalPages) } : {}, { replace: true });
    }
  }, [pribadiTotal, page, totalPages, setSearchParams]);

  function goToPage(n) {
    const target = Math.min(Math.max(n, 1), totalPages);
    if (target === page) return;
    shouldScrollRef.current = true;
    setSearchParams(target === 1 ? {} : { hal: String(target) });
  }

  // Muat 8 iklan perumahan berikutnya (minta batch berikutnya ke server saja).
  async function loadMorePerumahan() {
    if (loadingMore || !hasMorePerumahan) return;
    setLoadingMore(true);
    try {
      const raw = await d1Api.getListings({
        type: 'perumahan',
        limit: PERUMAHAN_ROW_LIMIT + 1,
        offset: perumahan.length,
      });
      const batch = (raw || []).map(normalizeHome);
      setPerumahan((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...batch.slice(0, PERUMAHAN_ROW_LIMIT).filter((x) => !seen.has(x.id))];
      });
      setHasMorePerumahan(batch.length > PERUMAHAN_ROW_LIMIT);
    } catch (err) {
      console.error('Gagal memuat perumahan berikutnya:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/cari/${slugifySearch(q)}` : '/cari');
  }

  return (
    <div>
      <Seo
        title="Platform Jual Beli Rumah"
        pageTitle="Rauma - Platform jual beli rumah"
        description="Rauma adalah platform jual beli rumah Yang mudah digunakan — Temukan rumah subsidi, hingga rumah take over KPR sesuai lokasi dan budget kamu."
        path="/"
      />
      {/* Hero + search bar */}
      <section className="relative overflow-hidden bg-[#F6F3EC]/90 pt-12 pb-6 sm:pt-16 sm:pb-8">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="font-display text-3xl font-semibold text-black sm:text-4xl">
            Temukan Hunian Impianmu
          </h1>
          <form onSubmit={handleSearch} className="mx-auto mt-6 max-w-2xl">
            <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 flex-shrink-0 text-ink/40"
                aria-hidden
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari lokasi dan harga yang sesuai untuk mu..."
                className="w-full bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none sm:text-base"
              />
              <button
                type="submit"
                className="flex-shrink-0 rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-forest-dark"
              >
                Cari
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-4 max-w-6xl px-4 pb-8 pt-0 sm:-mt-6">
        {/* Shortcut kategori */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {CATEGORY_SHORTCUTS.map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-white px-1 py-2.5 text-center hover:border-forest"
            >
              <img src={c.icon} alt="" className="h-11 w-11" aria-hidden />
              <span className="text-xs font-medium text-ink/70">{c.label}</span>
            </Link>
          ))}
        </div>

        {/* Baris 1: Perumahan */}
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-navy">Perumahan</h2>
          {perumahan.length === 0 && !perumahanLoading ? (
            perumahanError ? (
              <LoadErrorNotice message={perumahanError} onRetry={loadPerumahan} />
            ) : (
              <p className="mt-4 text-sm text-ink/40">Belum ada listing perumahan.</p>
            )
          ) : (
            <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2">
              <div className="flex gap-4" style={{ width: 'max-content' }}>
                {perumahan.map((l) => (
                  <div key={l.id} className="w-44 flex-shrink-0 sm:w-60">
                    <ListingCard listing={l} />
                  </div>
                ))}
                {hasMorePerumahan && (
                  <button
                    type="button"
                    onClick={loadMorePerumahan}
                    disabled={loadingMore}
                    className="flex w-44 flex-shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white text-center sm:w-60 disabled:opacity-60"
                  >
                    <span className="text-2xl" aria-hidden>➡️</span>
                    <span className="text-sm font-semibold text-forest">
                      {loadingMore ? 'Memuat...' : 'Lihat lainnya'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Baris 2+: Rumah Pribadi (grid bernomor halaman) */}
        <section ref={pribadiSectionRef} className="mt-10 scroll-mt-24">
          <h2 className="font-display text-xl font-semibold text-navy">Rumah Pribadi</h2>
          {pribadi.length === 0 && !pribadiLoading ? (
            pribadiError ? (
              <LoadErrorNotice message={pribadiError} onRetry={() => loadPribadi(page)} />
            ) : (
              <p className="mt-4 text-sm text-ink/40">Belum ada listing rumah pribadi.</p>
            )
          ) : (
            <div
              className={`mt-4 grid grid-cols-2 gap-4 transition-opacity sm:grid-cols-4 ${
                pribadiLoading ? 'opacity-60' : ''
              }`}
            >
              {pribadi.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} onChange={goToPage} disabled={pribadiLoading} />
        </section>
      </div>
    </div>
  );
}
