import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { d1Api } from '../lib/d1Api';

/**
 * Tombol simpan (bookmark) listing, dipakai mengambang di pojok foto
 * halaman detail (bukan di ListingCard). Berlaku untuk semua jenis akun
 * (user biasa, premium, admin) -- yang penting sudah login.
 */
export default function SaveButton({ listingId, className = '' }) {
  const { user, loginWithGoogle } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user || !listingId) return;
    d1Api.isListingSaved(user.uid, listingId).then((value) => {
      if (!cancelled) setSaved(value);
    });
    return () => {
      cancelled = true;
    };
  }, [user, listingId]);

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);

    try {
      let currentUser = user;
      if (!currentUser) {
        currentUser = await loginWithGoogle();
      }
      if (!currentUser?.uid) return;

      if (saved) {
        await d1Api.unsaveListing(currentUser.uid, listingId);
        setSaved(false);
      } else {
        await d1Api.saveListing(currentUser.uid, listingId);
        setSaved(true);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 900);
      }
    } catch (err) {
      console.error('Gagal menyimpan listing:', err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? 'Hapus dari daftar simpanan' : 'Simpan listing ini'}
      title={saved ? 'Tersimpan' : 'Simpan'}
      className={`group flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-lg backdrop-blur transition-transform hover:scale-105 active:scale-90 disabled:opacity-60 ${
        justSaved ? 'scale-110' : ''
      } ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-5 w-5 transition-all duration-200 ${
          saved ? 'scale-110 fill-red-500 stroke-red-500' : 'fill-none stroke-ink/60 group-hover:stroke-red-500'
        }`}
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    </button>
  );
}

