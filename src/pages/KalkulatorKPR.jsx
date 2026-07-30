import React, { useMemo, useState } from 'react';
import Seo from '../components/Seo';
import { formatRupiah, formatRupiahShort } from '../lib/kpr';

const FLAT_INTEREST_RATE = 6; // % per tahun, flat

const PRICE_MIN = 70_000_000;
const PRICE_MAX = 1_500_000_000;
const PRICE_STEP = 10_000_000;

const DP_MIN = 0;
const DP_MAX = 50;

const TENOR_MIN = 1;
const TENOR_MAX = 30;

const IDEAL_RATIO = 0.3; // cicilan idealnya maks 30% dari penghasilan

// Mencegah browser (terutama di HP) auto-scroll ke elemen slider saat
// mendapat fokus setelah selesai digeser.
function blurOnRelease(e) {
  e.target.blur();
}

function calculateFlatKPR(price, dpPercent, tenorYears, ratePercent) {
  const dpAmount = (price * dpPercent) / 100;
  const principal = price - dpAmount;
  const months = tenorYears * 12;
  const totalInterest = principal * (ratePercent / 100) * tenorYears;
  const totalPayment = principal + totalInterest;
  const monthlyInstallment = months > 0 ? totalPayment / months : 0;
  return { dpAmount, principal, totalInterest, monthlyInstallment };
}

export default function KalkulatorKPR() {
  const [price, setPrice] = useState(300_000_000);
  const [dpPercent, setDpPercent] = useState(10);
  const [tenorYears, setTenorYears] = useState(15);
  const [income, setIncome] = useState(''); // disimpan sebagai digit mentah, tampil dengan titik

  const result = useMemo(
    () => calculateFlatKPR(price, dpPercent, tenorYears, FLAT_INTEREST_RATE),
    [price, dpPercent, tenorYears]
  );

  const incomeNumber = Number(income) || 0;
  const ratio = incomeNumber > 0 ? result.monthlyInstallment / incomeNumber : null;
  const isSafe = ratio != null ? ratio <= IDEAL_RATIO : null;

  function handleIncomeChange(e) {
    const digits = e.target.value.replace(/\D/g, '');
    setIncome(digits);
  }

  const incomeDisplay = income ? Number(income).toLocaleString('id-ID') : '';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Seo
        title="Kalkulator KPR"
        description="Simulasikan cicilan KPR rumah berdasarkan harga, uang muka (DP), dan jangka waktu cicilan."
        path="/kalkulator-kpr"
      />

      <h1 className="font-display text-2xl font-semibold text-navy">Kalkulator KPR</h1>

      <div className="mt-6 rounded-2xl border border-line bg-white p-5">
        <p className="section-rule text-xs font-semibold uppercase tracking-wide text-navy">
          Simulasi Cicilan
        </p>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-sm">
              <label htmlFor="price-slider" className="font-medium text-ink">Harga rumah</label>
              <span className="font-semibold text-navy">{formatRupiahShort(price)}</span>
            </div>
            <input
              id="price-slider"
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              onMouseUp={blurOnRelease}
              onTouchEnd={blurOnRelease}
              className="mt-2 w-full accent-forest"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm">
              <label htmlFor="dp-slider" className="font-medium text-ink">Uang muka (DP)</label>
              <span className="text-ink/60">{dpPercent}% &middot; {formatRupiahShort(result.dpAmount)}</span>
            </div>
            <input
              id="dp-slider"
              type="range"
              min={DP_MIN}
              max={DP_MAX}
              step={1}
              value={dpPercent}
              onChange={(e) => setDpPercent(Number(e.target.value))}
              onMouseUp={blurOnRelease}
              onTouchEnd={blurOnRelease}
              className="mt-2 w-full accent-forest"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm">
              <label htmlFor="tenor-slider" className="font-medium text-ink">Jangka waktu cicilan</label>
              <span className="text-ink/60">{tenorYears} tahun</span>
            </div>
            <input
              id="tenor-slider"
              type="range"
              min={TENOR_MIN}
              max={TENOR_MAX}
              step={1}
              value={tenorYears}
              onChange={(e) => setTenorYears(Number(e.target.value))}
              onMouseUp={blurOnRelease}
              onTouchEnd={blurOnRelease}
              className="mt-2 w-full accent-forest"
            />
          </div>
        </div>

        <div className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between text-ink/60">
            <span>Uang muka (DP)</span>
            <span className="font-medium text-ink">{formatRupiah(result.dpAmount)}</span>
          </div>
          <div className="flex justify-between text-ink/60">
            <span>Pokok pinjaman</span>
            <span className="font-medium text-ink">{formatRupiah(result.principal)}</span>
          </div>
          <div className="flex justify-between text-ink/60">
            <span>Bunga flat {FLAT_INTEREST_RATE}%/tahun</span>
            <span className="font-medium text-ink">{formatRupiah(result.totalInterest)}</span>
          </div>
          <div className="flex justify-between pt-2 text-base">
            <span className="font-semibold text-ink">Estimasi cicilan/bulan</span>
            <span className="font-display text-xl font-bold text-navy">
              {formatRupiah(result.monthlyInstallment)}
            </span>
          </div>
        </div>
      </div>

      {/* Cek keterjangkauan */}
      <div className="mt-4 rounded-2xl border border-line bg-white p-5">
        <p className="text-sm font-semibold text-ink">Cek Keterjangkauan Cicilan</p>
        <p className="mt-1 text-xs text-ink/60">
          Pastikan cicilan rumahmu maksimal {IDEAL_RATIO * 100}% dari penghasilan bulanan, biar
          keuangan tetap sehat.
        </p>
        <div className="mt-3">
          <label htmlFor="income-input" className="text-xs font-medium text-ink">
            Penghasilan bulanan (opsional)
          </label>
          <input
            id="income-input"
            type="text"
            inputMode="numeric"
            value={incomeDisplay}
            onChange={handleIncomeChange}
            placeholder="Contoh: 8.000.000"
            className="mt-1 w-full rounded-xl border border-line bg-cream px-4 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
          />
        </div>

        {ratio != null && (
          <div
            className={`mt-3 rounded-xl p-3 text-sm ${
              isSafe ? 'bg-forest/10 text-forest' : 'bg-red-50 text-red-600'
            }`}
          >
            Cicilan ini setara <strong>{Math.round(ratio * 100)}%</strong> dari penghasilanmu.{' '}
            {isSafe
              ? 'Masih dalam batas aman 👍'
              : `Sebaiknya perbesar DP, perpanjang tenor, atau pilih rumah dengan harga lebih rendah agar tidak memberatkan.`}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-cream p-4 text-xs text-ink/50">
        <strong>Catatan:</strong> Angka di atas hanya estimasi. Setiap bank memberikan skema
        bunga dan persentase yang berbeda-beda, jadi anggap ini sebagai gambaran awal saja,
        bukan penawaran resmi.
      </div>
    </div>
  );
}
