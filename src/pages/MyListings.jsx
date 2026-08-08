import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { d1Api } from '../lib/d1Api';
import { useAuth } from '../context/AuthContext';
import ImageSlider from '../components/ImageSlider';
import { formatMonthlyShort, formatRupiahShort } from '../lib/kpr';
import { isAdmin } from '../lib/admin';
import { isPremium } from '../lib/premium';

const STATUS_LABELS = {
  pending: { text: 'Menunggu Persetujuan', className: 'bg-amber-100 text-amber-700' },
  approved: { text: 'Tayang', className: 'bg-forest/10 text-forest' },
  rejected: { text: 'Ditolak', className: 'bg-red-100 text-red-600' },
  sold: { text: 'Terjual', className: 'bg-slate-200 text-slate-600' },
};

export default function MyListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Menu "Hapus" versi lengkap (Sudah Terjual / Hapus Saja) cuma buat
  // premium & admin -- sesuai fitur statistik "unit terjual" yang juga
  // cuma tampil di profil mereka. User biasa tetap "Hapus" polos.
  const canTrackSold = isAdmin(user) || isPremium(user);

  // activeListing = listing yang sedang dibuka menu Hapus-nya.
  // step: 'menu' (pilih Sudah Terjual / Hapus Saja) atau 'qty' (isi jumlah unit, khusus perumahan)
  const [activeListing, setActiveListing] = useState(null);
  const [step, setStep] = useState('menu');
  const [soldQty, setSoldQty] = useState('1');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      // status: 'all' -> tampilkan punya sendiri apapun statusnya (pending/approved/rejected/sold)
      const data = await d1Api.getListings({ owner: user.uid, status: 'all' });
      setListings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function closeMenu() {
    setActiveListing(null);
    setStep('menu');
    setSoldQty('1');
  }

  async function handleDeleteOnly(id) {
    setDeletingId(id);
    try {
      await d1Api.deleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus iklan. Coba lagi ya.');
    } finally {
      setDeletingId(null);
      closeMenu();
    }
  }

  // Untuk user biasa (bukan premium/admin): tombol Hapus langsung konfirmasi,
  // tanpa opsi "Sudah Terjual" -- perilaku sama seperti sebelumnya.
  async function handleSimpleDelete(id) {
    const confirmed = window.confirm('Yakin mau hapus iklan ini? Tindakan ini tidak bisa dibatalkan.');
    if (!confirmed) return;
    handleDeleteOnly(id);
  }

  function getUnitTersedia(listing) {
    const n = Number(listing.unitTersedia);
    return Number.isFinite(n) ? n : null;
  }

  function isMultiUnit(listing) {
    const n = getUnitTersedia(listing);
    return n !== null && n > 1;
  }

  function openSoldFlow(listing) {
    if (isMultiUnit(listing)) {
      setSoldQty('1');
      setStep('qty');
    } else {
      handleMarkSold(listing, 1);
    }
  }

  async function handleMarkSold(listing, amount) {
    setProcessingId(listing.id);
    try {
      const res = await d1Api.markListingSold(listing.id, amount);
      setListings((prev) =>
        prev.map((l) =>
          l.id === listing.id
            ? {
                ...l,
                status: res.newStatus || l.status,
                unitTersedia: res.newUnitTersedia != null ? res.newUnitTersedia : l.unitTersedia,
              }
            : l
        )
      );
    } catch (err) {
      console.error(err);
      alert('Gagal menandai terjual. Coba lagi ya.');
    } finally {
      setProcessingId(null);
      closeMenu();
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
          const isSold = listing.status === 'sold';
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

                {isSold ? (
                  // Riwayat -- sudah terjual, cuma sisa opsi hapus dari riwayat.
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteOnly(listing.id)}
                      disabled={deletingId === listing.id}
                      className="w-full rounded-full border border-line py-1.5 text-center text-xs font-semibold text-ink/50 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                    >
                      {deletingId === listing.id ? 'Menghapus...' : 'Hapus dari riwayat'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Link
                      to={`/posting/${listing.id}`}
                      className="flex-1 rounded-full border border-line py-1.5 text-center text-xs font-semibold text-ink hover:border-forest hover:text-forest"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        canTrackSold ? setActiveListing(listing) : handleSimpleDelete(listing.id)
                      }
                      disabled={deletingId === listing.id || processingId === listing.id}
                      className="flex-1 rounded-full border border-red-200 py-1.5 text-center text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === listing.id ? 'Menghapus...' : 'Hapus'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Popup "Hapus" khusus premium/admin: pilih Sudah Terjual atau Hapus Saja */}
      {activeListing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={closeMenu}>
          <div
            className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {step === 'menu' && (
              <>
                <h3 className="font-display text-lg font-semibold text-navy">Hapus Iklan</h3>
                <p className="mt-1 text-sm text-ink/50">Rumah ini kenapa mau dihapus?</p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => openSoldFlow(activeListing)}
                    disabled={processingId === activeListing.id}
                    className="rounded-full bg-forest py-2.5 text-sm font-semibold text-white hover:bg-forest/90 disabled:opacity-50"
                  >
                    {processingId === activeListing.id ? 'Menyimpan...' : 'Sudah Terjual'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const confirmed = window.confirm('Yakin mau hapus iklan ini tanpa dicatat sebagai terjual?');
                      if (confirmed) handleDeleteOnly(activeListing.id);
                    }}
                    disabled={deletingId === activeListing.id}
                    className="rounded-full border border-red-200 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === activeListing.id ? 'Menghapus...' : 'Hapus Saja'}
                  </button>
                  <button type="button" onClick={closeMenu} className="py-2.5 text-sm text-ink/50">
                    Batal
                  </button>
                </div>
              </>
            )}

            {step === 'qty' && (
              <>
                <h3 className="font-display text-lg font-semibold text-navy">Berapa Unit yang Terjual?</h3>
                <p className="mt-1 text-sm text-ink/50">
                  Sisa unit saat ini: {getUnitTersedia(activeListing)}. Iklan akan tetap tayang selama masih ada sisa unit.
                </p>
                <input
                  type="number"
                  min={1}
                  max={getUnitTersedia(activeListing)}
                  value={soldQty}
                  onChange={(e) => setSoldQty(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm"
                />
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const max = getUnitTersedia(activeListing) || 1;
                      const qty = Math.min(Math.max(Math.floor(Number(soldQty) || 1), 1), max);
                      handleMarkSold(activeListing, qty);
                    }}
                    disabled={processingId === activeListing.id}
                    className="rounded-full bg-forest py-2.5 text-sm font-semibold text-white hover:bg-forest/90 disabled:opacity-50"
                  >
                    {processingId === activeListing.id ? 'Menyimpan...' : 'Tandai Terjual'}
                  </button>
                  <button type="button" onClick={closeMenu} className="py-2.5 text-sm text-ink/50">
                    Batal
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
