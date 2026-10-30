import React from 'react';

// Nomor halaman ringkas: ‹ 1 … 4 5 6 … 9 ›
// Maksimal 5 nomor + 2 titik-titik, muat di layar HP (tombol 32px).
function buildItems(page, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 3) return [1, 2, 3, 4, '…', total];
  if (page >= total - 2) return [1, '…', total - 3, total - 2, total - 1, total];
  return [1, '…', page - 1, page, page + 1, '…', total];
}

export default function Pagination({ page, totalPages, onChange, disabled = false }) {
  if (!totalPages || totalPages <= 1) return null;

  const items = buildItems(page, totalPages);
  const base =
    'flex h-8 min-w-[2rem] items-center justify-center rounded-full px-2 text-sm font-medium transition-colors';

  return (
    <nav aria-label="Halaman" className="mt-8 flex flex-wrap items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Halaman sebelumnya"
        className={`${base} text-navy hover:bg-navy/10 disabled:opacity-30 disabled:hover:bg-transparent`}
      >
        ‹
      </button>

      {items.map((item, i) =>
        item === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-ink/40" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => item !== page && onChange(item)}
            disabled={disabled}
            aria-label={`Halaman ${item}`}
            aria-current={item === page ? 'page' : undefined}
            className={`${base} ${
              item === page ? 'bg-navy text-white' : 'text-navy hover:bg-navy/10'
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Halaman berikutnya"
        className={`${base} text-navy hover:bg-navy/10 disabled:opacity-30 disabled:hover:bg-transparent`}
      >
        ›
      </button>
    </nav>
  );
}
