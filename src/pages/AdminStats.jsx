import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { d1Api } from '../lib/d1Api';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../lib/admin';
import { formatRupiahShort } from '../lib/kpr';

const PERIODS = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'month', label: 'Bulan Ini' },
  { key: 'lastmonth', label: 'Bulan Lalu' },
];

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs text-ink/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-navy">{value}</p>
    </div>
  );
}

export default function AdminStats() {
  const { user, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState('today');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin(user)) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const data = await d1Api.getAdminStats(period);
      if (!cancelled) {
        setStats(data);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, period]);

  if (authLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-ink/50">Memuat...</div>;
  }

  if (!user || !isAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  const p = stats?.period;
  const allTime = stats?.all_time;
  const byArea = stats?.listing_per_daerah || [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-navy">Statistik</h1>

      {/* Toggle periode */}
      <div className="mt-4 flex gap-2">
        {PERIODS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setPeriod(opt.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              period === opt.key ? 'bg-forest text-white' : 'border border-line text-ink/60'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && <p className="mt-6 text-sm text-ink/50">Memuat data...</p>}

      {!loading && stats && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Pengunjung" value={p?.pengunjung ?? 0} />
            <StatCard label="Klik WhatsApp" value={p?.klik_whatsapp ?? 0} />
            <StatCard label="Pencarian" value={p?.pencarian ?? 0} />
            <StatCard label="Listing Baru" value={p?.listing_baru ?? 0} />
            <StatCard label="Unit Terjual" value={p?.unit_terjual ?? 0} />
            <StatCard label="Nilai Terjual" value={formatRupiahShort(p?.nilai_terjual ?? 0)} />
          </div>

          {/* Snapshot sekarang, tidak difilter periode */}
          <div className="mt-8 rounded-2xl border border-line bg-white p-4">
            <p className="text-sm font-semibold text-navy">Sepanjang Waktu (All-Time)</p>
            <div className="mt-2 flex gap-6">
              <div>
                <p className="text-xs text-ink/50">Total Unit Terjual</p>
                <p className="font-display text-xl font-semibold text-navy">{allTime?.unit_terjual ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-ink/50">Total Nilai Terjual</p>
                <p className="font-display text-xl font-semibold text-navy">
                  {formatRupiahShort(allTime?.nilai_terjual ?? 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="font-display text-lg font-semibold text-navy">Listing per Daerah</h2>
            <p className="mt-1 text-xs text-ink/40">Snapshot sekarang, listing yang statusnya tayang (approved).</p>
            <div className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
              {byArea.length === 0 && <p className="p-4 text-sm text-ink/50">Belum ada listing tayang.</p>}
              {byArea.map((row) => (
                <div key={row.kabupaten} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-ink/70">{row.kabupaten}</span>
                  <span className="text-sm font-semibold text-navy">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
