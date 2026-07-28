import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import ListingCard from '../components/ListingCard';
import Seo from '../components/Seo';
import VerifiedBadge from '../components/VerifiedBadge';
import { ADMIN_UIDS } from '../lib/admin';

export default function SellerProfile() {
  const { uid } = useParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'listings'),
          where('ownerUid', '==', uid),
          where('status', '==', 'approved')
        );
        const snap = await getDocs(q);
        setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [uid]);

  const owner = listings[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Seo
        title={owner ? `Iklan dari ${owner.ownerName}` : 'Profil Pengiklan'}
        description="Lihat semua iklan rumah lain dari pengiklan ini di Rauma."
        path={`/penjual/${uid}`}
      />

      <div className="flex items-center gap-3">
        {owner?.ownerPhoto && (
          <img
            src={owner.ownerPhoto}
            alt={owner.ownerName}
            referrerPolicy="no-referrer"
            className="h-14 w-14 rounded-full object-cover"
          />
        )}
        <div>
          <h1 className="flex items-center gap-1.5 font-display text-2xl font-semibold text-navy">
            {owner ? owner.ownerName : 'Profil Pengiklan'}
            {owner && ADMIN_UIDS.includes(owner.ownerUid) && <VerifiedBadge size={20} />}
          </h1>
          <p className="text-sm text-ink/50">{listings.length} iklan tayang</p>
        </div>
      </div>

      {loading && <p className="mt-6 text-sm text-ink/50">Memuat...</p>}

      {!loading && listings.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-ink/60">Pengiklan ini belum punya iklan lain yang tayang.</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
