// Kalkulator estimasi KPR sederhana.
//
// Rumus anuitas standar (dipakai hampir semua bank untuk cicilan tetap):
//   M = P * i * (1 + i)^n / ((1 + i)^n - 1)
//   M = cicilan bulanan
//   P = pokok pinjaman (harga rumah - uang muka/DP)
//   i = suku bunga per bulan (suku bunga tahunan / 12)
//   n = tenor dalam bulan
//
// Asumsi default:
//   - DP default: 20% dari harga rumah
//   - Suku bunga: mengikuti KPR BCA Syariah, 7.69% per tahun, fixed
//   - Tenor default: 15 tahun (rentang wajar 5-20 tahun)

export const KPR_DEFAULTS = {
  dpPercent: 20,
  tenorYears: 15,
  annualRatePercent: 7.69,
};

export const KPR_BANK_LABEL = 'BCA Syariah';

export const KPR_LIMITS = {
  dpPercent: { min: 10, max: 50, step: 5 },
  tenorYears: { min: 5, max: 20, step: 1 },
};

/**
 * Hitung estimasi KPR dari harga rumah.
 * @param {number} price - harga rumah (Rp)
 * @param {object} opts - { dpPercent, tenorYears, annualRatePercent }
 */
export function calculateKPR(price, opts = {}) {
  const dpPercent = opts.dpPercent ?? KPR_DEFAULTS.dpPercent;
  const tenorYears = opts.tenorYears ?? KPR_DEFAULTS.tenorYears;
  const annualRatePercent = opts.annualRatePercent ?? KPR_DEFAULTS.annualRatePercent;

  const dpAmount = Math.round((price * dpPercent) / 100);
  const principal = Math.max(price - dpAmount, 0);
  const i = annualRatePercent / 100 / 12;
  const n = tenorYears * 12;

  let monthly;
  if (i === 0) {
    monthly = principal / n;
  } else {
    const factor = Math.pow(1 + i, n);
    monthly = principal * i * (factor / (factor - 1));
  }

  return {
    dpAmount,
    principal,
    monthly: Math.round(monthly),
    totalPaid: Math.round(monthly * n + dpAmount),
    dpPercent,
    tenorYears,
    annualRatePercent,
  };
}

export function formatRupiah(value) {
  if (value == null || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format ringkas ala "Rp 1,25 M" / "Rp 850 Jt" dipakai di card listing */
export function formatRupiahShort(value) {
  if (value == null || Number.isNaN(value)) return '-';
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${Math.round(value / 1_000_000)} Jt`;
  }
  return formatRupiah(value);
}

/** Format cicilan bulanan ringkas ala "2,4 jt/bln" */
export function formatMonthlyShort(value) {
  if (value == null || Number.isNaN(value)) return '-';
  const jt = value / 1_000_000;
  return `${jt.toFixed(1).replace('.', ',')} jt/bln`;
}
