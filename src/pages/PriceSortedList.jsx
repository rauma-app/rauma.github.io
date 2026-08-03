import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { d1Api } from '../lib/d1Api';
import ListingCard from '../components/ListingCard';
import Seo from '../components/Seo';
import LocationPermissionPopup from '../components/LocationPermissionPopup';

const PAGE_SIZE = 12;
const EXCLUDED_TYPES = ['subsidi', 'jual_cepat', 'take_over_kpr']; // kategori khusus, gak ikut daftar umum ini

// "Pasti Pas" (dulu Termurah) & "HNWI" (dulu Termahal) sekarang program
// berbasis RENTANG HARGA, bukan cuma sortir termurah/termahal.
const PROGRAMS = {
  '/termurah': {
    title: 'Pasti Pas',
    tagline: 'Rumah pilihan dengan harga pas di kantong.',
    seoDescription:
      'Pasti Pas: kumpulan rumah dijual dengan harga pas di kantong, mulai dari Rp200 juta sampai Rp600 juta, di seluruh Indonesia.',
    minPrice: 200_000_000,
    maxPrice: 600_000_000,
  },
  '/termahal': {
    title: 'HNWI',
    tagline: 'Koleksi hunian eksklusif untuk kalangan High Net-Worth Individual.',
    seoDescription:
      'HNWI: koleksi rumah dan hunian eksklusif untuk kalangan High Net-Worth Individual, mulai dari Rp1 miliar sampai Rp5 miliar.',
    minPrice: 1_000_000_000,
    maxPrice: 5_000_000_000,
  },
};

export default function PriceSortedList() {
  const { pathname } = useLocation();
  const program = PROGRAMS[pathname] || PROGRAMS['/termurah'];

  const [listings, setListings] = useState([]);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [userLoc, setUserLoc] = useState(null);

  function handleLocationGranted(loc) {
    setUserLoc(loc);
  }

  // Kalau izin GPS sudah pernah diizinkan sebelumnya, ambil ulang lokasinya
  // diam-diam begitu halaman dibuka/direload -- sama seperti di homepage.
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
              setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude });
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
  }, []);

  // Default: urutan terbaru diposting duluan. Begitu lokasi (IP-permission
  // GPS) aktif, isinya ganti jadi yang PALING DEKAT dari lokasi itu -- query
  // langsung ke database, bukan cuma dari data yang sudah ke-load.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        if (userLoc) {
          const nearby = await d1Api.getNearbyListings({
            lat: userLoc.lat,
            lon: userLoc.lon,
            limit: PAGE_SIZE,
            minPrice: program.minPrice,
            maxPrice: program.maxPrice,
          });
          if (cancelled) return;
          setListings(nearby);
          setHasMore(nearby.length === PAGE_SIZE);
        } else {
          const data = await d1Api.getListings({ minPrice: program.minPrice, maxPrice: program.maxPrice });
          const filtered = data.filter((l) => !EXCLUDED_TYPES.includes(l.type));
          if (cancelled) return;
          setAllData(filtered);
          setListings(filtered.slice(0, PAGE_SIZE));
          setHasMore(filtered.length > PAGE_SIZE);
        }
        setPage(1);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [pathname, userLoc, program.minPrice, program.maxPrice]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const nextPage = page + 1;
    const nextLimit = nextPage * PAGE_SIZE;

    if (userLoc) {
      const data = await d1Api.getNearbyListings({
        lat: userLoc.lat,
        lon: userLoc.lon,
        limit: nextLimit,
        minPrice: program.minPrice,
        maxPrice: program.maxPrice,
      });
      setListings(data);
      setHasMore(data.length === nextLimit);
    } else {
      const nextBatch = allData.slice(0, nextLimit);
      setListings(nextBatch);
      setHasMore(allData.length > nextLimit);
    }

    setPage(nextPage);
    setLoadingMore(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Seo title={program.title} description={program.seoDescription} path={pathname} />
      <h1 className="font-display text-2xl font-semibold text-navy">{program.title}</h1>
      <p className="mt-1 text-sm text-ink/60">{program.tagline}</p>

      {loading && <p className="mt-6 text-sm text-ink/50">Memuat...</p>}

      {!loading && listings.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-ink/60">Belum ada listing di rentang harga ini.</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark disabled:opacity-60"
          >
            {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
          </button>
        </div>
      )}

      <LocationPermissionPopup onLocationGranted={handleLocationGranted} suppress={!!userLoc} />
    </div>
  );
}
