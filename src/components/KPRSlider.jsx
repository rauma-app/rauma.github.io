import React, { useMemo, useState } from 'react';
import { KPR_BANK_LABEL, KPR_DEFAULTS, KPR_LIMITS, calculateKPR, formatRupiah } from '../lib/kpr';

export default function KPRSlider({ price }) {
  const [dpPercent, setDpPercent] = useState(KPR_DEFAULTS.dpPercent);
  const [tenorYears, setTenorYears] = useState(KPR_DEFAULTS.tenorYears);

  const result = useMemo(
    () => calculateKPR(price, { dpPercent, tenorYears }),
    [price, dpPercent, tenorYears]
  );

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="section-rule text-xs font-semibold uppercase tracking-wide text-navy">Estimasi Cicilan</p>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-3xl font-semibold text-forest">
            {formatRupiah(result.monthly)}
            <span className="text-base font-normal text-ink/50"> /bulan</span>
          </p>
        </div>
        <p className="text-right text-xs text-ink/40">
          {KPR_BANK_LABEL} {result.annualRatePercent}%/thn (fixed)
          <br />estimasi, bukan penawaran resmi bank
        </p>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <div className="flex justify-between text-sm">
            <label htmlFor="dp-slider" className="font-medium text-ink">Uang Muka (DP)</label>
            <span className="text-ink/60">{dpPercent}% · {formatRupiah(result.dpAmount)}</span>
          </div>
          <input
            id="dp-slider"
            type="range"
            min={KPR_LIMITS.dpPercent.min}
            max={KPR_LIMITS.dpPercent.max}
            step={KPR_LIMITS.dpPercent.step}
            value={dpPercent}
            onChange={(e) => setDpPercent(Number(e.target.value))}
            className="mt-2 w-full accent-forest"
          />
        </div>

        <div>
          <div className="flex justify-between text-sm">
            <label htmlFor="tenor-slider" className="font-medium text-ink">Tenor</label>
            <span className="text-ink/60">{tenorYears} tahun</span>
          </div>
          <input
            id="tenor-slider"
            type="range"
            min={KPR_LIMITS.tenorYears.min}
            max={KPR_LIMITS.tenorYears.max}
            step={KPR_LIMITS.tenorYears.step}
            value={tenorYears}
            onChange={(e) => setTenorYears(Number(e.target.value))}
            className="mt-2 w-full accent-forest"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-between border-t border-line pt-4 text-sm text-ink/60">
        <span>Pokok pinjaman</span>
        <span className="font-medium text-ink">{formatRupiah(result.principal)}</span>
      </div>
      <p className="mt-2 text-xs text-ink/50">
        Tenor rendah makin murah, lihat promo{' '}
        <a
          href="https://rumahsaya.bca.co.id/simulasi/bandingkan-bunga"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-forest underline"
        >
          disini
        </a>
        .
      </p>
    </div>
  );
}
