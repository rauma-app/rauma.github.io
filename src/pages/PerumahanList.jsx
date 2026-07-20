import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import ListingCard from '../components/ListingCard';

function sortByCreatedDesc(items) {
  return [...items].sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

export default function PerumahanList() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const q = query(collection(db, 'listings'), where('type', '==', 'perumahan'));
        const snap = await getDocs(q);
        setListings(sortByCreatedDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-navy">Semua Perumahan</h1>

      {loading && <p className="mt-6 text-sm text-ink/50">Memuat...</p>}

      {!loading && listings.length === 0 && (
        <p className="mt-6 text-sm text-ink/40">Belum ada listing perumahan.</p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </div>
  );
}

