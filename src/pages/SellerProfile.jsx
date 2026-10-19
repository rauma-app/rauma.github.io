import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { d1Api } from '../lib/d1Api';
import ListingCard from '../components/ListingCard';
import Seo from '../components/Seo';
import VerifiedBadge from '../components/VerifiedBadge';
import ProfilePhotoViewer from '../components/ProfilePhotoViewer';
import ShareButton from '../components/ShareButton';
import { ADMIN_UIDS } from '../lib/admin';
import { usePremium } from '../context/PremiumContext';

// Harga bisa string / kosong / 0 di data lama -> anggap "tanpa harga"
function priceOf(listing) {
  const n = Number(listing?.price);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function SellerProfile() {
  // Halaman ini dipasang di 2 route: /penjual/:uid (link lama, selalu
  // jalan) dan /u/:username (link pendek, cuma jalan kalau user itu
  // sudah pernah isi username di menu Profil Saya).
  const { uid: uidParam, username: usernameParam } = useParams();
  const { premiumMap, loading: premiumLoading } = usePremium();

  const [uid, setUid] = useState(uidParam || null);
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soldUnits, setSoldUnits] = useState(0);
  const [usernameNotFound, setUsernameNotFound] = useState(false);
  // Filter iklan (khusus profil akun centang biru/kuning)
  const [locFilter, setLocFilter] = useState('all'); // 'all' | 'kab::x' | 'kec::x|y'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'cheapest' | 'priciest'

  // Tahap 1: kalau diakses lewat /u/:username, resolve dulu jadi uid.
  useEffect(() => {
    async function resolveUsername() {
      if (!usernameParam) {
        setUid(uidParam);
        return;
      }
      setLoading(true);
      const data = await d1Api.getProfileByUsername(usernameParam);
      if (!data) {
        setUsernameNotFound(true);
        setLoading(false);
        return;
      }
      setProfile(data);
      setUid(data.uid);
    }
    resolveUsername();
  }, [uidParam, usernameParam]);

  // Tahap 2: begitu uid diketahui, ambil profil (kalau belum ada dari
  // tahap 1), listing, dan statistik terjual.
  useEffect(() => {
    async function load() {
      if (!uid) return;
      setLoading(true);
      setLocFilter('all');
      setSortBy('newest');
      try {
        const [profileData, data, stats] = await Promise.all([
          profile ? Promise.resolve(profile) : d1Api.getProfile(uid),
          // Tanpa ?status -> otomatis hanya yang 'approved' (halaman publik)
          d1Api.getListings({ owner: uid }),
          d1Api.getSellerStats(uid),
        ]);
        setProfile(profileData);
        setListings(data);
        setSoldUnits(stats?.sold_units || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Daftar pilihan lokasi + jumlah iklan, dihitung dari data yang SUDAH
  // dimuat (tanpa request tambahan ke server). Kota/kabupaten dan
  // kecamatan dipisah dalam 2 grup supaya "Cimahi (3)" maupun
  // "Batujajar (10)" sama-sama ada.
  const locationOptions = useMemo(() => {
    const kabMap = new Map();
    const kecMap = new Map();
    const clean = (v) => String(v || '').trim().replace(/\s+/g, ' ');
    for (const l of listings) {
      const kab = clean(l.kabupaten || l.location);
      const kec = clean(l.kecamatan);
      if (kab) {
        const k = kab.toLowerCase();
        const cur = kabMap.get(k) || { value: `kab::${k}`, label: kab, count: 0 };
        cur.count += 1;
        kabMap.set(k, cur);
      }
      if (kec) {
        const k = `${kec.toLowerCase()}|${kab.toLowerCase()}`;
        const cur = kecMap.get(k) || {
          value: `kec::${k}`,
          label: kab ? `${kec}, ${kab}` : kec,
          count: 0,
        };
        cur.count += 1;
        kecMap.set(k, cur);
      }
    }
    const byCount = (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'id');
    return {
      kabupaten: [...kabMap.values()].sort(byCount),
      kecamatan: [...kecMap.values()].sort(byCount),
    };
  }, [listings]);

  const visibleListings = useMemo(() => {
    const norm = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
    let result = listings;

    if (locFilter.startsWith('kab::')) {
      const target = locFilter.slice(5);
      result = result.filter((l) => norm(l.kabupaten || l.location) === target);
    } else if (locFilter.startsWith('kec::')) {
      const [kec, kab] = locFilter.slice(5).split('|');
      result = result.filter(
        (l) => norm(l.kecamatan) === kec && norm(l.kabupaten || l.location) === (kab || '')
      );
    }

    if (sortBy === 'cheapest' || sortBy === 'priciest') {
      const dir = sortBy === 'cheapest' ? 1 : -1;
      // [...result] supaya urutan asli (terbaru) tidak ikut berubah
      result = [...result].sort((a, b) => {
        const pa = priceOf(a);
        const pb = priceOf(b);
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1; // tanpa harga selalu di paling bawah
        if (pb === null) return -1;
        return (pa - pb) * dir;
      });
    }
    // 'newest' = urutan dari server (created_at terbaru dulu)
    return result;
  }, [listings, locFilter, sortBy]);

  if (usernameNotFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink/60">Halaman profil ini tidak tersedia.</p>
      </div>
    );
  }

  // Sumber nama/foto: profil yang sudah diisi sendiri > data dari iklan
  // terakhir (jaga-jaga user belum pernah buka menu Profil Saya).
  const fallbackOwner = listings[0];
  const displayName = profile?.name || fallbackOwner?.ownerName || 'Profil Pengiklan';
  const displayPhoto = profile?.photo || fallbackOwner?.ownerPhoto || '';
  const description = profile?.description || '';

  const isOwnerPremium = Boolean(uid && premiumMap && premiumMap[uid] !== undefined);
  const isOwnerAdmin = ADMIN_UIDS.includes(uid);

  // Halaman profil ini terbuka untuk SEMUA pengguna (bukan cuma
  // premium/admin) -- hanya badge centang yang tetap eksklusif.
  // Filter hanya untuk profil akun centang biru/kuning, dan baru berguna
  // kalau iklannya lebih dari 1.
  const showFilters = (isOwnerPremium || isOwnerAdmin) && listings.length > 1;

  const notFound = !loading && !premiumLoading && !profile && listings.length === 0;

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink/60">Halaman profil ini tidak tersedia.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Seo
        title={`Iklan dari ${displayName}`}
        description="Lihat semua iklan rumah lain dari pengiklan ini di Rauma."
        path={usernameParam ? `/u/${usernameParam}` : `/penjual/${uid}`}
      />

      <div className="flex items-start gap-3">
        {displayPhoto && (
          <ProfilePhotoViewer
            src={displayPhoto}
            alt={displayName}
            clickable
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        )}
        {/* Nama, jumlah iklan, dan deskripsi sengaja disatukan di kolom
            yang sama biar sejajar rapi (bukan deskripsi full-width
            terpisah di bawah foto). */}
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-1.5 font-display text-2xl font-semibold text-navy">
            {displayName}
            {isOwnerAdmin && <VerifiedBadge size={20} color="gold" />}
            {isOwnerPremium && !isOwnerAdmin && <VerifiedBadge size={20} color="blue" />}
          </h1>
          <p className="text-sm text-ink/50">
            {listings.length} iklan tayang{soldUnits > 0 ? ` · ${soldUnits} unit terjual` : ''}
          </p>
          {description && (
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/70">
              {description}
            </p>
          )}
        </div>
        <ShareButton
          title={`Iklan dari ${displayName}`}
          text={`Lihat semua iklan dari ${displayName} di Rauma`}
          className="shrink-0 shadow-none ring-1 ring-line"
        />
      </div>

      {/* Garis pembatas antara data penjual dan grid iklan (navy solid,
          sama seperti warna footer) */}
      <hr className="mt-6 border-t-2 border-navy" />

      {loading && <p className="mt-6 text-sm text-ink/50">Memuat...</p>}

      {/* Filter lokasi & urutan harga -- khusus profil akun centang biru
          (premium) dan kuning (admin). Akun gratis tidak punya filter. */}
      {showFilters && (
        <div className="mt-5">
          <div className="grid grid-cols-2 gap-2 sm:max-w-md">
            <select
              value={locFilter}
              onChange={(e) => setLocFilter(e.target.value)}
              aria-label="Filter lokasi iklan"
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none"
            >
              <option value="all">Semua lokasi ({listings.length})</option>
              {locationOptions.kabupaten.length > 0 && (
                <optgroup label="Kota / Kabupaten">
                  {locationOptions.kabupaten.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label} ({o.count})
                    </option>
                  ))}
                </optgroup>
              )}
              {locationOptions.kecamatan.length > 0 && (
                <optgroup label="Kecamatan">
                  {locationOptions.kecamatan.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label} ({o.count})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Urutkan iklan"
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none"
            >
              <option value="newest">Terbaru</option>
              <option value="cheapest">Harga terendah</option>
              <option value="priciest">Harga termahal</option>
            </select>
          </div>

          {(locFilter !== 'all' || sortBy !== 'newest') && (
            <p className="mt-2 text-xs text-ink/50">
              Menampilkan {visibleListings.length} dari {listings.length} iklan
              <button
                type="button"
                onClick={() => {
                  setLocFilter('all');
                  setSortBy('newest');
                }}
                className="ml-2 font-medium text-navy underline"
              >
                Reset
              </button>
            </p>
          )}
        </div>
      )}

      {!loading && listings.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-ink/60">Pengiklan ini belum punya iklan lain yang tayang.</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {visibleListings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
