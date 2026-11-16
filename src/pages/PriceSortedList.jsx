import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { d1Api } from '../lib/d1Api';
import { formatRupiahShort } from '../lib/kpr';
import ListingCard from '../components/ListingCard';
import Pagination from '../components/Pagination';
import Seo from '../components/Seo';

const PAGE_SIZE = 8;
const EXCLUDED_TYPES = ['subsidi', 'jual_cepat', 'take_over_kpr']; // kategori khusus, gak ikut daftar umum ini

// Dua halaman berbasis RENTANG HARGA. Alamat lama (/termurah, /termahal) sengaja
// dipertahankan supaya link yang sudah tersebar & hasil Google tidak rusak.
// Batas bawah TERMASUK, batas atas TIDAK termasuk (Rp 5 M persis masuk "5-10M",
// bukan "2-5M"). `max: null` = tanpa batas atas.
const PROGRAMS = {
  '/termurah': {
    title: 'Dibawah 1M',
    tagline: 'Rumah dengan harga di bawah Rp 1 miliar.',
    seoDescription:
      'Dibawah 1M: kumpulan rumah dijual dengan harga mulai Rp300 juta sampai di bawah Rp1 miliar, plus pilihan Rp1–2 miliar, di seluruh Indonesia.',
    ranges: [
      { key: '300-1m', label: '300-1M', min: 300_000_000, max: 1_000_000_000 },
      { key: '1-2m', label: '1-2M', min: 1_000_000_000, max: 2_000_000_000 },
    ],
  },
  '/termahal': {
    title: 'Rumah Premium',
    tagline: 'Koleksi hunian premium mulai Rp 2 miliar ke atas.',
    seoDescription:
      'Rumah Premium: koleksi rumah dan hunian eksklusif mulai Rp2 miliar ke atas, dengan pilihan rentang Rp2–5 miliar, Rp5–10 miliar, dan UHNWI (di atas Rp10 miliar).',
    ranges: [
      { key: '2-5m', label: '2-5M', min: 2_000_000_000, max: 5_000_000_000 },
      { key: '5-10m', label: '5-10M', min: 5_000_000_000, max: 10_000_000_000 },
      { key: 'uhnwi', label: 'UHNWI', min: 10_000_000_000, max: null },
    ],
  },
};

function rangeText(range) {
  if (range.max == null) return `Menampilkan rumah ${formatRupiahShort(range.min)} ke atas`;
  return `Menampilkan rumah ${formatRupiahShort(range.min)} sampai di bawah ${formatRupiahShort(range.max)}`;
}

export default function PriceSortedList() {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const program = PROGRAMS[pathname] || PROGRAMS['/termurah'];

  // Rentang harga & nomor halaman disimpan di URL (?harga=1-2m&hal=2)
  const hargaParam = searchParams.get('harga');
  const range = program.ranges.find((r) => r.key === hargaParam) || program.ranges[0];
  const rawPage = parseInt(searchParams.get('hal') || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(null); // null = belum/gagal dihitung
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const totalsRef = useRef({});
  const reqRef = useRef(0);
  const gridRef = useRef(null);
  const shouldScrollRef = useRef(false);

  const load = useCallback(async () => {
    const reqId = ++reqRef.current;
    const cacheKey = `${pathname}|${range.key}`;
    // Batas atas tidak termasuk -> kirim (max - 1); harga berupa bilangan bulat rupiah.
    const filters = {
      minPrice: range.min,
      maxPrice: range.max == null ? undefined : range.max - 1,
      excludeTypes: EXCLUDED_TYPES,
    };
    setLoading(true);
    setError('');
    try {
      const run = () =>
        Promise.all([
          d1Api.getListings({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, throwOnError: true }),
          totalsRef.current[cacheKey] !== undefined
            ? Promise.resolve(totalsRef.current[cacheKey])
            : d1Api.getListingsCount(filters),
        ]);
      let result;
      try {
        result = await run();
      } catch (firstErr) {
        await new Promise((r) => setTimeout(r, 1200)); // coba sekali lagi
        result = await run();
      }
      if (reqId !== reqRef.current) return;
      const [data, count] = result;
      if (count !== null) totalsRef.current[cacheKey] = count;
      setTotal(count);
      setListings(data || []);
    } catch (err) {
      if (reqId !== reqRef.current) return;
      console.error('Gagal memuat daftar harga:', err);
      setError(err?.message || 'Koneksi bermasalah');
    } finally {
      if (reqId === reqRef.current) {
        setLoading(false);
        if (shouldScrollRef.current) {
          shouldScrollRef.current = false;
          requestAnimationFrame(() => {
            gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
      }
    }
  }, [pathname, range, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Jumlah halaman: dari total kalau diketahui; kalau gagal dihitung, perkirakan dari isi halaman ini
  const totalPages =
    total !== null
      ? Math.max(1, Math.ceil(total / PAGE_SIZE))
      : listings.length === PAGE_SIZE
        ? page + 1
        : page;

  function paramsFor(nextRangeKey, nextPage) {
    const next = {};
    if (nextRangeKey !== program.ranges[0].key) next.harga = nextRangeKey;
    if (nextPage > 1) next.hal = String(nextPage);
    return next;
  }

  // ?hal=99 (di luar jangkauan) -> kembalikan ke halaman terakhir
  useEffect(() => {
    if (total !== null && page > totalPages) {
      setSearchParams(paramsFor(range.key, totalPages), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, page, totalPages, range.key]);

  // Ganti rentang -> kembali ke halaman 1 (tanpa menambah riwayat tombol Back)
  function changeRange(key) {
    if (key === range.key) return;
    setSearchParams(paramsFor(key, 1), { replace: true });
  }

  function goToPage(n) {
    const target = Math.min(Math.max(n, 1), totalPages);
    if (target === page) return;
    shouldScrollRef.current = true;
    setSearchParams(paramsFor(range.key, target));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Seo title={program.title} description={program.seoDescription} path={pathname} />
      <h1 className="font-display text-2xl font-semibold text-navy">{program.title}</h1>
      <p className="mt-1 text-sm text-ink/60">{program.tagline}</p>

      {/* Pilihan rentang harga: selalu ada satu yang menyala */}
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Rentang harga">
        {program.ranges.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => changeRange(r.key)}
            aria-pressed={r.key === range.key}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              r.key === range.key ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink/50">{rangeText(range)}</p>

      {error && listings.length === 0 && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-4">
          <p className="text-sm font-medium text-ink/80">Iklan belum berhasil dimuat.</p>
          <p className="mt-1 text-[11px] text-ink/30">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white"
          >
            Coba lagi
          </button>
        </div>
      )}

      {!loading && !error && listings.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-ink/60">Belum ada listing di rentang harga ini.</p>
        </div>
      )}

      <div
        ref={gridRef}
        className={`mt-6 grid scroll-mt-28 grid-cols-2 gap-4 transition-opacity sm:grid-cols-4 ${
          loading && listings.length > 0 ? 'opacity-60' : ''
        }`}
      >
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>

      {loading && listings.length === 0 && <p className="mt-6 text-sm text-ink/50">Memuat...</p>}

      <Pagination page={page} totalPages={totalPages} onChange={goToPage} disabled={loading} />
    </div>
  );
}
