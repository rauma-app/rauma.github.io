import React, { useEffect, useState } from 'react';
import { d1Api } from '../lib/d1Api';
import ListingCard from '../components/ListingCard';
import Seo from '../components/Seo';
import { distanceKm } from '../lib/nominatim';

const NEARBY_RADIUS_KM = 30;

export function SpecialCategoryList({ type, title, intro, seoDescription, path }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Tanpa ?status -> otomatis hanya yang 'approved'
        const data = await d1Api.getListings({ type });
        setListings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [type]);

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
    const withDistance = displayed
      .map((l) => ({ ...l, _distance: distanceKm(userLoc.lat, userLoc.lon, l.lat, l.lon) }))
      .filter((l) => l._distance != null);
    const nearby = withDistance.filter((l) => l._distance <= NEARBY_RADIUS_KM);
    displayed = (nearby.length >= 4 ? nearby : withDistance).sort((a, b) => a._distance - b._distance);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Seo title={title} description={seoDescription || intro} path={path} />
      <h1 className="font-display text-2xl font-semibold text-navy">{title}</h1>
      {intro && <p className="mt-2 max-w-2xl text-sm text-ink/60">{intro}</p>}

      <div className="mt-4">
        {!userLoc ? (
          <button
            onClick={handleActivateLocation}
            disabled={locating}
            className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark disabled:opacity-60"
          >
            {locating ? 'Mencari lokasi...' : '📍 Aktifkan Lokasi (urutkan terdekat)'}
          </button>
        ) : (
          <p className="text-sm text-forest">
            Menampilkan listing dalam radius {NEARBY_RADIUS_KM} km dari lokasi kamu, diurutkan dari yang terdekat.
          </p>
        )}
      </div>

      {loading && <p className="mt-6 text-sm text-ink/50">Memuat...</p>}

      {!loading && listings.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-ink/60">Belum ada listing di kategori ini.</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {displayed.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </div>
  );
}

export function SubsidiList() {
  return (
    <SpecialCategoryList
      type="subsidi"
      title="Rumah Subsidi"
      intro="Listing rumah subsidi resmi yang dikurasi langsung oleh tim Rauma. Hubungi admin lewat kontak di tiap listing untuk info program subsidi lebih lanjut."
      seoDescription="Cari rumah subsidi pemerintah harga murah di seluruh Indonesia. Listing rumah subsidi resmi dan terkurasi, cocok untuk KPR subsidi FLPP."
      path="/subsidi"
    />
  );
}
