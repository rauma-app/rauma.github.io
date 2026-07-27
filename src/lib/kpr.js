// Util format angka/rupiah yang dipakai di seluruh aplikasi.
// Catatan: kalkulator estimasi KPR otomatis sudah dihapus (per Juli 2026)
// karena skema cicilan tiap bank/developer beda-beda. Sekarang cicilan
// diisi manual oleh penjual lewat field "Cicilan Mulai dari" di form Posting.

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
