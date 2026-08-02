import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// Impor API Helper D1
import { d1Api } from '../lib/d1Api';

import ListingCard from '../components/ListingCard';
import LocationPermissionPopup from '../components/LocationPermissionPopup';
import Seo from '../components/Seo';
import { distanceKm } from '../lib/nominatim';
import { getIpLocation } from '../lib/ipLocation';

import iconTermurah from '../assets/icons/termurah.svg';
import iconTermahal from '../assets/icons/termahal.svg';
import iconSubsidi from '../assets/icons/rumah_subsidi.svg';
import iconCariProperti from '../assets/icons/jual_cepat.svg';
import iconTakeOverKPR from '../assets/icons/kpr_syariah.svg';
import iconKalkulatorKPR from '../assets/icons/nabung.svg';

const CATEGORY_SHORTCUTS = [
  { icon: iconTermurah, label: 'Termurah', to: '/termurah' },
  { icon: iconTermahal, label: 'Termahal', to: '/termahal' },
  { icon: iconSubsidi, label: 'Rumah Subsidi', to: '/subsidi' },
  { icon: iconCariProperti, label: 'Carikan Properti', to: '/carikan-properti' },
  { icon: iconTakeOverKPR, label: 'Take Over KPR', to: '/take-over-kpr' },
  { icon: iconKalkulatorKPR, label: 'Kalkulator KPR', to: '/kalkulator-kpr' },
];

const PRIBADI_PAGE_SIZE = 8;
const PERUMAHAN_ROW_LIMIT = 8;
const NEARBY_PAGE_SIZE = 20;

function sortByDistance(items, userLoc) {
  if (!userLoc) return items;
  return [...items].sort((a, b) => {
    const da = distanceKm(userLoc.lat, userLoc.lon, a.lat, a.lon);
    const dbb = distanceKm(userLoc.lat, userLoc.lon, b.lat, b.lon);
    if (da == null) return 1;
    if (dbb == null) return -1;
    return da - dbb;
  });
}

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
  const [userLoc, setUserLoc] = useState(null);
  const [locationSource, setLocationSource] = useState(null); // 'ip' | 'gps' | null
  const [loading, setLoading] = useState(true);
  const [nearbyListings, setNearbyListings] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingMoreNearby, setLoadingMoreNearby] = useState(false);
  const [pageNearby, setPageNearby] = useState(1);
  const [hasMoreNearby, setHasMoreNearby] = useState(false);

  // Tebak lokasi kasar dari IP di belakang layar
  useEffect(() => {
    let cancelled = false;
    getIpLocation().then((loc) => {
      if (!cancelled && loc) {
        setUserLoc(loc);
        setLocationSource('ip');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleLocationGranted(loc) {
    setUserLoc(loc);
    setLocationSource('gps');
  }

  // Begitu lokasi user diketahui (dari IP ataupun GPS), tarik langsung ke
  // database cari 20 rumah TERDEKAT dari SELURUH listing (bukan cuma yang
  // sudah ke-load di halaman ini) -- supaya akurat untuk siapapun dari
  // Sabang sampai Merauke. Kalau lokasinya upgrade dari IP ke GPS, otomatis
  // ke-fetch ulang biar makin presisi.
  useEffect(() => {
    if (!userLoc) return;
    let cancelled = false;
    setLoadingNearby(true);
    setPageNearby(1);
    d1Api.getNearbyListings({ lat: userLoc.lat, lon: userLoc.lon, limit: NEARBY_PAGE_SIZE }).then((data) => {
      if (!cancelled) {
        setNearbyListings(data);
        setHasMoreNearby(data.length === NEARBY_PAGE_SIZE); // kalau hasilnya pas 20, kemungkinan masih ada lagi
        setLoadingNearby(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userLoc]);

  // Muat 20 rumah terdekat lagi (query ulang ke DB dengan limit lebih besar,
  // biar urutan jarak tetap akurat & konsisten, gak cuma nambah di ujung)
  async function loadMoreNearby() {
    if (loadingMoreNearby || !hasMoreNearby || !userLoc) return;
    setLoadingMoreNearby(true);

    const nextPage = pageNearby + 1;
    const nextLimit = nextPage * NEARBY_PAGE_SIZE;
    const data = await d1Api.getNearbyListings({ lat: userLoc.lat, lon: userLoc.lon, limit: nextLimit });

    setNearbyListings(data);
    setPageNearby(nextPage);
    setHasMoreNearby(data.length === nextLimit);
    setLoadingMoreNearby(false);
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

  // Muat 8 listing perumahan lagi ke baris yang sama (bukan pindah halaman)
  function loadMorePerumahan() {
    if (loadingMore || !hasMorePerumahan) return;
    setLoadingMore(true);

    const nextPage = pagePerumahan + 1;
    const nextLimit = nextPage * PERUMAHAN_ROW_LIMIT;
    const nextBatch = allPerumahanData.slice(0, nextLimit);

    setPerumahan(nextBatch);
    setPagePerumahan(nextPage);
    setHasMorePerumahan(allPerumahanData.length > nextLimit);
    setLoadingMore(false);
  }

  // Fungsi muat lebih banyak data D1
  async function loadMorePribadi() {
    if (loadingMore || !hasMorePribadi) return;
    setLoadingMore(true);

    const nextPage = pagePribadi + 1;
    const nextLimit = nextPage * PRIBADI_PAGE_SIZE;
    const nextBatch = allPribadiData.slice(0, nextLimit);

    setPribadi(nextBatch);
    setPagePribadi(nextPage);
    setHasMorePribadi(allPribadiData.length > nextLimit);
    setLoadingMore(false);
  }

  // Feed Perumahan & Rumah Pribadi TIDAK diurutkan berdasarkan lokasi --
  // murni terbaru diposting duluan (bawaan dari API), gak peduli lokasi
  // manapun. Personalisasi berdasarkan lokasi ditangani section "Rumah
  // Terdekat" tersendiri di atas (lihat nearbyListings).
  const sortedPerumahan = perumahan;
  const sortedPribadi = pribadi;

  function handleSearch(e) {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/cari?q=${encodeURIComponent(q)}` : '/cari');
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

        {/* Section Rumah Terdekat -- cuma muncul begitu lokasi user diketahui */}
        {userLoc && (
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-navy">Rumah Terdekat dari Kamu</h2>
              <span className="rounded-full bg-forest/10 px-2.5 py-1 text-[11px] font-semibold text-forest">
                {locationSource === 'gps' ? '📍 GPS' : '📶 Perkiraan dari IP'}
              </span>
            </div>

            {loadingNearby && <p className="mt-4 text-sm text-ink/40">Mencari rumah terdekat...</p>}

            {!loadingNearby && nearbyListings.length === 0 && (
              <p className="mt-4 text-sm text-ink/40">Belum ada listing dengan lokasi di sekitar kamu.</p>
            )}

            {!loadingNearby && nearbyListings.length > 0 && (
              <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2">
                <div className="flex gap-4" style={{ width: 'max-content' }}>
                  {nearbyListings.map((l) => (
                    <div key={l.id} className="w-44 flex-shrink-0 sm:w-60">
                      <ListingCard listing={l} />
                      {l.distanceKm != null && (
                        <p className="mt-1 text-xs text-ink/40">± {l.distanceKm} km dari lokasi kamu</p>
                      )}
                    </div>
                  ))}
                  {hasMoreNearby && (
                    <button
                      type="button"
                      onClick={loadMoreNearby}
                      disabled={loadingMoreNearby}
                      className="flex w-44 flex-shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white text-center sm:w-60 disabled:opacity-60"
                    >
                      <span className="text-2xl" aria-hidden>➡️</span>
                      <span className="text-sm font-semibold text-forest">
                        {loadingMoreNearby ? 'Memuat...' : 'Lihat lainnya'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {locationSource === 'ip' && (
              <p className="mt-2 text-xs text-ink/40">
                Ini masih perkiraan kasar dari IP. Izinkan lokasi GPS di popup yang muncul biar lebih akurat.
              </p>
            )}
          </section>
        )}

        {/* Baris 1: Perumahan */}
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-navy">Perumahan</h2>
          {sortedPerumahan.length === 0 && !loading ? (
            <p className="mt-4 text-sm text-ink/40">Belum ada listing perumahan.</p>
          ) : (
            <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2">
              <div className="flex gap-4" style={{ width: 'max-content' }}>
                {sortedPerumahan.map((l) => (
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
          {sortedPribadi.length === 0 && !loading ? (
            <p className="mt-4 text-sm text-ink/40">Belum ada listing rumah pribadi.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {sortedPribadi.map((l) => (
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

        <LocationPermissionPopup onLocationGranted={handleLocationGranted} />
      </div>
    </div>
  );
      }
  
