import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// Impor API Helper D1
import { d1Api } from '../lib/d1Api';

import ListingCard from '../components/ListingCard';
import LocationPermissionPopup from '../components/LocationPermissionPopup';
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

export default function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [perumahan, setPerumahan] = useState([]);
  const [allPerumahanData, setAllPerumahanData] = useState([]);
  const [pagePerumahan, setPagePerumahan] = useState(1);
  const [hasMorePerumahan, setHasMorePerumahan] = useState(true);
  const [pribadi, setPribadi] = useState([]);
  const [allPribadiData, setAllPribadiData] = useState([]);
  const [pagePribadi, setPagePribadi] = useState(1);
  const [hasMorePribadi, setHasMorePribadi] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userLoc, setUserLoc] = useState(null); // cuma keisi kalau user izinkan GPS
  const [loading, setLoading] = useState(true);

  // Begitu user izinkan lokasi GPS, Perumahan & Rumah Pribadi otomatis
  // ganti isi jadi yang PALING DEKAT dari lokasi itu (query langsung ke
  // database, per kategori), gantiin isi yang tadinya "terbaru".
  async function handleLocationGranted(loc) {
    setUserLoc(loc);
    setLoadingMore(true);
    try {
      const [nearestPerumahan, nearestPribadi] = await Promise.all([
        d1Api.getNearbyListings({ lat: loc.lat, lon: loc.lon, limit: PERUMAHAN_ROW_LIMIT, type: 'perumahan' }),
        d1Api.getNearbyListings({ lat: loc.lat, lon: loc.lon, limit: PRIBADI_PAGE_SIZE, type: 'pribadi' }),
      ]);
      setPerumahan(nearestPerumahan);
      setHasMorePerumahan(nearestPerumahan.length === PERUMAHAN_ROW_LIMIT);
      setPagePerumahan(1);
      setPribadi(nearestPribadi);
      setHasMorePribadi(nearestPribadi.length === PRIBADI_PAGE_SIZE);
      setPagePribadi(1);
    } catch (err) {
      console.error('Gagal memuat listing terdekat:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  // Load data dari Cloudflare D1
  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const rawListings = await d1Api.getListings();

      // Normalisasi data dari D1 agar sesuai dengan kebutuhan ListingCard
      const allListings = (rawListings || []).map((item) => {
        let parsedImages = [];
        try {
          // Parse string JSON images dari D1 menjadi Array
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
          // Pastikan properti gambar aman dipakai ListingCard
          images: parsedImages,
          imageUrls: parsedImages,
          coverImage: parsedImages[0] || item.coverImage || '/placeholder.jpg',
          price: Number(item.price) || 0,
        };
      });

      // Filter perumahan vs rumah pribadi
      const perumahanData = allListings.filter(item => item.type === 'perumahan');
      const pribadiData = allListings.filter(item => item.type === 'pribadi' || !item.type);

      setAllPerumahanData(perumahanData);
      setPerumahan(perumahanData.slice(0, PERUMAHAN_ROW_LIMIT));
      setHasMorePerumahan(perumahanData.length > PERUMAHAN_ROW_LIMIT);
      setPagePerumahan(1);
      setAllPribadiData(pribadiData);
      setPribadi(pribadiData.slice(0, PRIBADI_PAGE_SIZE));
      setHasMorePribadi(pribadiData.length > PRIBADI_PAGE_SIZE);
      setPagePribadi(1);
    } catch (err) {
      console.error('Gagal memuat listing dari D1:', err);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Muat 8 listing perumahan lagi. Kalau GPS aktif, query ulang ke DB nyari
  // yang terdekat lagi (limit lebih besar); kalau belum, tinggal potong dari
  // data terbaru yang sudah ke-load duluan.
  async function loadMorePerumahan() {
    if (loadingMore || !hasMorePerumahan) return;
    setLoadingMore(true);

    const nextPage = pagePerumahan + 1;
    const nextLimit = nextPage * PERUMAHAN_ROW_LIMIT;

    if (userLoc) {
      const data = await d1Api.getNearbyListings({
        lat: userLoc.lat,
        lon: userLoc.lon,
        limit: nextLimit,
        type: 'perumahan',
      });
      setPerumahan(data);
      setHasMorePerumahan(data.length === nextLimit);
    } else {
      const nextBatch = allPerumahanData.slice(0, nextLimit);
      setPerumahan(nextBatch);
      setHasMorePerumahan(allPerumahanData.length > nextLimit);
    }

    setPagePerumahan(nextPage);
    setLoadingMore(false);
  }

  // Sama seperti di atas, tapi buat Rumah Pribadi
  async function loadMorePribadi() {
    if (loadingMore || !hasMorePribadi) return;
    setLoadingMore(true);

    const nextPage = pagePribadi + 1;
    const nextLimit = nextPage * PRIBADI_PAGE_SIZE;

    if (userLoc) {
      const data = await d1Api.getNearbyListings({
        lat: userLoc.lat,
        lon: userLoc.lon,
        limit: nextLimit,
        type: 'pribadi',
      });
      setPribadi(data);
      setHasMorePribadi(data.length === nextLimit);
    } else {
      const nextBatch = allPribadiData.slice(0, nextLimit);
      setPribadi(nextBatch);
      setHasMorePribadi(allPribadiData.length > nextLimit);
    }

    setPagePribadi(nextPage);
    setLoadingMore(false);
  }

  // Kalau izin GPS UDAH pernah diizinkan sebelumnya (browser masih ingat),
  // langsung ambil ulang lokasinya diam-diam begitu halaman dibuka/direload
  // -- tanpa nunggu popup nongol lagi. Ini yang bikin personalisasi lokasi
  // tetap jalan meskipun halaman di-reload (misal ganti mode desktop/mobile).
  useEffect(() => {
    if (!navigator.permissions || !navigator.geolocation) return;
    let cancelled = false;

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (cancelled || status.state !== 'granted') return;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!cancelled) {
              handleLocationGranted({ lat: pos.coords.latitude, lon: pos.coords.longitude });
            }
          },
          () => {},
          { enableHighAccuracy: false, timeout: 8000 }
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/cari/${slugifySearch(q)}` : '/cari');
  }

  return (
    <div>
      <Seo
        title="Jual Beli Rumah KPR Murah Seluruh Indonesia"
        description="Rauma adalah platform jual beli rumah KPR gratis dan mudah — temukan rumah termurah, rumah subsidi, hingga rumah take over KPR sesuai lokasi dan budget kamu."
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
          {perumahan.length === 0 && !loading ? (
            <p className="mt-4 text-sm text-ink/40">Belum ada listing perumahan.</p>
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

        {/* Baris 2+: Rumah Pribadi */}
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-navy">Rumah Pribadi</h2>
          {pribadi.length === 0 && !loading ? (
            <p className="mt-4 text-sm text-ink/40">Belum ada listing rumah pribadi.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {pribadi.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
          {hasMorePribadi && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMorePribadi}
                disabled={loadingMore}
                className="rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark disabled:opacity-60"
              >
                {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
              </button>
            </div>
          )}
        </section>

        <LocationPermissionPopup onLocationGranted={handleLocationGranted} suppress={!!userLoc} />
      </div>
    </div>
  );
}
