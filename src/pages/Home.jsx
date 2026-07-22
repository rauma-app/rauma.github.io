import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import { db } from '../firebase';
import ListingCard from '../components/ListingCard';
import LocationPermissionPopup from '../components/LocationPermissionPopup';
import { distanceKm } from '../lib/nominatim';

const CATEGORY_SHORTCUTS = [
  { icon: '📉', label: 'Termurah', to: '/termurah' },
  { icon: '📈', label: 'Termahal', to: '/termahal' },
  { icon: '🏘️', label: 'Rumah Subsidi', to: '/subsidi' },
  { icon: '⚡', label: 'Jual Cepat', to: '/jual-cepat' },
  { icon: '🕌', label: 'KPR Syariah', to: '/kpr-syariah' },
  { icon: '🌱', label: 'Nabung', to: '/nabung' },
];

const PRIBADI_PAGE_SIZE = 8;
const PERUMAHAN_ROW_LIMIT = 8;

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
  const [perumahan, setPerumahan] = useState([]);
  const [pribadi, setPribadi] = useState([]);
  const [lastPribadiDoc, setLastPribadiDoc] = useState(null);
  const [hasMorePribadi, setHasMorePribadi] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userLoc, setUserLoc] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const perumahanQ = query(
        collection(db, 'listings'),
        where('type', '==', 'perumahan'),
        orderBy('createdAt', 'desc'),
        limit(PERUMAHAN_ROW_LIMIT)
      );
      const pribadiQ = query(
        collection(db, 'listings'),
        where('type', '==', 'pribadi'),
        orderBy('createdAt', 'desc'),
        limit(PRIBADI_PAGE_SIZE)
      );
      const [perumahanSnap, pribadiSnap] = await Promise.all([
        getDocs(perumahanQ),
        getDocs(pribadiQ),
      ]);

      // Filter status di sisi klien: cuma tampilkan yang sudah "approved".
      const onlyApproved = (docs) =>
        docs.map((d) => ({ id: d.id, ...d.data() })).filter((l) => l.status === 'approved');

      setPerumahan(onlyApproved(perumahanSnap.docs));
      setPribadi(onlyApproved(pribadiSnap.docs));
      setLastPribadiDoc(pribadiSnap.docs[pribadiSnap.docs.length - 1] || null);
      setHasMorePribadi(pribadiSnap.docs.length === PRIBADI_PAGE_SIZE);
    } catch (err) {
      console.error('Gagal memuat listing:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  async function loadMorePribadi() {
    if (!lastPribadiDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextQ = query(
        collection(db, 'listings'),
        where('type', '==', 'pribadi'),
        orderBy('createdAt', 'desc'),
        startAfter(lastPribadiDoc),
        limit(PRIBADI_PAGE_SIZE)
      );
      const snap = await getDocs(nextQ);
      const approvedOnly = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((l) => l.status === 'approved');
      setPribadi((prev) => [...prev, ...approvedOnly]);
      setLastPribadiDoc(snap.docs[snap.docs.length - 1] || lastPribadiDoc);
      setHasMorePribadi(snap.docs.length === PRIBADI_PAGE_SIZE);
    } catch (err) {
      console.error('Gagal memuat listing tambahan:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  const sortedPerumahan = sortByDistance(perumahan, userLoc);
  const sortedPribadi = sortByDistance(pribadi, userLoc);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Shortcut kategori */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {CATEGORY_SHORTCUTS.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="flex flex-col items-center gap-2 rounded-xl border border-line bg-white px-2 py-4 text-center hover:border-forest"
          >
            <span className="text-2xl" aria-hidden>{c.icon}</span>
            <span className="text-xs font-medium text-ink/70">{c.label}</span>
          </Link>
        ))}
      </div>

      {userLoc && (
        <p className="mt-6 text-sm text-forest">
          Mengurutkan berdasar jarak terdekat dari lokasi kamu.
        </p>
      )}

      {/* Baris 1: Perumahan - horizontal scroll, tidak melebarkan halaman */}
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
              {sortedPerumahan.length >= PERUMAHAN_ROW_LIMIT && (
                <Link
                  to="/perumahan"
                  className="flex w-44 flex-shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white text-center sm:w-60"
                >
                  <span className="text-2xl" aria-hidden>➡️</span>
                  <span className="text-sm font-semibold text-forest">Lihat lainnya</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Baris 2+: Rumah Pribadi, dengan pagination "Muat lebih banyak" */}
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

      <LocationPermissionPopup onLocationGranted={setUserLoc} />
    </div>
  );
}
