import React, { useState, useRef, useEffect } from 'react';

// Ikon "i" bulat kecil di sebelah label field. Di-tap (bukan hover, biar
// enak dipakai di HP) buat munculin balon info singkat, tap lagi/di luar
// buat nutup.
export default function InfoTip({ text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('mousedown', handleOutside);
    return () => {
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Info"
        className="ml-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-ink/70 text-[10px] font-bold leading-none text-ink/80 hover:border-forest hover:text-forest"
      >
        i
      </button>
      {open && (
        <span className="absolute left-0 top-full z-20 mt-1.5 w-56 max-w-[80vw] rounded-lg bg-navy px-3 py-2 text-xs font-normal leading-snug text-white shadow-lg">
          {text}
          <span className="absolute -top-1 left-2 h-2 w-2 rotate-45 bg-navy" />
        </span>
      )}
    </span>
  );
}
