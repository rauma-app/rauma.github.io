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

function StatCard({ label, value, onClick, active }) {
  const body = (
    <>
      <p className="text-xs text-ink/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-navy">{value}</p>
      {onClick && (
        <p className="mt-1 text-[11px] font-medium text-forest">
          {active ? 'Tutup daftar ▲' : 'Lihat keyword ▼'}
        </p>
      )}
    </>
  );
  if (!onClick) {
    return <div className="rounded-2xl border border-line bg-white p-4">{body}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`rounded-2xl border bg-white p-4 text-left transition ${
        active ? 'border-forest' : 'border-line'
      }`}
    >
      {body}
    </button>
  );
}

// created_at dari server = UTC ("2026-10-20 05:10:00") -> tampilkan WIB
function formatWib(value) {
  if (!value) return '';
  const d = new Date(String(value).replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminStats() {
  const { user, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState('today');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  // Daftar keyword pencarian -- baru diambil saat kartu "Pencarian" diklik
  const [showKeywords, setShowKeywords] = useState(false);
  const [keywords, setKeywords] = useState(null); // null = belum/gagal, [] = kosong
  const [keywordsLoading, setKeywordsLoading] = useState(false);

  useEffect(() => {
    if (!user || !isAdmin(user) || !showKeywords) return;
    let cancelled = false;
    setKeywordsLoading(true);
    d1Api.getSearchKeywords(period).then((data) => {
      if (cancelled) return;
      setKeywords(data);
      setKeywordsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, period, showKeywords]);

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
            <StatCard
              label="Pencarian"
              value={p?.pencarian ?? 0}
              active={showKeywords}
              onClick={() => setShowKeywords((v) => !v)}
            />
            <StatCard label="Listing Baru" value={p?.listing_baru ?? 0} />
            <StatCard label="Unit Terjual" value={p?.unit_terjual ?? 0} />
            <StatCard label="Nilai Terjual" value={formatRupiahShort(p?.nilai_terjual ?? 0)} />
          </div>

          {showKeywords && (
            <div className="mt-3 rounded-2xl border border-line bg-white">
              <p className="px-4 pt-3 text-sm font-semibold text-navy">Keyword yang dicari pengunjung</p>
              {keywordsLoading && <p className="px-4 py-3 text-sm text-ink/50">Memuat keyword...</p>}
              {!keywordsLoading && keywords === null && (
                <p className="px-4 py-3 text-sm text-red-600">Gagal memuat keyword. Coba lagi nanti.</p>
              )}
              {!keywordsLoading && keywords && keywords.length === 0 && (
                <p className="px-4 py-3 text-sm text-ink/50">Belum ada pencarian di periode ini.</p>
              )}
              {!keywordsLoading && keywords && keywords.length > 0 && (
                <div className="mt-2 divide-y divide-line">
                  {keywords.map((row) => (
                    <div key={row.keyword} className="flex items-start justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-ink/80">{row.keyword}</p>
                        <p className="text-xs text-ink/40">Terakhir {formatWib(row.last_at)} WIB</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-navy">{row.total}x</p>
                        <p className="text-xs text-ink/40">{row.visitors} orang</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
