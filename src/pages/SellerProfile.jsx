import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { d1Api } from '../lib/d1Api';
import ListingCard from '../components/ListingCard';
import Seo from '../components/Seo';
import VerifiedBadge from '../components/VerifiedBadge';
import ProfilePhotoViewer from '../components/ProfilePhotoViewer';
import ShareButton from '../components/ShareButton';
import { ADMIN_UIDS } from '../lib/admin';
import { usePremium } from '../context/PremiumContext';

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

      {!loading && listings.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-ink/60">Pengiklan ini belum punya iklan lain yang tayang.</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
