import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import ListingCard from '../components/ListingCard';
import Seo from '../components/Seo';
import { distanceKm } from '../lib/nominatim';

const NEARBY_RADIUS_KM = 30;
const EXCLUDED_TYPES = ['subsidi', 'jual_cepat', 'take_over_kpr']; // kategori khusus, gak ikut daftar umum ini

export default function PriceSortedList() {
  const { pathname } = useLocation();
  const isCheapest = pathname === '/termurah';

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const q = query(collection(db, 'listings'), where('status', '==', 'approved'));
        const snap = await getDocs(q);
        const all = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((l) => !EXCLUDED_TYPES.includes(l.type));
        setListings(all);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleActivateLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  let displayed = [...listings];

  if (userLoc) {
    const nearby = displayed.filter((l) => {
      const d = distanceKm(userLoc.lat, userLoc.lon, l.lat, l.lon);
      return d != null && d <= NEARBY_RADIUS_KM;
    });
    displayed = (nearby.length >= 4 ? nearby : displayed).sort((a, b) =>
      isCheapest ? a.price - b.price : b.price - a.price
    );
  } else {
    displayed.sort((a, b) => (isCheapest ? a.price - b.price : b.price - a.price));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Seo
        title={isCheapest ? 'Rumah Termurah' : 'Rumah Termahal'}
        description={
          isCheapest
            ? 'Daftar rumah termurah dari seluruh listing Rauma, bisa diurutkan berdasarkan jarak terdekat dari lokasi kamu.'
            : 'Daftar rumah dengan harga tertinggi dari seluruh listing Rauma, bisa diurutkan berdasarkan jarak terdekat dari lokasi kamu.'
        }
        path={isCheapest ? '/termurah' : '/termahal'}
      />
      <h1 className="font-display text-2xl font-semibold text-navy">
        {isCheapest ? 'Rumah Termurah' : 'Rumah Termahal'}
      </h1>

      <div className="mt-4">
        {!userLoc ? (
          <button
            onClick={handleActivateLocation}
            disabled={locating}
            className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark disabled:opacity-60"
          >
            {locating
              ? 'Mencari lokasi...'
              : `📍 Aktifkan Lokasi (urutkan ${isCheapest ? 'termurah' : 'termahal'} terdekat)`}
          </button>
        ) : (
          <p className="text-sm text-forest">
            Menampilkan rumah {isCheapest ? 'termurah' : 'termahal'} dalam radius {NEARBY_RADIUS_KM} km dari lokasi kamu.
          </p>
        )}
      </div>

      {loading && <p className="mt-6 text-sm text-ink/50">Memuat...</p>}

      {!loading && displayed.length === 0 && (
        <p className="mt-6 text-sm text-ink/40">Belum ada listing.</p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {displayed.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </div>
  );
}
