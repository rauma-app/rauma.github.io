import React, { useEffect, useRef, useState } from 'react';
import { searchLocation } from '../lib/nominatim';

/**
 * Input teks biasa dengan autocomplete lokasi (Kota/Kabupaten - Kecamatan).
 * onSelect menerima { label, kabupaten, kecamatan, lat, lon }.
 */
export default function LocationAutocomplete({ value, onSelect, placeholder }) {
  const [query, setQuery] = useState(value?.label || '');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleChange(e) {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await searchLocation(q);
      setOptions(results);
      setLoading(false);
    }, 400);
  }

  function handlePick(opt) {
    setQuery(opt.label);
    setOpen(false);
    onSelect?.(opt);
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => query.length >= 3 && setOpen(true)}
        placeholder={placeholder || 'Cari Kota/Kabupaten atau Kecamatan...'}
        className="w-full rounded-xl border border-line bg-white px-4 py-3 text-ink placeholder:text-ink/40 outline-none focus:border-forest"
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
        </div>
      )}
    </div>
  );
}
