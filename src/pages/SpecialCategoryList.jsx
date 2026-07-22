import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import ListingCard from '../components/ListingCard';

export function SpecialCategoryList({ type, title, intro }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const q = query(collection(db, 'listings'), where('type', '==', type));
        const snap = await getDocs(q);
        setListings(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((l) => l.status === 'approved')
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [type]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-navy">{title}</h1>
      {intro && <p className="mt-2 max-w-2xl text-sm text-ink/60">{intro}</p>}

      {loading && <p className="mt-6 text-sm text-ink/50">Memuat...</p>}

      {!loading && listings.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-ink/60">Belum ada listing di kategori ini.</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {listings.map((l) => (
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
    />
  );
}

export function JualCepatList() {
  return (
    <SpecialCategoryList
      type="jual_cepat"
      title="Jual Cepat"
      intro="Rumah dari penjual yang butuh terjual cepat, dipromosikan lewat program Jual Cepat Rauma."
    />
  );
}
