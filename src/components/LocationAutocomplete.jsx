import React, { useEffect, useRef, useState } from 'react';
import { searchWilayah, geocodeWilayah, ensureBackgroundPrefetch, isDistrictsFullyLoaded } from '../lib/wilayahIndonesia';

/**
 * Input teks biasa dengan autocomplete lokasi (Kota/Kabupaten - Kecamatan).
 * onSelect menerima { label, kabupaten, kecamatan, lat, lon }.
 */
export default function LocationAutocomplete({ value, onSelect, placeholder }) {
  const [query, setQuery] = useState(value?.label || '');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [stillLoadingDistricts, setStillLoadingDistricts] = useState(false);
  const debounceRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mulai load daftar wilayah di background begitu form ini dibuka --
  // biar udah siap/lebih lengkap saat user mulai ngetik, bukan baru mulai
  // fetch pas user selesai ngetik 3 huruf.
  useEffect(() => {
    ensureBackgroundPrefetch();
  }, []);

  function handleChange(e) {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchWilayah(q);
        setOptions(results);
        // Kalau belum ada hasil kecamatan sama sekali DAN data kecamatan
        // masih proses loading di background, kemungkinan besar bukan
        // "gak ada" tapi "belum sempat ke-load" -- tunggu bentar terus
        // coba ulang otomatis sekali.
        const hasKecamatan = results.some((r) => r.kecamatan);
        if (!hasKecamatan && !isDistrictsFullyLoaded()) {
          setStillLoadingDistricts(true);
          setTimeout(async () => {
            const retryResults = await searchWilayah(q);
            setOptions(retryResults);
            setStillLoadingDistricts(false);
          }, 2500);
        } else {
          setStillLoadingDistricts(false);
        }
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  async function handlePick(opt) {
    setQuery(opt.label);
    setOpen(false);
    setResolving(true);
    // Cari koordinat baru SEKARANG (sekali saja), setelah lokasi resmi
    // dipilih -- bukan di setiap ketikan seperti sebelumnya.
    let coords = null;
    try {
      coords = await geocodeWilayah(opt);
    } finally {
      setResolving(false);
    }
    onSelect?.({ ...opt, lat: coords?.lat ?? null, lon: coords?.lon ?? null });
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => query.length >= 3 && setOpen(true)}
        placeholder={resolving ? 'Menyimpan lokasi...' : placeholder || 'Cari Kecamatan...'}
        disabled={resolving}
        className="w-full rounded-xl border border-line bg-white px-4 py-3 text-ink placeholder:text-ink/40 outline-none focus:border-forest disabled:bg-cream disabled:text-ink/40"
        autoComplete="off"
      />
      {open && (query.length >= 3) && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-line bg-white shadow-lg max-h-64 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-ink/50">Mencari lokasi...</div>
          )}
          {!loading && options.length === 0 && (
            <div className="px-4 py-3 text-sm text-ink/50">Lokasi tidak ditemukan.</div>
          )}
          {!loading &&
            options.map((opt, idx) => (
              <button
                type="button"
                key={`${opt.label}-${idx}`}
                onClick={() => handlePick(opt)}
                className="flex w-full items-start gap-2 px-4 py-3 text-left text-sm hover:bg-cream"
              >
                <span aria-hidden className="mt-0.5 text-forest">📍</span>
                <span>
                  <span className="block font-medium text-ink">{opt.kecamatan || opt.kabupaten}</span>
                  {opt.kecamatan && (
                    <span className="block text-xs text-ink/50">{opt.kabupaten}</span>
                  )}
                </span>
              </button>
            ))}
          {!loading && stillLoadingDistricts && (
            <div className="border-t border-line px-4 py-2 text-xs text-ink/40">
              Masih memuat data kecamatan, kecamatan yang kamu cari mungkin belum muncul. Tunggu sebentar...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
