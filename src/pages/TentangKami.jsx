import React from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

export default function TentangKami() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Seo
        title="Tentang Kami"
        description="Rauma adalah platform jual beli rumah KPR yang mudah dan gratis untuk seluruh masyarakat Indonesia."
        path="/tentang-kami"
      />

      <h1 className="font-display text-3xl font-semibold text-navy">Tentang Kami</h1>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-ink/80">
        <p>
          Rauma.id hadir sebagai platform jual beli rumah yang mudah dan gratis untuk
          seluruh masyarakat Indonesia. Kami percaya proses mencari atau menjual rumah
          seharusnya sederhana, transparan, dan bisa diakses siapa saja tanpa biaya.
        </p>

        <p>
          Lewat Rauma, penjual perorangan maupun pengembang perumahan bisa memasang
          iklan rumahnya secara gratis, sementara pencari rumah bisa menjelajahi
          berbagai pilihan hunian — mulai dari rumah pribadi, rumah subsidi, rumah
          take over KPR, hingga listing dari perumahan resmi — semua dalam satu tempat.
        </p>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy">Yang Kami Tawarkan</h2>
          <ul className="mt-3 space-y-2">
            <li>🏠 Pasang iklan rumah gratis, tanpa biaya tersembunyi</li>
            <li>📍 Pencarian rumah berdasarkan lokasi terdekat</li>
            <li>💰 Kategori khusus rumah termurah, termahal, dan subsidi</li>
            <li>🔄 Listing rumah take over KPR bagi yang ingin oper-alihkan cicilan</li>
            <li>📊 Simulasi tabungan untuk membantu rencana pembelian rumah</li>
          </ul>
        </div>

        <p>
          Kami terus mengembangkan Rauma agar makin membantu masyarakat Indonesia
          menemukan hunian yang tepat, sesuai kebutuhan dan kemampuan masing-masing.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-white p-5">
        <p className="text-sm text-ink/70">
          Punya pertanyaan atau ingin kerja sama dengan kami?
        </p>
        <Link to="/" className="mt-2 inline-block text-sm font-semibold text-forest underline">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

