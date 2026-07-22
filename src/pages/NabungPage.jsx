import React, { useMemo, useState } from 'react';

// GANTI dengan kode referral Bibit asli kamu.
const BIBIT_REFERRAL_CODE = 'GANTI_KODE_REFERRAL_BIBIT';
const ASSUMED_ANNUAL_RETURN = 15; // % per tahun, ilustratif

const MONTHLY_MIN = 100_000;
const MONTHLY_MAX = 10_000_000;
const MONTHLY_STEP = 50_000;

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateCompoundInvestment(monthly, years, annualReturnPercent) {
  const months = years * 12;
  const r = annualReturnPercent / 100 / 12;
  // Future value dari setoran rutin bulanan (ordinary annuity, compounding tiap bulan)
  const futureValue = r === 0 ? monthly * months : monthly * ((Math.pow(1 + r, months) - 1) / r);
  const totalInvested = monthly * months;
  const profit = futureValue - totalInvested;
  return { futureValue, totalInvested, profit };
}

export default function NabungPage() {
  const [monthly, setMonthly] = useState(500_000);
  const [years, setYears] = useState(10);
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () => calculateCompoundInvestment(monthly, years, ASSUMED_ANNUAL_RETURN),
    [monthly, years]
  );

  async function handleCopyReferral() {
    try {
      await navigator.clipboard.writeText(BIBIT_REFERRAL_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API mungkin gak didukung, biarin user copy manual
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-navy">Nabung, Bukan Ngutang</h1>
      <p className="mt-2 text-sm text-ink/60">
        Sebelum buru-buru ambil KPR, coba pertimbangkan: menabung rutin di Reksadana Syariah bisa
        jadi cara membangun modal DP rumah (atau bahkan beli rumah cash) tanpa beban cicilan
        bertahun-tahun.
      </p>

      {/* Referral Bibit */}
      <div className="mt-6 rounded-2xl border border-line bg-white p-5">
        <p className="text-sm font-semibold text-ink">Mulai Investasi di Bibit</p>
        <p className="mt-1 text-sm text-ink/60">
          Pakai kode referral berikut saat daftar akun Bibit baru:
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 rounded-xl border border-line bg-cream px-4 py-2.5 text-sm font-semibold text-navy">
            {BIBIT_REFERRAL_CODE}
          </code>
          <button
            onClick={handleCopyReferral}
            className="rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark"
          >
            {copied ? 'Tersalin!' : 'Salin'}
          </button>
        </div>
      </div>

      {/* Kalkulator */}
      <div className="mt-6 rounded-2xl border border-line bg-white p-5">
        <p className="section-rule text-xs font-semibold uppercase tracking-wide text-navy">
          Simulasi Investasi Reksadana Syariah
        </p>

        <div className="space-y-5">
          <div>
            <div className="flex justify-between text-sm">
              <label htmlFor="monthly-slider" className="font-medium text-ink">Nabung per bulan</label>
              <span className="text-ink/60">{formatRupiah(monthly)}</span>
            </div>
            <input
              id="monthly-slider"
              type="range"
              min={MONTHLY_MIN}
              max={MONTHLY_MAX}
              step={MONTHLY_STEP}
              value={monthly}
              onChange={(e) => setMonthly(Number(e.target.value))}
              className="mt-2 w-full accent-forest"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm">
              <label htmlFor="years-slider" className="font-medium text-ink">Jangka waktu</label>
              <span className="text-ink/60">{years} tahun</span>
            </div>
            <input
              id="years-slider"
              type="range"
              min={1}
              max={30}
              step={1}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="mt-2 w-full accent-forest"
            />
          </div>
        </div>

        <div className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between text-ink/60">
            <span>Total setoran</span>
            <span className="font-medium text-ink">{formatRupiah(result.totalInvested)}</span>
          </div>
          <div className="flex justify-between text-ink/60">
            <span>Estimasi keuntungan</span>
            <span className="font-medium text-forest">{formatRupiah(result.profit)}</span>
          </div>
          <div className="flex justify-between pt-2 text-base">
            <span className="font-semibold text-ink">Estimasi nilai akhir</span>
            <span className="font-display text-xl font-bold text-navy">
              {formatRupiah(result.futureValue)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-cream p-4 text-xs text-ink/50">
        <strong>Penting:</strong> Asumsi return {ASSUMED_ANNUAL_RETURN}%/tahun di atas adalah
        ilustrasi untuk simulasi, <strong>bukan jaminan hasil investasi</strong>. Reksadana
        (termasuk Reksadana Syariah) nilainya bisa naik-turun mengikuti kondisi pasar, dan hasil
        sebenarnya bisa lebih tinggi maupun lebih rendah dari simulasi ini. Pelajari profil
        risiko produknya sebelum berinvestasi.
      </div>
    </div>
  );
}
