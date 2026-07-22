import React from 'react';

// Data dirangkum dari berbagai sumber publik (situs resmi bank & portal properti),
// per Mei 2026. Margin/bunga KPR sering berubah dan promo biasanya berlaku syarat
// tertentu (developer rekanan, periode terbatas, dsb) - selalu cek ke bank terkait
// sebelum mengajukan. Update berkala data di bawah ini kalau ada info lebih baru.
const BANKS = [
  {
    name: 'Bank Syariah Indonesia (BSI)',
    rate: '2,55% - 9%',
    note: 'Promo margin berjenjang mulai 2,55% di tahun pertama (developer rekanan tertentu). Skema reguler/umum sekitar 6-9%.',
    tenor: 'Hingga 30 tahun (khusus BSI Griya Simuda)',
  },
  {
    name: 'Bank Muamalat',
    rate: '3,99% - 6,99%',
    note: 'Margin mulai 3,99% untuk rumah baru (primary), 6,99% untuk rumah second (secondary).',
    tenor: 'Hingga 20 tahun',
  },
  {
    name: 'BTN Syariah',
    rate: 'Bervariasi',
    note: 'Spesialis pembiayaan rumah subsidi maupun non-subsidi, DP mulai 1% untuk program tertentu, kerja sama luas dengan developer.',
    tenor: 'Hingga 20 tahun',
  },
  {
    name: 'BCA Syariah',
    rate: '7,25% - 9,25%',
    note: 'Pembiayaan mulai dari Rp100 juta, margin berjenjang.',
    tenor: 'Sesuai kesepakatan',
  },
];

export default function KPRSyariahPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-navy">KPR Syariah</h1>
      <p className="mt-2 text-sm text-ink/60">
        Rangkuman margin/bunga KPR syariah dari beberapa bank di Indonesia, diurutkan dari yang
        paling rendah. Ini bukan kalkulator — kalau mau hitung cicilan rumah tertentu, buka
        halaman rumahnya lalu pakai Estimasi Cicilan di sana.
      </p>

      <div className="mt-6 space-y-4">
        {BANKS.map((bank) => (
          <div key={bank.name} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-lg font-semibold text-navy">{bank.name}</h2>
              <span className="whitespace-nowrap font-display text-lg font-bold text-forest">{bank.rate}</span>
            </div>
            <p className="mt-1 text-sm text-ink/70">{bank.note}</p>
            <p className="mt-1 text-xs text-ink/40">Tenor: {bank.tenor}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-cream p-4 text-xs text-ink/50">
        <p>
          <strong>Catatan penting:</strong> Angka di atas adalah rangkuman indikatif per Mei 2026
          dari sumber publik, bukan penawaran resmi. Margin promo (misalnya rate tahun pertama)
          biasanya tidak sama dengan margin reguler tahun-tahun berikutnya, dan syarat berbeda
          tiap bank/developer. Selalu konfirmasi angka terbaru langsung ke bank terkait sebelum
          mengajukan KPR.
        </p>
      </div>
    </div>
  );
}
