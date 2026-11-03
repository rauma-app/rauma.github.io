import React, { useEffect, useRef, useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

// Dropdown yang isinya kotak centang (boleh pilih lebih dari satu).
// Tampilannya seperti <select> biasa: tombol menampilkan pilihan yang sedang
// aktif, klik untuk membuka daftar. Daftar tetap terbuka saat mencentang,
// tutup dengan tombol "Selesai", klik di luar, atau tombol Esc.
export default function CheckboxDropdown({ options, selected, onToggle, placeholder = 'Pilih', summary }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const text = summary || (selected.length > 0 ? selected.join(' & ') : '');

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input flex w-full items-center justify-between gap-2 text-left"
      >
        <span className={`min-w-0 truncate ${text ? 'text-ink' : 'text-ink/40'}`}>{text || placeholder}</span>
        {open ? (
          <FaChevronUp className="shrink-0 text-ink/50" size={12} />
        ) : (
          <FaChevronDown className="shrink-0 text-ink/50" size={12} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((o) => {
              const checked = selected.includes(o);
              return (
                <label
                  key={o}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm ${
                    checked ? 'bg-forest/10 font-medium text-navy' : 'text-ink/80 hover:bg-cream'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(o)}
                    className="h-4 w-4 shrink-0 accent-forest"
                  />
                  {o}
                </label>
              );
            })}
          </div>
          <div className="border-t border-line p-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-lg bg-navy py-2 text-sm font-semibold text-white"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
