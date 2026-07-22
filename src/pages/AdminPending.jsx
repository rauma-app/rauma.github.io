import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../lib/admin';
import ImageSlider from '../components/ImageSlider';
import { formatRupiah } from '../lib/kpr';

export default function AdminPending() {
  const { user, loading: authLoading } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!user || !isAdmin(user)) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const q = query(collection(db, 'listings'), where('status', '==', 'pending'));
      const snap = await getDocs(q);
      setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id, status) {
    setBusyId(id);
    try {
      await updateDoc(doc(db, 'listings', id), { status });
      setPending((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui status. Coba lagi ya.');
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-ink/50">Memuat...</div>;
  }

  if (!user || !isAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-navy">Tinjau Iklan (Admin)</h1>

      {loading && <p className="mt-6 text-sm text-ink/50">Memuat...</p>}

      {!loading && pending.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-ink/60">Tidak ada iklan yang menunggu persetujuan. 🎉</p>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {pending.map((listing) => (
          <div key={listing.id} className="overflow-hidden rounded-2xl border border-line bg-white">
            <ImageSlider images={listing.images} alt={listing.kecamatan} aspect="aspect-[16/9]" rounded="rounded-none" />
            <div className="p-4">
              <p className="font-display text-xl font-semibold text-navy">{formatRupiah(listing.price)}</p>
              <p className="mt-1 text-sm text-ink/60">
                {listing.kecamatan ? `${listing.kecamatan} - ` : ''}
                {listing.kabupaten} · <span className="capitalize">{listing.type}</span>
              </p>
              <p className="mt-1 text-xs text-ink/40">
                Diposting oleh {listing.ownerName} ({listing.whatsapp || 'tanpa WhatsApp'})
              </p>
              {listing.description && (
                <p className="mt-2 whitespace-pre-line text-sm text-ink/70">{listing.description}</p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setStatus(listing.id, 'approved')}
                  disabled={busyId === listing.id}
                  className="flex-1 rounded-full bg-forest py-2 text-sm font-semibold text-white hover:bg-forest-dark disabled:opacity-50"
                >
                  ✓ Setujui
                </button>
                <button
                  onClick={() => setStatus(listing.id, 'rejected')}
                  disabled={busyId === listing.id}
                  className="flex-1 rounded-full border border-red-200 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  ✕ Tolak
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
