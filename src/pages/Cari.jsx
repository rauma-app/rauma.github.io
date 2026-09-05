import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { d1Api } from '../lib/d1Api';
import ListingCard from '../components/ListingCard';
import Seo from '../components/Seo';
import { parseSearchQuery, deslugify } from '../lib/searchParser';
import { getAnonId } from '../lib/anon';

export default function Cari() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();

  // Dukung 2 bentuk URL: /cari/rumah-200jt-di-bandung (SEO-friendly, dipakai
  // dari search bar) DAN /cari?q=... (fallback lama, tetap jalan).
  const rawQuery = slug ? deslugify(slug) : (searchParams.get('q') || '').trim();

  const parsed = useMemo(() => parseSearchQuery(rawQuery), [rawQuery]);

  const [results, setResults] = useState([]);
  const [fallbackResults, setFallbackResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Catat query yang benar-benar diketik orang -- data ini yang dibaca di
  // dashboard statistik Admin buat lihat area mana yang paling banyak
  // dicari (termasuk yang hasilnya kosong -- itu sinyal ekspansi).
  useEffect(() => {
    if (rawQuery) {
      d1Api.logEvent('search', { anon_id: getAnonId(), query_text: rawQuery });
    }
  }, [rawQuery]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setFallbackResults([]);
      const data = await d1Api.getListings({
        minPrice: parsed.minPrice || undefined,
        maxPrice: parsed.maxPrice || undefined,
        location: parsed.location || undefined,
      });
      if (cancelled) return;
      setResults(data);
      setLoading(false);

      // Kalau kosong dan ada lokasi + harga yang dicari, tawarin listing lain
      // di area yang SAMA tapi masih di rentang harga yang masuk akal (target
      // +/- 200jt) -- biar gak nampilin misal rumah 1M pas orang nyari
      // budget 300jt (jelas gak akan kebeli, cuma buang-buang baca data).
      const BAND = 200_000_000;
      if (data.length === 0 && parsed.location) {
        const target = parsed.minPrice ?? parsed.maxPrice;
        const bandMin = target ? Math.max(0, target - BAND) : undefined;
        const bandMax = target ? target + BAND : undefined;
        const alt = await d1Api.getListings({
          location: parsed.location,
          minPrice: bandMin,
          maxPrice: bandMax,
        });
        if (!cancelled) {
          const sorted = target
            ? [...alt].sort((a, b) => Math.abs((a.price || 0) - target) - Math.abs((b.price || 0) - target))
            : alt;
          setFallbackResults(sorted.slice(0, 8));
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [parsed.minPrice, parsed.maxPrice, parsed.location]);

  const titleParts = [];
  if (parsed.priceLabel) titleParts.push(parsed.priceLabel);
  if (parsed.locationLabel) titleParts.push(`di ${parsed.locationLabel}`);

  const pageTitle = titleParts.length
    ? `Rumah ${titleParts.join(' ')}`
    : rawQuery
      ? `Hasil Pencarian "${rawQuery}"`
      : 'Cari Rumah';

  const seoDescription = titleParts.length
    ? `Temukan rumah dijual ${titleParts.join(' ')} di Rauma — update terbaru, harga transparan, langsung terhubung ke penjual lewat WhatsApp.`
    : 'Cari rumah dijual di seluruh Indonesia berdasarkan harga dan lokasi di Rauma.';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Seo
        title={pageTitle}
        description={seoDescription}
        path={`/cari${slug ? `/${slug}` : ''}`}
        noindex={!loading && results.length === 0}
      />

      <h1 className="font-display text-2xl font-semibold text-navy sm:text-3xl">{pageTitle}</h1>
      <p className="mt-1.5 text-sm text-ink/50">
        {loading ? 'Mencari properti...' : `${results.length} properti ditemukan`}
      </p>

      {!loading && results.length === 0 && (
        <div className="mt-8 rounded-2xl border border-line bg-white p-8 text-center">
          <p className="text-ink/60">
            Belum ada listing yang cocok untuk {rawQuery ? <>&ldquo;{rawQuery}&rdquo;</> : 'pencarian ini'}.
          </p>
          <p className="mt-1 text-sm text-ink/40">Coba kata kunci lain, misal nama kotanya saja.</p>
          <Link to="/" className="mt-4 inline-block font-semibold text-forest underline">
            Kembali ke beranda
          </Link>
        </div>
      )}

      {!loading && results.length === 0 && fallbackResults.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold text-navy">
            Rumah lain {parsed.locationLabel ? `di ${parsed.locationLabel}` : 'di area ini'}
          </h2>
          <p className="mt-1 text-sm text-ink/50">
            Belum ada yang pas harganya, tapi ini rumah lain yang ada di area yang kamu cari.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {fallbackResults.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {results.map((item) => (
          <ListingCard key={item.id} listing={item} />
        ))}
      </div>
    </div>
  );
}
