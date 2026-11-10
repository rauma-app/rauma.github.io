// Rumus kalkulator KPR (dipisah dari tampilan supaya mudah diuji).

// ---------------------------------------------------------------
// Cicilan anuitas (bunga efektif, dipakai KPR bank & KPR subsidi)
// ---------------------------------------------------------------
export function pmt(principal, annualRatePercent, months) {
  if (months <= 0 || principal <= 0) return 0;
  const r = annualRatePercent / 1200;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/**
 * Simulasi cicilan bulan per bulan.
 *
 * scheme:
 *  - 'bank'    : bunga fixed `fixedYears` tahun, lalu floating (anuitas).
 *                Saat floating mulai, cicilan dihitung ulang dari sisa pokok.
 *  - 'subsidi' : satu bunga tetap sepanjang tenor (anuitas).
 *  - 'flat'    : bunga flat (syariah/margin tetap), cicilan sama tiap bulan.
 *
 * Mengembalikan cicilan awal & sesudah masa fixed, total bunga, dan rekap per tahun.
 */
export function simulateLoan({
  principal,
  tenorYears,
  scheme,
  fixedRate = 0,
  fixedYears = 0,
  floatRate = 0,
  flatRate = 0,
}) {
  const months = Math.max(0, Math.round(tenorYears * 12));
  if (principal <= 0 || months === 0) {
    return { firstPayment: 0, laterPayment: 0, hasSecondPhase: false, fixedMonths: 0, totalInterest: 0, totalPaid: 0, yearly: [] };
  }

  let fixedMonths = months;
  if (scheme === 'bank') fixedMonths = Math.min(Math.round(fixedYears * 12), months);
  const hasSecondPhase = scheme === 'bank' && fixedMonths < months;

  let balance = principal;
  let payment = 0;
  let totalInterest = 0;
  let firstPayment = 0;
  let laterPayment = 0;
  const yearly = [];
  let yr = { year: 1, payment: 0, principal: 0, interest: 0, balance: principal };

  if (scheme === 'flat') {
    const flatInterestMonthly = (principal * (flatRate / 100)) / 12;
    const principalMonthly = principal / months;
    payment = principalMonthly + flatInterestMonthly;
  } else {
    payment = pmt(principal, fixedRate, months);
  }
  firstPayment = payment;
  laterPayment = payment;

  for (let m = 1; m <= months; m += 1) {
    if (hasSecondPhase && m === fixedMonths + 1) {
      // Masa fixed habis -> cicilan dihitung ulang dengan bunga floating
      payment = pmt(balance, floatRate, months - fixedMonths);
      laterPayment = payment;
    }

    let interest;
    let principalPaid;
    if (scheme === 'flat') {
      interest = (principal * (flatRate / 100)) / 12;
      principalPaid = principal / months;
    } else {
      const rate = m <= fixedMonths ? fixedRate : floatRate;
      interest = (balance * rate) / 1200;
      principalPaid = payment - interest;
    }
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;

    yr.payment = payment;
    yr.principal += principalPaid;
    yr.interest += interest;
    yr.balance = balance;
    if (m % 12 === 0 || m === months) {
      yearly.push(yr);
      yr = { year: yearly.length + 1, payment: 0, principal: 0, interest: 0, balance };
    }
  }

  return {
    firstPayment,
    laterPayment,
    hasSecondPhase,
    fixedMonths,
    totalInterest,
    totalPaid: principal + totalInterest,
    yearly,
  };
}

// Cicilan tertinggi per Rp 1 pinjaman. Cicilan sebanding dengan pokok pinjaman,
// jadi dari angka ini bisa langsung dihitung pinjaman maksimal untuk penghasilan tertentu.
export function peakPaymentPerRupiah(options) {
  const unit = simulateLoan({ ...options, principal: 1 });
  return Math.max(unit.firstPayment, unit.laterPayment);
}

// ---------------------------------------------------------------
// Slider harga: rentang lebar (Rp100 jt - Rp50 M) dengan langkah bertingkat
// ---------------------------------------------------------------
const PRICE_SEGMENTS = [
  { upTo: 1_000_000_000, step: 10_000_000 },
  { upTo: 5_000_000_000, step: 50_000_000 },
  { upTo: 20_000_000_000, step: 250_000_000 },
  { upTo: 50_000_000_000, step: 1_000_000_000 },
];
export const PRICE_MIN = 100_000_000;

export const PRICE_LADDER = (() => {
  const values = [PRICE_MIN];
  let v = PRICE_MIN;
  for (const seg of PRICE_SEGMENTS) {
    while (v + seg.step <= seg.upTo) {
      v += seg.step;
      values.push(v);
    }
  }
  return values;
})();

// Posisi slider terdekat untuk harga tertentu
export function priceToIndex(price) {
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < PRICE_LADDER.length; i += 1) {
    const diff = Math.abs(PRICE_LADDER[i] - price);
    if (diff < bestDiff) {
      best = i;
      bestDiff = diff;
    }
  }
  return best;
}

// ---------------------------------------------------------------
// Perkiraan biaya awal pembelian (kasar, beda tiap bank/daerah)
// ---------------------------------------------------------------
export const NPOPTKP_DEFAULT = 80_000_000; // batas minimal menurut UU HKPD; tiap daerah bisa lebih tinggi
export function estimateUpfrontCosts({ price, principal, scheme }) {
  const provisi = scheme === 'bank' ? principal * 0.01 : scheme === 'flat' ? principal * 0.01 : 0;
  const adminAppraisal = scheme === 'subsidi' ? 0 : 2_000_000;
  const asuransi = scheme === 'subsidi' ? 0 : principal * 0.005;
  const notaris = price * 0.01;
  const bphtb = scheme === 'subsidi' ? 0 : Math.max(0, price - NPOPTKP_DEFAULT) * 0.05;
  const items = [
    { key: 'bphtb', label: 'BPHTB (pajak pembeli)', value: bphtb },
    { key: 'notaris', label: 'Notaris, AJB & balik nama', value: notaris },
    { key: 'provisi', label: 'Provisi bank', value: provisi },
    { key: 'admin', label: 'Administrasi & appraisal', value: adminAppraisal },
    { key: 'asuransi', label: 'Asuransi jiwa & kebakaran', value: asuransi },
  ].filter((i) => i.value > 0);
  return { items, total: items.reduce((s, i) => s + i.value, 0) };
}
