          import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import ListingCard from '../components/ListingCard';
import LocationPermissionPopup from '../components/LocationPermissionPopup';
import { distanceKm } from '../lib/nominatim';

function sortByCreatedDesc(items) {
  return [...items].sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

const CATEGORY_SHORTCUTS = [
  { icon: '🌿', label: 'Green House' },
  { icon: '⚡', label: 'Jual Cepat' },
  { icon: '📄', label: 'Take Over KPR' },
  { icon: '💎', label: 'TerMewah' },
  { icon: '🧮', label: 'Kalkulator Kredit' },
  { icon: '🛡️', label: 'Awas Ketipu' },
];

function sortByDistance(items, userLoc) {
  if (!userLoc) return items;
  return [...items].sort((a, b) => {
    const da = distanceKm(userLoc.lat, userLoc.lon, a.lat, a.lon);
    const db_ = distanceKm(userLoc.lat, userLoc.lon, b.lat, b.lon);
    if (da == null) return 1;
    if (db_ == null) return -1;
    return da - db_;
  });
}

export default function Home() {
  const [perumahan, setPerumahan] = useState([]);
  const [pribadi, setPribadi] = useState([]);
  const [userLoc, setUserLoc] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const perumahanQ = query(
        collection(db, 'listings'),
        where('type', '==', 'perumahan'),
        limit(20)
      );
      const pribadiQ = query(
        collection(db, 'listings'),
        where('type', '==', 'pribadi'),
        limit(20)
      );
      const [perumahanSnap, pribadiSnap] = await Promise.all([
        getDocs(perumahanQ),
        getDocs(pribadiQ),
      ]);
      const perumahanList = sortByCreatedDesc(
        perumahanSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      ).slice(0, 4);
      const pribadiList = sortByCreatedDesc(
        pribadiSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      ).slice(0, 8);
      setPerumahan(perumahanList);
      setPribadi(pribadiList);
    } catch (err) {
      console.error('Gagal memuat listing:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const sortedPerumahan = sortByDistance(perumahan, userLoc);
  const sortedPribadiRow2 = sortByDistance(pribadi.slice(0, 4), userLoc);
  const sortedPribadiRow3 = sortByDistance(pribadi.slice(4, 8), userLoc);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Shortcut kategori */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {CATEGORY_SHORTCUTS.map((c) => (
          <button
            key={c.label}
            className="flex flex-col items-center gap-2 rounded-xl border border-line bg-white px-2 py-4 text-center hover:border-forest"
          >
            <span className="text-2xl" aria-hidden>{c.icon}</span>
            <span className="text-xs font-medium text-ink/70">{c.label}</span>
          </button>
        ))}
      </div>

      {userLoc && (
        <p className="mt-6 text-sm text-forest">
          Menampilkan rumah terdekat dari lokasi kamu.
        </p>
      )}

      {/* Baris 1: Perumahan */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-navy">Perumahan</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {sortedPerumahan.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
          {!loading && sortedPerumahan.length === 0 && (
            <p className="col-span-full text-sm text-ink/40">Belum ada listing perumahan.</p>
          )}
        </div>
      </section>

      {/* Baris 2 & 3: Rumah Pribadi */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-navy">Rumah Pribadi</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {sortedPribadiRow2.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {sortedPribadiRow3.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
          {!loading && sortedPribadiRow2.length === 0 && sortedPribadiRow3.length === 0 && (
            <p className="col-span-full text-sm text-ink/40">Belum ada listing rumah pribadi.</p>
          )}
        </div>
      </section>

      <LocationPermissionPopup onLocationGranted={setUserLoc} />
    </div>
  );
}
