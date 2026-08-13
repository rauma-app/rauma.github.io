import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { d1Api } from '../lib/d1Api';
import ListingCard from '../components/ListingCard';
import Seo from '../components/Seo';
import VerifiedBadge from '../components/VerifiedBadge';
import ProfilePhotoViewer from '../components/ProfilePhotoViewer';
import { ADMIN_UIDS } from '../lib/admin';
import { usePremium } from '../context/PremiumContext';

export default function SellerProfile() {
  const { uid } = useParams();
  const { premiumMap, loading: premiumLoading } = usePremium();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soldUnits, setSoldUnits] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Tanpa ?status -> otomatis hanya yang 'approved' (halaman publik)
        const [profileData, data, stats] = await Promise.all([
          d1Api.getProfile(uid),
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
  }, [uid]);

  // Sumber nama/foto: profil yang sudah diisi sendiri > data dari iklan
  // terakhir (jaga-jaga user belum pernah buka menu Profil Saya).
  const fallbackOwner = listings[0];
  const displayName = profile?.name || fallbackOwner?.ownerName || 'Profil Pengiklan';
  const displayPhoto = profile?.photo || fallbackOwner?.ownerPhoto || '';
  const description = profile?.description || '';

  const isOwnerPremium = Boolean(uid && premiumMap && premiumMap[uid] !== undefined);
  const isOwnerAdmin = ADMIN_UIDS.includes(uid);

  // Halaman profil ini sekarang terbuka untuk SEMUA pengguna (bukan cuma
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
        path={`/penjual/${uid}`}
      />

      <div className="flex items-center gap-3">
        {displayPhoto && (
          <ProfilePhotoViewer
            src={displayPhoto}
            alt={displayName}
            clickable
            className="h-14 w-14 rounded-full object-cover"
          />
        )}
        <div>
          <h1 className="flex items-center gap-1.5 font-display text-2xl font-semibold text-navy">
            {displayName}
            {isOwnerAdmin && <VerifiedBadge size={20} color="gold" />}
            {isOwnerPremium && !isOwnerAdmin && <VerifiedBadge size={20} color="blue" />}
          </h1>
          <p className="text-sm text-ink/50">
            {listings.length} iklan tayang{soldUnits > 0 ? ` · ${soldUnits} unit terjual` : ''}
          </p>
        </div>
      </div>

      {description && (
        <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-ink/70">
          {description}
        </p>
      )}

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
