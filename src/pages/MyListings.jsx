import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, deleteDoc, doc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import ImageSlider from '../components/ImageSlider';
import { calculateKPR, formatMonthlyShort, formatRupiahShort } from '../lib/kpr';

export default function MyListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'listings'), where('ownerUid', '==', user.uid), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm('Yakin mau hapus iklan ini? Tindakan ini tidak bisa dibatalkan.');
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'listings', id));
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus iklan. Coba lagi ya.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-navy">Iklan Saya</h1>

      {loading && <p className="mt-6 text-sm text-ink/50">Memuat...</p>}

      {!loading && listings.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-ink/60">Kamu belum punya iklan.</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {listings.map((listing) => {
          const { monthly } = calculateKPR(listing.price);
          return (
            <div key={listing.id} className="overflow-hidden rounded-2xl border border-line bg-paper">
              <Link to={`/id/${listing.id}`}>
                <ImageSlider images={listing.images} alt={listing.kecamatan} rounded="rounded-none" />
              </Link>
              <div className="p-3 sm:p-4">
                <Link to={`/id/${listing.id}`} className="block">
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="font-display text-base font-semibold text-navy sm:text-xl">
                      {formatRupiahShort(listing.price)}
                    </span>
                    <span className="text-xs text-ink/50 sm:text-sm">· {formatMonthlyShort(monthly)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-ink/60 sm:text-sm">
                    <span aria-hidden>📍</span>
                    <span className="line-clamp-1">
                      {listing.kecamatan ? `${listing.kecamatan} - ` : ''}
                      {listing.kabupaten}
                    </span>
                  </div>
                </Link>
                <div className="mt-3 flex gap-2">
                  <Link
                    to={`/posting/${listing.id}`}
                    className="flex-1 rounded-full border border-line py-1.5 text-center text-xs font-semibold text-ink hover:border-forest hover:text-forest"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(listing.id)}
                    disabled={deletingId === listing.id}
                    className="flex-1 rounded-full border border-red-200 py-1.5 text-center text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === listing.id ? 'Menghapus...' : 'Hapus'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
              }
