import React, { useMemo, useState } from 'react';
import Seo from '../components/Seo';
import { formatRupiah, formatRupiahShort } from '../lib/kpr';
import {
  simulateLoan,
  peakPaymentPerRupiah,
  PRICE_LADDER,
  priceToIndex,
  estimateUpfrontCosts,
} from '../lib/kprCalc';

// Skema pembiayaan. Angka bunga di bawah hanyalah titik awal yang bisa diubah
// pengguna (lihat "Atur bunga"); acuan: promo fixed bank besar ±2,75–3,75%,
// floating ±11–13%, KPR subsidi FLPP 5% tetap (data Agustus–September 2026).
const SCHEMES = {
  bank: { label: 'KPR Bank', desc: 'Bunga fixed beberapa tahun, lalu floating', tenorMin: 5, tenorMax: 30, tenorDefault: 20 },
  subsidi: { label: 'Subsidi FLPP', desc: 'Bunga tetap 5% sampai lunas', tenorMin: 5, tenorMax: 40, tenorDefault: 20 },
  flat: { label: 'Syariah / Flat', desc: 'Cicilan sama tiap bulan', tenorMin: 1, tenorMax: 25, tenorDefault: 15 },
};

const DEFAULT_RATES = { fixedRate: '3.5', fixedYears: '3', floatRate: '11', subsidiRate: '5', flatRate: '6' };

const PRICE_INPUT_MIN = 50_000_000;
const PRICE_INPUT_MAX = 100_000_000_000;

const DP_MAX = 80;

const IDEAL_RATIO = 0.3; // cicilan idealnya maks 30% dari penghasilan
const LIMIT_RATIO = 0.35; // di atas ini dianggap memberatkan

// Mencegah browser (terutama di HP) auto-scroll ke elemen slider saat
// mendapat fokus setelah selesai digeser.
function blurOnRelease(e) {
  e.target.blur();
}

// Kalau ada input lain (misalnya kolom penghasilan) yang masih fokus/keyboard
// masih terbuka, lepas dulu fokusnya sebelum mulai menggeser slider — supaya
// fokus tidak "lompat balik" ke kolom tadi saat slider digeser.
function releaseOtherFocus() {
  if (
    document.activeElement &&
    document.activeElement.tagName !== 'BODY' &&
    typeof document.activeElement.blur === 'function'
  ) {
    document.activeElement.blur();
  }
}

// Angka desimal dari teks yang boleh memakai koma ("3,5" atau "3.5")
function num(text) {
  const n = Number(String(text).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const pct = (n) => String(Math.round(n * 100) / 100).replace('.', ',');

export default function KalkulatorKPR() {
  const [scheme, setScheme] = useState('bank');
  const [price, setPrice] = useState(1_000_000_000);
  const [dpPercent, setDpPercent] = useState(20);
  const [tenorYears, setTenorYears] = useState(20);
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [income, setIncome] = useState(''); // digit mentah, tampil dengan titik
  const [showRates, setShowRates] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const cfg = SCHEMES[scheme];
  const priceSafe = clamp(price || 0, PRICE_INPUT_MIN, PRICE_INPUT_MAX);

  function changeScheme(next) {
    setScheme(next);
    const c = SCHEMES[next];
    setTenorYears((t) => clamp(next === scheme ? t : c.tenorDefault, c.tenorMin, c.tenorMax));
    // DP: subsidi mulai 1%; bank/syariah umumnya minimal 10%
    if (next === 'subsidi') setDpPercent(1);
    else setDpPercent((d) => (d < 10 ? 20 : d));
  }

  function setRate(key, value) {
    setRates((r) => ({ ...r, [key]: value }));
  }

  // Opsi hitung sesuai skema yang dipilih
  const loanOptions = useMemo(() => {
    if (scheme === 'subsidi') return { scheme, fixedRate: clamp(num(rates.subsidiRate), 0, 40) };
    if (scheme === 'flat') return { scheme, flatRate: clamp(num(rates.flatRate), 0, 40) };
    return {
      scheme,
      fixedRate: clamp(num(rates.fixedRate), 0, 40),
      fixedYears: clamp(Math.round(num(rates.fixedYears)), 1, tenorYears),
      floatRate: clamp(num(rates.floatRate), 0, 40),
    };
  }, [scheme, rates, tenorYears]);

  const dpAmount = (priceSafe * dpPercent) / 100;
  const principal = priceSafe - dpAmount;

  const result = useMemo(
    () => simulateLoan({ principal, tenorYears, ...loanOptions }),
    [principal, tenorYears, loanOptions]
  );

  const costs = useMemo(
    () => estimateUpfrontCosts({ price: priceSafe, principal, scheme }),
    [priceSafe, principal, scheme]
  );

  const peakPayment = Math.max(result.firstPayment, result.laterPayment);
  const interestShare = result.totalPaid > 0 ? (result.totalInterest / result.totalPaid) * 100 : 0;

  // ----- Keterjangkauan -----
  const incomeNumber = Number(income) || 0;
  const ratioFirst = incomeNumber > 0 ? result.firstPayment / incomeNumber : null;
  const ratioPeak = incomeNumber > 0 ? peakPayment / incomeNumber : null;
  const level = ratioPeak == null ? null : ratioPeak <= IDEAL_RATIO ? 'safe' : ratioPeak <= LIMIT_RATIO ? 'limit' : 'heavy';

  // Harga maksimal yang terjangkau (cicilan tertinggi ≤ 30% penghasilan)
  const maxAffordablePrice = useMemo(() => {
    if (incomeNumber <= 0 || dpPercent >= 100) return null;
    const perRupiah = peakPaymentPerRupiah({ tenorYears, ...loanOptions });
    if (!perRupiah) return null;
    const maxLoan = (incomeNumber * IDEAL_RATIO) / perRupiah;
    return maxLoan / (1 - dpPercent / 100);
  }, [incomeNumber, dpPercent, tenorYears, loanOptions]);

  function handleIncomeChange(e) {
    setIncome(e.target.value.replace(/\D/g, ''));
  }
  function handlePriceChange(e) {
    const digits = e.target.value.replace(/\D/g, '');
    setPrice(digits ? Number(digits) : 0);
  }

  const incomeDisplay = income ? Number(income).toLocaleString('id-ID') : '';
  const priceDisplay = price ? Number(price).toLocaleString('id-ID') : '';

  const subsidiTooExpensive = scheme === 'subsidi' && priceSafe > 240_000_000;
  const dpTooLow = scheme !== 'subsidi' && dpPercent < 10;

  const rateInput = (id, label, key, suffix) => (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-ink">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={rates[key]}
          onChange={(e) => setRate(key, e.target.value.replace(/[^0-9.,]/g, ''))}
          className="w-full rounded-xl border border-line bg-cream px-3 py-2 pr-9 text-sm text-ink focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink/40">{suffix}</span>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Seo
        title="Kalkulator KPR"
        description="Simulasikan cicilan KPR bank, subsidi FLPP, dan syariah: bunga fixed lalu floating, jadwal angsuran, perkiraan biaya awal, dan harga rumah yang terjangkau."
        path="/kalkulator-kpr"
      />

      <h1 className="font-display text-2xl font-semibold text-navy">Kalkulator KPR</h1>
      <p className="mt-1 text-sm text-ink/60">
        Dari rumah pertama sampai hunian premium. Atur skema, harga, DP, dan tenor.
      </p>

      {/* Pilih skema */}
      <div className="mt-5 grid grid-cols-3 gap-2" role="tablist" aria-label="Skema pembiayaan">
        {Object.entries(SCHEMES).map(([key, s]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={scheme === key}
            onClick={() => changeScheme(key)}
            className={`rounded-xl border px-2 py-2.5 text-center text-sm font-semibold transition ${
              scheme === key ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink/50">{cfg.desc}</p>

      <div className="mt-4 rounded-2xl border border-line bg-white p-5">
        <p className="section-rule text-xs font-semibold uppercase tracking-wide text-navy">Simulasi Cicilan</p>

        <div className="space-y-6">
          {/* Harga */}
          <div>
            <label htmlFor="price-input" className="text-sm font-medium text-ink">
              Harga rumah
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink/50">Rp</span>
              <input
                id="price-input"
                type="text"
                inputMode="numeric"
                value={priceDisplay}
                onChange={handlePriceChange}
                onBlur={() => setPrice(priceSafe)}
                className="w-full rounded-xl border border-line bg-cream py-2.5 pl-11 pr-4 text-base font-semibold text-navy focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
              />
            </div>
            <input
              type="range"
              min={0}
              max={PRICE_LADDER.length - 1}
              step={1}
              value={priceToIndex(priceSafe)}
              onChange={(e) => setPrice(PRICE_LADDER[Number(e.target.value)])}
              onMouseDown={releaseOtherFocus}
              onTouchStart={releaseOtherFocus}
              onMouseUp={blurOnRelease}
              onTouchEnd={blurOnRelease}
              aria-label="Geser harga rumah"
              className="range-input mt-2 w-full accent-forest"
            />
            <div className="flex justify-between text-[11px] text-ink/40">
              <span>Rp 100 Jt</span>
              <span>Rp 50 M</span>
            </div>
            {subsidiTooExpensive && (
              <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                Rumah subsidi FLPP dibatasi harga sekitar Rp 166–240 juta (tergantung zona) dan penghasilan
                maksimal sekitar Rp 8–14 juta. Di atas itu, gunakan skema KPR Bank.
              </p>
            )}
          </div>

          {/* DP */}
          <div>
            <div className="flex justify-between text-sm">
              <label htmlFor="dp-slider" className="font-medium text-ink">
                Uang muka (DP)
              </label>
              <span className="text-ink/60">
                {dpPercent}% &middot; {formatRupiahShort(dpAmount)}
              </span>
            </div>
            <input
              id="dp-slider"
              type="range"
              min={0}
              max={DP_MAX}
              step={1}
              value={dpPercent}
              onChange={(e) => setDpPercent(Number(e.target.value))}
              onMouseDown={releaseOtherFocus}
              onTouchStart={releaseOtherFocus}
              onMouseUp={blurOnRelease}
              onTouchEnd={blurOnRelease}
              className="range-input mt-2 w-full accent-forest"
            />
            {dpTooLow && (
              <p className="text-xs text-amber-700">Bank umumnya meminta DP minimal 10%.</p>
            )}
          </div>

          {/* Tenor */}
          <div>
            <div className="flex justify-between text-sm">
              <label htmlFor="tenor-slider" className="font-medium text-ink">
                Jangka waktu cicilan
              </label>
              <span className="text-ink/60">{tenorYears} tahun</span>
            </div>
            <input
              id="tenor-slider"
              type="range"
              min={cfg.tenorMin}
              max={cfg.tenorMax}
              step={1}
              value={tenorYears}
              onChange={(e) => setTenorYears(Number(e.target.value))}
              onMouseDown={releaseOtherFocus}
              onTouchStart={releaseOtherFocus}
              onMouseUp={blurOnRelease}
              onTouchEnd={blurOnRelease}
              className="range-input mt-2 w-full accent-forest"
            />
            {scheme === 'subsidi' && tenorYears > 20 && (
              <p className="text-xs text-amber-700">
                Tenor subsidi di atas 20 tahun (hingga 40 tahun) baru disetujui pemerintah Juni 2026; aturan
                pelaksanaannya masih berjalan, konfirmasi ke bank penyalur.
              </p>
            )}
          </div>

          {/* Atur bunga */}
          <div>
            <button
              type="button"
              onClick={() => setShowRates((v) => !v)}
              aria-expanded={showRates}
              className="flex w-full items-center justify-between rounded-xl bg-cream px-4 py-2.5 text-left text-sm font-medium text-navy"
            >
              <span>
                Atur bunga{' '}
                <span className="font-normal text-ink/50">
                  {scheme === 'bank'
                    ? `(${pct(loanOptions.fixedRate)}% fixed ${loanOptions.fixedYears} th, lalu ${pct(loanOptions.floatRate)}%)`
                    : scheme === 'subsidi'
                      ? `(${pct(loanOptions.fixedRate)}% tetap)`
                      : `(${pct(loanOptions.flatRate)}% flat/tahun)`}
                </span>
              </span>
              <span className="text-ink/50">{showRates ? '▲' : '▼'}</span>
            </button>
            {showRates && (
              <div className="mt-3">
                {scheme === 'bank' && (
                  <div className="grid grid-cols-3 gap-2">
                    {rateInput('rate-fixed', 'Bunga fixed', 'fixedRate', '%')}
                    {rateInput('rate-years', 'Masa fixed', 'fixedYears', 'th')}
                    {rateInput('rate-float', 'Bunga floating', 'floatRate', '%')}
                  </div>
                )}
                {scheme === 'subsidi' && (
                  <div className="grid grid-cols-3 gap-2">{rateInput('rate-subsidi', 'Bunga tetap', 'subsidiRate', '%')}</div>
                )}
                {scheme === 'flat' && (
                  <div className="grid grid-cols-3 gap-2">{rateInput('rate-flat', 'Margin flat/tahun', 'flatRate', '%')}</div>
                )}
                <p className="mt-2 text-[11px] leading-relaxed text-ink/50">
                  Acuan (Agustus–September 2026): promo fixed bank besar sekitar 2,75–3,75% selama 1–3 tahun;
                  setelah itu floating sekitar 11–13% (BCA 11%, Mandiri 13%). Tiap bank, tenor, dan profil
                  nasabah berbeda, jadi sesuaikan dengan penawaran yang Anda terima.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Hasil */}
        <div className="mt-6 rounded-xl bg-navy/5 p-4">
          <p className="text-xs font-medium text-ink/60">
            {result.hasSecondPhase ? `Cicilan per bulan (tahun ke-1 sampai ${loanOptions.fixedYears})` : 'Estimasi cicilan per bulan'}
          </p>
          <p className="mt-0.5 text-3xl font-bold text-navy">{formatRupiah(result.firstPayment)}</p>
          {result.hasSecondPhase && (
            <div className="mt-3 border-t border-navy/10 pt-3 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-ink/60">
                  Setelah fixed berakhir (tahun ke-{loanOptions.fixedYears + 1}, bunga {pct(loanOptions.floatRate)}%)
                </span>
              </div>
              <p className="mt-0.5 text-xl font-bold text-navy">{formatRupiah(result.laterPayment)}</p>
              <p className="mt-1 text-xs text-ink/50">
                Cicilan naik sekitar {Math.round(((result.laterPayment - result.firstPayment) / result.firstPayment) * 100)}%.
                Siapkan anggarannya dari sekarang.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between text-ink/60">
            <span>Uang muka (DP)</span>
            <span className="font-medium text-ink">{formatRupiah(dpAmount)}</span>
          </div>
          <div className="flex justify-between text-ink/60">
            <span>Pokok pinjaman</span>
            <span className="font-medium text-ink">{formatRupiah(principal)}</span>
          </div>
          <div className="flex justify-between text-ink/60">
            <span>Total bunga selama {tenorYears} tahun</span>
            <span className="font-medium text-ink">{formatRupiah(result.totalInterest)}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-ink/60">
            <span>Total pembayaran (DP + cicilan)</span>
            <span className="font-semibold text-ink">{formatRupiah(dpAmount + result.totalPaid)}</span>
          </div>
        </div>

        {/* Komposisi pokok vs bunga */}
        <div className="mt-4">
          <div className="flex h-3 overflow-hidden rounded-full bg-line">
            <div className="bg-forest" style={{ width: `${100 - interestShare}%` }} />
            <div className="bg-gold" style={{ width: `${interestShare}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-ink/60">
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-forest align-middle" />
              Pokok {Math.round(100 - interestShare)}%
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-gold align-middle" />
              Bunga {Math.round(interestShare)}%
            </span>
          </div>
        </div>
      </div>

      {/* Biaya awal */}
      <div className="mt-4 rounded-2xl border border-line bg-white p-5">
        <button
          type="button"
          onClick={() => setShowCosts((v) => !v)}
          aria-expanded={showCosts}
          className="flex w-full items-center justify-between text-left"
        >
          <span>
            <span className="block text-sm font-semibold text-ink">Perkiraan biaya awal</span>
            <span className="block text-xs text-ink/50">
              {scheme === 'subsidi'
                ? 'Biaya KPR subsidi berbeda dengan KPR komersial'
                : `Dana awal (DP + biaya) sekitar ${formatRupiahShort(dpAmount + costs.total)}`}
            </span>
          </span>
          <span className="text-ink/50">{showCosts ? '▲' : '▼'}</span>
        </button>
        {showCosts && (
          <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
            {scheme === 'subsidi' ? (
              <p className="text-xs leading-relaxed text-ink/60">
                Untuk rumah subsidi, BPHTB umumnya dibebaskan bagi masyarakat berpenghasilan rendah, dan
                sebagian biaya ditanggung program. Rincian pastinya tergantung pengembang dan bank penyalur;
                tanyakan sebelum akad.
              </p>
            ) : (
              <>
                {costs.items.map((item) => (
                  <div key={item.key} className="flex justify-between text-ink/60">
                    <span>{item.label}</span>
                    <span className="font-medium text-ink">{formatRupiah(item.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-line pt-2 text-ink/60">
                  <span>Total biaya di luar DP</span>
                  <span className="font-semibold text-ink">{formatRupiah(costs.total)}</span>
                </div>
                <div className="flex justify-between text-ink/60">
                  <span>DP + biaya awal</span>
                  <span className="font-semibold text-navy">{formatRupiah(dpAmount + costs.total)}</span>
                </div>
                <p className="pt-1 text-[11px] leading-relaxed text-ink/50">
                  Perkiraan kasar. BPHTB dihitung 5% × (harga − NPOPTKP Rp 80 juta); nilai NPOPTKP dan tarif
                  tiap daerah bisa berbeda (ada daerah yang membebaskan BPHTB rumah pertama). Provisi 1%,
                  asuransi 0,5%, dan notaris 1% adalah asumsi umum; tiap bank berbeda. Belum termasuk PPN
                  (untuk rumah baru dari pengembang) dan biaya renovasi.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Cek keterjangkauan */}
      <div className="mt-4 rounded-2xl border border-line bg-white p-5">
        <p className="text-sm font-semibold text-ink">Cek Keterjangkauan</p>
        <p className="mt-1 text-xs text-ink/60">
          Idealnya cicilan maksimal {IDEAL_RATIO * 100}% dari penghasilan bulanan (bank umumnya memakai batas
          30–40%). Isi penghasilan untuk melihat apakah cicilan ini aman.
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
            placeholder="Contoh: 25.000.000"
            className="mt-1 w-full rounded-xl border border-line bg-cream px-4 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
          />
        </div>

        {ratioPeak != null && (
          <div className="mt-3 space-y-2">
            <div
              className={`rounded-xl p-3 text-sm ${
                level === 'safe' ? 'bg-forest/10 text-forest' : level === 'limit' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
              }`}
            >
              {result.hasSecondPhase ? (
                <>
                  Saat bunga fixed: <strong>{Math.round(ratioFirst * 100)}%</strong> dari penghasilan. Setelah
                  floating: <strong>{Math.round(ratioPeak * 100)}%</strong>.{' '}
                </>
              ) : (
                <>
                  Cicilan ini setara <strong>{Math.round(ratioPeak * 100)}%</strong> dari penghasilan.{' '}
                </>
              )}
              {level === 'safe' && 'Masih dalam batas aman 👍'}
              {level === 'limit' && 'Mendekati batas. Pertimbangkan DP lebih besar atau tenor lebih panjang.'}
              {level === 'heavy' &&
                'Cukup memberatkan. Sebaiknya perbesar DP, perpanjang tenor, atau pilih rumah dengan harga lebih rendah.'}
            </div>

            {maxAffordablePrice != null && (
              <div className="rounded-xl bg-cream p-3 text-sm text-ink/70">
                Dengan penghasilan ini, DP {dpPercent}%, dan tenor {tenorYears} tahun, harga rumah yang masih
                nyaman sekitar <strong className="text-navy">{formatRupiahShort(maxAffordablePrice)}</strong>.
                <button
                  type="button"
                  onClick={() => setPrice(clamp(Math.round(maxAffordablePrice / 1_000_000) * 1_000_000, PRICE_INPUT_MIN, PRICE_INPUT_MAX))}
                  className="mt-2 block rounded-full border border-navy/25 px-4 py-1.5 text-xs font-semibold text-navy hover:bg-navy hover:text-white"
                >
                  Pakai harga ini
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Jadwal angsuran */}
      <div className="mt-4 rounded-2xl border border-line bg-white p-5">
        <button
          type="button"
          onClick={() => setShowSchedule((v) => !v)}
          aria-expanded={showSchedule}
          className="flex w-full items-center justify-between text-left"
        >
          <span>
            <span className="block text-sm font-semibold text-ink">Jadwal angsuran per tahun</span>
            <span className="block text-xs text-ink/50">Lihat berapa pokok dan bunga yang dibayar tiap tahun</span>
          </span>
          <span className="text-ink/50">{showSchedule ? '▲' : '▼'}</span>
        </button>
        {showSchedule && (
          <div className="mt-3 overflow-x-auto border-t border-line pt-3">
            <table className="w-full min-w-[420px] text-right text-xs">
              <thead>
                <tr className="text-ink/50">
                  <th className="pb-2 text-left font-medium">Tahun</th>
                  <th className="pb-2 font-medium">Cicilan/bln</th>
                  <th className="pb-2 font-medium">Pokok</th>
                  <th className="pb-2 font-medium">Bunga</th>
                  <th className="pb-2 font-medium">Sisa pinjaman</th>
                </tr>
              </thead>
              <tbody>
                {result.yearly.map((row) => (
                  <tr key={row.year} className="border-t border-line text-ink/80">
                    <td className="py-1.5 text-left">{row.year}</td>
                    <td className="py-1.5">{formatRupiah(row.payment)}</td>
                    <td className="py-1.5">{formatRupiahShort(row.principal)}</td>
                    <td className="py-1.5">{formatRupiahShort(row.interest)}</td>
                    <td className="py-1.5">{formatRupiahShort(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-cream p-4 text-xs leading-relaxed text-ink/50">
        <strong>Catatan:</strong> Angka di atas hanya estimasi untuk gambaran awal, bukan penawaran resmi dan
        bukan saran keuangan. Hasil hitungan bank bisa berbeda tipis karena metode perhitungan, pembulatan,
        dan kebijakan masing-masing. Bunga floating berubah mengikuti kebijakan bank dan suku bunga acuan.
        KPR subsidi FLPP hanya untuk rumah pertama dengan batas penghasilan dan batas harga tertentu.
      </div>
    </div>
  );
}
