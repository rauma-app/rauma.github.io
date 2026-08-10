import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { d1Api } from '../lib/d1Api';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import { isAdmin } from '../lib/admin';
import ImageSlider from '../components/ImageSlider';
import { formatRupiah } from '../lib/kpr';

export default function AdminPending() {
  const { user, loading: authLoading } = useAuth();
  const { premiumMap, perumahanAdminMap, refresh: refreshRoles } = usePremium();
  const [pending, setPending] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  // Form tambah akun Premium baru
  const [newUid, setNewUid] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [premiumBusy, setPremiumBusy] = useState(false);

  // Form tambah akun Admin Perumahan baru
  const [newPaUid, setNewPaUid] = useState('');
  const [newPaLabel, setNewPaLabel] = useState('');
  const [perumahanAdminBusy, setPerumahanAdminBusy] = useState(false);

  useEffect(() => {
    if (!user || !isAdmin(user)) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const [pendingData, allData] = await Promise.all([
        d1Api.getListings({ status: 'pending' }),
        d1Api.getListings({ status: 'all' }), // admin bisa lihat semua iklan apapun statusnya
      ]);
      setPending(pendingData);
      setAllListings(allData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteListing(id) {
    const confirmed = window.confirm('Yakin mau hapus iklan ini? Tindakan ini tidak bisa dibatalkan.');
    if (!confirmed) return;

    setBusyId(id);
    try {
      await d1Api.deleteListing(id);
      setAllListings((prev) => prev.filter((l) => l.id !== id));
      setPending((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus iklan. Coba lagi ya.');
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(id, status) {
    setBusyId(id);
    try {
      await d1Api.updateListingStatus(id, status);
      setPending((prev) => prev.filter((l) => l.id !== id));
      setAllListings((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui status. Coba lagi ya.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddPremium(e) {
    e.preventDefault();
    const uid = newUid.trim();
    if (!uid) return;
    setPremiumBusy(true);
    try {
      await d1Api.addPremiumAccount(uid, newLabel.trim());
      await refreshRoles();
      setNewUid('');
      setNewLabel('');
    } catch (err) {
      console.error(err);
      alert('Gagal menambah akun Premium. Coba lagi ya.');
    } finally {
      setPremiumBusy(false);
    }
  }

  async function handleRemovePremium(uid) {
    const confirmed = window.confirm(`Cabut status Premium buat akun ini? (UID: ${uid})`);
    if (!confirmed) return;
    setPremiumBusy(true);
    try {
      await d1Api.removePremiumAccount(uid);
      await refreshRoles();
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus akun Premium. Coba lagi ya.');
    } finally {
      setPremiumBusy(false);
    }
  }

  async function handleAddPerumahanAdmin(e) {
    e.preventDefault();
    const uid = newPaUid.trim();
    if (!uid) return;
    setPerumahanAdminBusy(true);
    try {
      await d1Api.addPerumahanAdmin(uid, newPaLabel.trim());
      await refreshRoles();
      setNewPaUid('');
      setNewPaLabel('');
    } catch (err) {
      console.error(err);
      alert('Gagal menambah akun Admin Perumahan. Coba lagi ya.');
    } finally {
      setPerumahanAdminBusy(false);
    }
  }

  async function handleRemovePerumahanAdmin(uid) {
    const confirmed = window.confirm(`Cabut status Admin Perumahan buat akun ini? (UID: ${uid})`);
    if (!confirmed) return;
    setPerumahanAdminBusy(true);
    try {
      await d1Api.removePerumahanAdmin(uid);
      await refreshRoles();
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus akun Admin Perumahan. Coba lagi ya.');
    } finally {
      setPerumahanAdminBusy(false);
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
            <ImageSlider images={listing.images} alt={listing.kecamatan} ratio="4 / 5" rounded="rounded-none" />
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

      <h2 className="mt-12 font-display text-xl font-semibold text-navy">Kelola Premium</h2>
      <p className="mt-1 text-sm text-ink/50">
        Tambah/hapus akun Premium (ceklis biru) langsung dari sini, tanpa perlu edit kode. Cara dapat UID akun:
        Firebase Console → Authentication → tab Users → copy kolom User UID.
      </p>

      <form onSubmit={handleAddPremium} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="UID akun Google"
          value={newUid}
          onChange={(e) => setNewUid(e.target.value)}
          className="flex-1 rounded-full border border-line px-4 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Label (opsional, buat catatan internal)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="flex-1 rounded-full border border-line px-4 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={premiumBusy || !newUid.trim()}
          className="rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-dark disabled:opacity-50"
        >
          + Tambah
        </button>
      </form>

      <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white">
        {Object.keys(premiumMap).length === 0 && (
          <p className="p-4 text-sm text-ink/50">Belum ada akun Premium.</p>
        )}
        {Object.entries(premiumMap).map(([uid, label]) => (
          <div key={uid} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy">{label || '(tanpa label)'}</p>
              <p className="truncate text-xs text-ink/40">{uid}</p>
            </div>
            <button
              type="button"
              onClick={() => handleRemovePremium(uid)}
              disabled={premiumBusy}
              className="shrink-0 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Hapus
            </button>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-xl font-semibold text-navy">Kelola Admin Perumahan</h2>
      <p className="mt-1 text-sm text-ink/50">
        Akun centang kuning terbatas -- cuma bisa posting kategori Perumahan, menu cuma Posting &amp; Iklan Saya.
        Dipakai sebagai wadah buat banyak nama perumahan (diisi per-listing lewat kolom "Nama Perumahan" di form
        Posting), jadi gak perlu bikin akun Google baru buat tiap perumahan.
      </p>

      <form onSubmit={handleAddPerumahanAdmin} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="UID akun Google"
          value={newPaUid}
          onChange={(e) => setNewPaUid(e.target.value)}
          className="flex-1 rounded-full border border-line px-4 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Label (opsional, buat catatan internal)"
          value={newPaLabel}
          onChange={(e) => setNewPaLabel(e.target.value)}
          className="flex-1 rounded-full border border-line px-4 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={perumahanAdminBusy || !newPaUid.trim()}
          className="rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-dark disabled:opacity-50"
        >
          + Tambah
        </button>
      </form>

      <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white">
        {Object.keys(perumahanAdminMap).length === 0 && (
          <p className="p-4 text-sm text-ink/50">Belum ada akun Admin Perumahan.</p>
        )}
        {Object.entries(perumahanAdminMap).map(([uid, label]) => (
          <div key={uid} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy">{label || '(tanpa label)'}</p>
              <p className="truncate text-xs text-ink/40">{uid}</p>
            </div>
            <button
              type="button"
              onClick={() => handleRemovePerumahanAdmin(uid)}
              disabled={perumahanAdminBusy}
              className="shrink-0 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Hapus
            </button>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-xl font-semibold text-navy">
        Semua Iklan ({allListings.length})
      </h2>
      <p className="mt-1 text-sm text-ink/50">
        Semua iklan di website, apapun statusnya. Admin bisa hapus langsung dari sini.
      </p>

      {!loading && allListings.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-white p-6 text-center">
          <p className="text-ink/60">Belum ada iklan sama sekali.</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {allListings.map((listing) => (
          <div key={listing.id} className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="aspect-square w-full overflow-hidden bg-cream">
              <img
                src={listing.images?.[0]}
                alt={listing.kecamatan}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-2">
              <p className="text-xs font-semibold text-navy">{formatRupiah(listing.price)}</p>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-ink/50">
                {listing.kecamatan ? `${listing.kecamatan} - ` : ''}
                {listing.kabupaten}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink/40">{listing.status}</p>
              <button
                onClick={() => deleteListing(listing.id)}
                disabled={busyId === listing.id}
                className="mt-2 w-full rounded-full border border-red-200 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {busyId === listing.id ? '...' : 'Hapus'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
