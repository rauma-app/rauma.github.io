import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-16 bg-navy py-10 text-cream/80">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>🏠</span>
          <span className="font-display text-2xl font-bold text-white">RAUMA</span>
        </div>
        <p className="mt-3 max-w-md text-sm">
          Rauma.id adalah platform jual beli rumah KPR yang mudah dan gratis untuk seluruh masyarakat Indonesia.
        </p>
      </div>
    </footer>
  );
}
