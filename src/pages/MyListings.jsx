import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { d1Api } from '../lib/d1Api';
import { useAuth } from '../context/AuthContext';
import ImageSlider from '../components/ImageSlider';
import { formatMonthlyShort, formatRupiahShort } from '../lib/kpr';

const STATUS_LABELS = {
  pending: { text: 'Menunggu Persetujuan', className: 'bg-amber-100 text-amber-700' },
  approved: { text: 'Tayang', className: 'bg-forest/10 text-forest' },
  rejected: { text: 'Ditolak', className: 'bg-red-100 text-red-600' },
};

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
      // status: 'all' -> tampilkan punya sendiri apapun statusnya (pending/approved/rejected)
      const data = await d1Api.getListings({ owner: user.uid, status: 'all' });
      setListings(data);
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
      await d1Api.deleteListing(id);
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
          const statusInfo = STATUS_LABELS[listing.status] || STATUS_LABELS.pending;
          return (
            <div key={listing.id} className="overflow-hidden rounded-2xl border border-line bg-paper">
              <Link to={`/id/${listing.id}`} className="relative block">
                <ImageSlider images={listing.images} alt={listing.kecamatan} rounded="rounded-none" />
                <span
                  className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}
                >
                  {statusInfo.text}
                </span>
              </Link>
              <div className="p-3 sm:p-4">
                <Link to={`/id/${listing.id}`} className="block">
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="font-display text-base font-semibold text-navy sm:text-xl">
                      {formatRupiahShort(listing.price)}
                    </span>
                    {listing.cicilanPerBulan ? (
                      <span className="text-xs text-ink/50 sm:text-sm">· {formatMonthlyShort(listing.cicilanPerBulan)}</span>
                    ) : null}
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
