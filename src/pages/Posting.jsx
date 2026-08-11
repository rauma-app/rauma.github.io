import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { d1Api } from '../lib/d1Api';
import { r2Uploader } from '../lib/r2Uploader';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../lib/admin';
import { isPremium, FREE_LISTING_LIMIT, PREMIUM_LISTING_LIMIT } from '../lib/premium';
import { isPerumahanAdmin } from '../lib/perumahanAdmin';
import { usePremium } from '../context/PremiumContext';
import LocationAutocomplete from '../components/LocationAutocomplete';
import InfoTip from '../components/InfoTip';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const PREMIUM_WHATSAPP = '6285156222635';
const PREMIUM_PRICE_LABEL = 'Rp299.000/tahun';

const SERTIFIKAT_OPTIONS = ['SHM', 'SHGB', 'HGB', 'AJB', 'Girik', 'PPJB', 'Lainnya'];
const AIR_OPTIONS = ['PDAM', 'Sumur Bor', 'Sumur Gali', 'Lainnya'];

const MATERIAL_FIELDS = [
  { key: 'materialPondasi', label: 'Pondasi', options: ['Batu Kali', 'Footplat / Cakar Ayam', 'Straus Pile / Bore Pile', 'Tiang Pancang'] },
  { key: 'materialDinding', label: 'Dinding', options: ['Bata Ringan (Hebel)', 'Bata Merah', 'Batako', 'Panel Beton Precast'] },
  { key: 'materialAtap', label: 'Penutup Atap', options: ['Genteng Beton', 'Genteng Keramik', 'Genteng Metal', 'Atap UPVC', 'Genteng Tanah Liat'] },
  { key: 'materialKusen', label: 'Kusen', options: ['Aluminium', 'Kayu', 'UPVC', 'Besi Hollow / Steel Frame'] },
  { key: 'materialLantai', label: 'Lantai', options: ['Granit Tile (Homogeneous Tile)', 'Keramik', 'Marmer / Granit Alam', 'Floor Hardener / Acian'] },
  { key: 'materialKloset', label: 'Kloset', options: ['Duduk', 'Jongkok'] },
];

const TYPE_LABELS = {
  pribadi: 'Pribadi',
  perumahan: 'Perumahan',
  take_over_kpr: 'Take Over KPR',
  subsidi: 'Subsidi',
};

const CICILAN_TYPES = ['perumahan', 'subsidi', 'take_over_kpr'];

const emptyForm = {
  type: 'pribadi',
  priceRaw: '',
  cicilanRaw: '',
  location: null,
  luasTanah: '',
  luasBangunan: '',
  unitTersedia: '',
  bedrooms: '',
  bathrooms: '',
  electricity: '',
  air: '',
  sertifikat: '',
  videoUrl: '',
  description: '',
  whatsapp: '',
  materialPondasi: '',
  materialDinding: '',
  materialAtap: '',
  materialKusen: '',
  materialLantai: '',
  materialKloset: '',
  perumahanName: '',
  perumahanPhoto: '', // URL foto lama (mode edit); file barunya di state perumahanPhotoFile
};

const MAX_PHOTOS = 8;

function formatThousands(digits) {
  if (!digits) return '';
  return new Intl.NumberFormat('id-ID').format(Number(digits));
}

export default function Posting() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [priceDisplay, setPriceDisplay] = useState('');
  const [cicilanDisplay, setCicilanDisplay] = useState('');
  const [files, setFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [error, setError] = useState('');
  const [listingCount, setListingCount] = useState(null);
  const [phoneLimitReached, setPhoneLimitReached] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [perumahanPhotoFile, setPerumahanPhotoFile] = useState(null);
  const [perumahanPhotoPreview, setPerumahanPhotoPreview] = useState('');

  const userIsAdmin = isAdmin(user);
  const { premiumMap, perumahanAdminMap } = usePremium();
  const userIsPremium = isPremium(user, premiumMap);
  const userIsPerumahanAdmin = isPerumahanAdmin(user, perumahanAdminMap);
  const listingLimit =
    userIsAdmin || userIsPerumahanAdmin ? Infinity : userIsPremium ? PREMIUM_LISTING_LIMIT : FREE_LISTING_LIMIT;
  const limitReached = !isEditMode && listingCount !== null && listingCount >= listingLimit;

  // Kategori yang boleh dipilih, beda-beda tergantung role:
  //  - Admin Perumahan : cuma 'perumahan' (dikunci, gak ada pilihan lain)
  //  - Admin utama     : semua kategori (gak berubah)
  //  - Premium         : pribadi, take_over_kpr, subsidi (perumahan DICABUT)
  //  - User biasa      : pribadi, take_over_kpr
  const typeOptions = userIsPerumahanAdmin
    ? ['perumahan']
    : userIsAdmin
      ? ['pribadi', 'take_over_kpr', 'perumahan', 'subsidi']
      : userIsPremium
        ? ['pribadi', 'take_over_kpr', 'subsidi']
        : ['pribadi', 'take_over_kpr'];

  // Admin Perumahan cuma punya 1 kategori -> paksa selalu 'perumahan'.
  // PENTING: hook ini harus dipanggil sebelum return apa pun di bawah
  // (loading/limit), biar urutan hooks konsisten tiap render.
  useEffect(() => {
    if (userIsPerumahanAdmin && form.type !== 'perumahan') {
      update('type', 'perumahan');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIsPerumahanAdmin]);

  // Cek limit listing milik user dari Cloudflare D1
  useEffect(() => {
    if (isEditMode || !user || userIsAdmin || userIsPerumahanAdmin) return;
    let cancelled = false;

    async function loadCount() {
      try {
        // owner + status:'all' -> hitung SEMUA iklan milik user ini,
        // apapun statusnya (pending/approved/rejected), biar limit akurat.
        const userListings = await d1Api.getListings({ owner: user.uid, status: 'all' });
        if (!cancelled && Array.isArray(userListings)) {
          setListingCount(userListings.length);
        }
      } catch (err) {
        console.error('Gagal memuat statistik listing user:', err);
      }
    }

    loadCount();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, user, userIsAdmin]);

  // Mode Edit: Ambil detail data dari D1
  useEffect(() => {
    if (!isEditMode || !user) return;
    let cancelled = false;

    async function loadExisting() {
      setLoadingExisting(true);
      try {
        const data = await d1Api.getListingById(id);
        if (!data) {
          setError('Iklan tidak ditemukan.');
          return;
        }

        const ownerUid = data.ownerUid || data.seller_uid;
        if (ownerUid && ownerUid !== user.uid) {
          setError('Kamu tidak punya akses untuk mengedit iklan ini.');
          return;
        }

        if (cancelled) return;

        let imgs = [];
        try {
          imgs = typeof data.images === 'string' ? JSON.parse(data.images) : data.images;
        } catch (e) {
          imgs = [];
        }

        setForm({
          type: data.type || 'pribadi',
          priceRaw: String(data.price || ''),
          cicilanRaw: data.cicilanPerBulan ? String(data.cicilanPerBulan) : '',
          location: {
            label: data.kecamatan ? `${data.kecamatan} - ${data.kabupaten}` : (data.kabupaten || data.location || ''),
            kabupaten: data.kabupaten || data.location || '',
            kecamatan: data.kecamatan || '',
            lat: data.lat,
            lon: data.lon,
          },
          luasTanah: data.luasTanah ?? '',
          luasBangunan: data.luasBangunan ?? '',
          unitTersedia: data.unitTersedia ?? '',
          bedrooms: data.bedrooms ?? '',
          bathrooms: data.bathrooms ?? '',
          electricity: data.electricity || '',
          air: data.air || '',
          sertifikat: data.sertifikat || '',
          videoUrl: data.videoUrl || '',
          description: data.description || '',
          whatsapp: data.whatsapp || data.seller_phone || '',
          materialPondasi: data.materialPondasi || '',
          materialDinding: data.materialDinding || '',
          materialAtap: data.materialAtap || '',
          materialKusen: data.materialKusen || '',
          materialLantai: data.materialLantai || '',
          materialKloset: data.materialKloset || '',
          perumahanName: data.perumahanName || '',
          perumahanPhoto: data.perumahanPhoto || '',
        });

        if (data.perumahanPhoto) {
          setPerumahanPhotoPreview(data.perumahanPhoto);
        }

        // Kalau ada material yang sudah keisi (edit iklan lama), buka
        // section-nya otomatis biar user langsung lihat & bisa ubah.
        if (data.materialPondasi || data.materialDinding || data.materialAtap || data.materialKusen || data.materialLantai || data.materialKloset) {
          setMaterialOpen(true);
        }

        setPriceDisplay(formatThousands(String(data.price || '')));
        setCicilanDisplay(data.cicilanPerBulan ? formatThousands(String(data.cicilanPerBulan)) : '');
        setExistingImages(Array.isArray(imgs) ? imgs : []);
        setPreviews(Array.isArray(imgs) ? imgs : []);
      } catch (err) {
        console.error('Gagal memuat data iklan:', err);
        setError('Gagal memuat data iklan.');
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    }

    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, id, user]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handlePriceChange(e) {
    const digits = e.target.value.replace(/\D/g, '');
    update('priceRaw', digits);
    setPriceDisplay(formatThousands(digits));
  }

  function handleCicilanChange(e) {
    const digits = e.target.value.replace(/\D/g, '');
    update('cicilanRaw', digits);
    setCicilanDisplay(formatThousands(digits));
  }

  function handleWhatsappChange(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
    update('whatsapp', digits);
  }

  function totalPhotoCount() {
    return existingImages.length + files.length;
  }

  function handleFiles(e) {
    const incoming = Array.from(e.target.files || []);
    const room = MAX_PHOTOS - totalPhotoCount();
    const accepted = incoming.slice(0, Math.max(room, 0));
    setFiles((prev) => {
      const combined = [...prev, ...accepted];
      setPreviews([...existingImages, ...combined.map((f) => URL.createObjectURL(f))]);
      return combined;
    });
    e.target.value = '';
  }

  function removePhoto(index) {
    if (index < existingImages.length) {
      const updatedExisting = existingImages.filter((_, i) => i !== index);
      setExistingImages(updatedExisting);
      setPreviews([...updatedExisting, ...files.map((f) => URL.createObjectURL(f))]);
    } else {
      const fileIndex = index - existingImages.length;
      const updatedFiles = files.filter((_, i) => i !== fileIndex);
      setFiles(updatedFiles);
      setPreviews([...existingImages, ...updatedFiles.map((f) => URL.createObjectURL(f))]);
    }
  }

    async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.priceRaw || !form.location || totalPhotoCount() === 0) {
      setError('Harga, lokasi, dan minimal 1 foto wajib diisi.');
      return;
    }

    if (!form.luasBangunan || !form.luasTanah) {
      setError('Luas Bangunan dan Luas Tanah wajib diisi.');
      return;
    }

    if (!form.bedrooms || !form.bathrooms) {
      setError('Kamar Tidur dan Kamar Mandi wajib diisi.');
      return;
    }

    if (form.whatsapp.length < 10 || form.whatsapp.length > 13) {
      setError('Nomor WhatsApp harus 10-13 digit.');
      return;
    }

    if (userIsPerumahanAdmin) {
      if (!form.perumahanName.trim()) {
        setError('Nama Perumahan wajib diisi.');
        return;
      }
      if (!perumahanPhotoFile && !form.perumahanPhoto) {
        setError('Foto Profil Perumahan wajib diisi.');
        return;
      }
    }

    // Cegah akali batas iklan gratis dengan ganti-ganti akun Google: hitung
    // juga berapa iklan yang sudah pakai nomor WhatsApp ini, lintas akun
    // manapun. Admin & Premium gak kena batas ini.
    if (!isEditMode && !userIsAdmin && !userIsPremium && !userIsPerumahanAdmin) {
      try {
        const listingsWithSamePhone = await d1Api.getListings({ whatsapp: form.whatsapp, status: 'all' });
        if (listingsWithSamePhone.length >= FREE_LISTING_LIMIT) {
          setPhoneLimitReached(true);
          return;
        }
      } catch (err) {
        console.error('Gagal mengecek limit nomor WhatsApp:', err);
      }
    }

    if (form.videoUrl && !/^https?:\/\//i.test(form.videoUrl.trim())) {
      setError('URL video harus diawali http:// atau https://');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload Foto Baru ke R2
      let newImageUrls = [];
      if (files.length > 0) {
        if (typeof r2Uploader?.uploadMany === 'function') {
          newImageUrls = await r2Uploader.uploadMany(files);
        } else if (typeof r2Uploader?.uploadFile === 'function') {
          newImageUrls = await Promise.all(files.map((f) => r2Uploader.uploadFile(f)));
        }
      }

      const imageUrls = [...existingImages, ...newImageUrls];

      // 1b. Upload Foto Profil Perumahan (kalau ada file baru)
      let perumahanPhotoUrl = form.perumahanPhoto || '';
      if (userIsPerumahanAdmin && perumahanPhotoFile) {
        perumahanPhotoUrl = await r2Uploader.uploadFile(perumahanPhotoFile);
      }

      // Safe Extraction untuk Lokasi
      const locObj = typeof form.location === 'object' && form.location !== null ? form.location : {};
      const kabName = locObj.kabupaten || (typeof form.location === 'string' ? form.location : '') || '';
      const kecName = locObj.kecamatan || '';

      // Penanganan Nama & Foto Google Penjual
      const resolvedOwnerName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Penjual');
      const resolvedOwnerPhoto = user?.photoURL || '';

      // 2. Susun Payload Presisi Sesuai Listing.jsx
      const payload = {
        id: isEditMode ? id : `item_${Date.now()}`,
        title: `${TYPE_LABELS[form.type] || 'Rumah'} di ${kecName || kabName || 'Indonesia'}`,
        type: form.type,
        category: TYPE_LABELS[form.type] || 'Rumah',
        price: Number(form.priceRaw),
        cicilanPerBulan: CICILAN_TYPES.includes(form.type) && form.cicilanRaw ? Number(form.cicilanRaw) : null,
        
        // Lokasi
        location: kabName,
        kabupaten: kabName,
        kecamatan: kecName,
        lat: locObj.lat || null,
        lon: locObj.lon || null,

        // Spesifikasi (Sesuai dengan SPEC_ROWS di Listing.jsx)
        luasTanah: form.luasTanah ? Number(form.luasTanah) : null,
        luasBangunan: form.luasBangunan ? Number(form.luasBangunan) : null,
        unitTersedia: form.type === 'perumahan' && form.unitTersedia ? Number(form.unitTersedia) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        electricity: form.electricity || null,
        air: form.air || null,
        sertifikat: form.sertifikat || null,

        // Material Bangunan (opsional)
        materialPondasi: form.materialPondasi || null,
        materialDinding: form.materialDinding || null,
        materialAtap: form.materialAtap || null,
        materialKusen: form.materialKusen || null,
        materialLantai: form.materialLantai || null,
        materialKloset: form.materialKloset || null,

        // Detail Tambahan
        videoUrl: form.videoUrl ? form.videoUrl.trim() : null,
        description: form.description || '',
        phone: form.whatsapp || '',
        seller_phone: form.whatsapp || '',
        whatsapp: form.whatsapp || '',

        // Data Penjual (Diambil dari Akun Google)
        seller_uid: user?.uid || '',
        ownerUid: user?.uid || '',
        ownerName: resolvedOwnerName,
        ownerPhoto: resolvedOwnerPhoto,

        // Perumahan (khusus role Admin Perumahan)
        perumahanName: userIsPerumahanAdmin ? form.perumahanName.trim() : null,
        perumahanPhoto: userIsPerumahanAdmin ? perumahanPhotoUrl || null : null,

        // Media & Status
        images: imageUrls,
        status: userIsAdmin || userIsPerumahanAdmin ? 'approved' : 'pending',
      };

      // 3. Simpan ke Cloudflare D1
      await d1Api.createListing(payload);

      // 4. Kirim notifikasi email ke admin tiap ada listing BARU (bukan edit)
      // biar gak perlu bolak-balik cek Tinjau Iklan. Pakai FormSubmit yang
      // sama seperti fitur Carikan Properti (sudah aktif ke rauma.contact@gmail.com).
      // Fire-and-forget: gagal kirim email TIDAK menggagalkan posting iklan.
      if (!isEditMode) {
        fetch('https://formsubmit.co/ajax/rauma.contact@gmail.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            _subject: 'Listing Baru Diposting - Rauma',
            Judul: payload.title || '(tanpa judul)',
            Harga: `Rp${Number(payload.price || 0).toLocaleString('id-ID')}`,
            Lokasi: `${payload.kecamatan ? payload.kecamatan + ', ' : ''}${payload.kabupaten || payload.location || ''}`,
            Tipe: payload.type || '-',
            Status: payload.status,
            Link: `${window.location.origin}/id/${payload.id}`,
          }),
        }).catch((err) => console.error('Gagal kirim notifikasi email listing baru:', err));
      }

      // Redirect ke detail iklan
      navigate(`/id/${payload.id}`);
    } catch (err) {
      console.error('Gagal menyimpan iklan:', err);
      setError(`Gagal menyimpan iklan (${err.message || 'Error'}). Coba lagi ya.`);
    } finally {
      setSubmitting(false);
    }
        }
  

  if (loadingExisting) {
    return <div className="mx-auto max-w-xl px-4 py-16 text-center text-ink/50">Memuat data iklan...</div>;
  }

  if (limitReached || phoneLimitReached) {
    const waLink = `https://wa.me/${PREMIUM_WHATSAPP}?text=${encodeURIComponent(
      'Halo, saya mau upgrade akun Rauma saya ke Premium.'
    )}`;
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <h1 className="font-display text-2xl font-semibold text-navy">Pasang Iklan</h1>
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center">
          <p className="text-3xl">⭐</p>
          <h2 className="mt-2 font-display text-xl font-bold text-navy">
            Batas {FREE_LISTING_LIMIT} Iklan Tercapai
          </h2>
          <p className="mt-2 text-sm text-ink/70">
            {phoneLimitReached
              ? <>Nomor WhatsApp ini sudah dipakai untuk {FREE_LISTING_LIMIT} iklan (walaupun beda akun Google). Bantu kami dengan Upgrade ke <b>Rauma Premium</b> ({PREMIUM_PRICE_LABEL}) buat lanjut posting lebih banyak.</>
              : <>Akun kamu udah punya {listingCount} iklan. Bantu kami dengan Upgrade ke <b>Rauma Premium</b> ({PREMIUM_PRICE_LABEL}) buat lanjut posting lebih banyak.</>}
          </p>

          <ul className="mt-4 space-y-1.5 text-left text-sm text-ink/80">
            <li>✅ Posting iklan maksimal {PREMIUM_LISTING_LIMIT}</li>
            <li>✅ Dapat ceklis biru</li>
            <li>✅ Profil bisa dibuka publik</li>
            <li>✅ Klaim Wilayah listing (tidak ada 2 agent di lokasi sama)</li>
            <li>✅ Buka fitur Perumahan &amp; Subsidi</li>
            <li>✅ Gratis kartu nama resmi dari Rauma ID</li>
            <li>✅ Gratis posting 1x promo Video rumah di akun TT/IG/FB/YT Rauma.id</li>
          </ul>

          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex items-center justify-center gap-2 rounded-full bg-forest px-4 py-3 text-sm font-semibold text-white hover:bg-forest-dark"
          >
            <span aria-hidden>💬</span> Upgrade ke Premium via WhatsApp
          </a>

          <p className="mt-4 text-sm text-ink/80">
            Setiap Rupiah dari biaya ini kami pakai untuk upgrade server dan marketing supaya iklanmu dilihat lebih banyak orang. ♥️
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-navy">
        {isEditMode ? 'Edit Iklan' : 'Pasang Iklan'}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {userIsPerumahanAdmin ? (
          <div className="rounded-full border border-forest bg-forest/10 px-5 py-2 text-sm font-semibold text-forest w-fit">
            Perumahan
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {typeOptions.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => update('type', t)}
                className={`rounded-full border px-5 py-2 text-sm font-semibold transition-colors ${
                  form.type === t
                    ? 'border-navy bg-navy text-white'
                    : 'border-line bg-white text-ink/60'
                }`}
              >
                {TYPE_LABELS[t] || t}
              </button>
            ))}
          </div>
        )}
        {!userIsAdmin && !userIsPerumahanAdmin && (
          <p className="-mt-3 text-xs text-ink/40">
            Iklan kamu akan ditinjau dulu sebelum tayang publik (biasanya cepat).
          </p>
        )}

        {userIsPerumahanAdmin && (
          <div className="rounded-xl border border-line bg-white p-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Nama Perumahan</label>
              <input
                type="text"
                value={form.perumahanName}
                onChange={(e) => update('perumahanName', e.target.value)}
                placeholder="Misal: Arcadia Townhouse Cimahi"
                className="input"
              />
              <p className="mt-1.5 text-xs text-ink/40">
                Ini yang tampil di halaman iklan (gantiin nama akun), sejajar tombol WhatsApp.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Foto Profil Perumahan</label>
              <div className="flex items-center gap-3">
                <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-ink/10 text-xl text-ink/40 hover:bg-ink/20">
                  {perumahanPhotoPreview ? (
                    <img src={perumahanPhotoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    '+'
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setPerumahanPhotoFile(file);
                      setPerumahanPhotoPreview(URL.createObjectURL(file));
                    }}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-ink/40">Logo/foto resmi perumahan, biar keliatan official.</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">
            Foto Rumah <span className="font-normal text-ink/40">(maks. {MAX_PHOTOS}, pilih beberapa sekaligus)</span>
          </label>
          {totalPhotoCount() < MAX_PHOTOS && (
            <label className="flex h-28 w-28 cursor-pointer items-center justify-center rounded-xl bg-ink/70 text-3xl text-white hover:bg-ink/80">
              +
              <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
            </label>
          )}
          {previews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative h-20 w-20">
                  <img src={src} alt={`preview ${i + 1}`} className="h-20 w-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="Hapus foto"
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={CICILAN_TYPES.includes(form.type) ? 'grid grid-cols-2 gap-4' : ''}>
          <Field label="Harga">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/50">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="100.000.000"
                value={priceDisplay}
                onChange={handlePriceChange}
                className="w-full rounded-xl border border-line bg-white py-3 pl-10 pr-4 text-ink placeholder:text-ink/40 outline-none focus:border-forest"
              />
            </div>
          </Field>

          {CICILAN_TYPES.includes(form.type) && (
            <Field label="Cicilan Mulai dari">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/50">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="2.500.000"
                  value={cicilanDisplay}
                  onChange={handleCicilanChange}
                  className="w-full rounded-xl border border-line bg-white py-3 pl-10 pr-4 text-ink placeholder:text-ink/40 outline-none focus:border-forest"
                />
              </div>
              <p className="mt-1.5 text-xs text-ink/40">Opsional. Cicilan per bulan, tampil berdampingan dengan harga jual.</p>
            </Field>
          )}
        </div>

        <Field label="Lokasi" info="Jika lokasi tidak ada, tulis alamat lengkap di deskripsi">
          <LocationAutocomplete
            value={form.location}
            onSelect={(loc) => update('location', loc)}
            placeholder="Cari Kecamatan..."
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Luas Bangunan (m²)">
            <input
              type="number"
              value={form.luasBangunan}
              onChange={(e) => update('luasBangunan', e.target.value)}
              placeholder="Masukkan luas bangunan"
              className="input"
            />
          </Field>
          <Field label="Luas Tanah (m²)">
            <input
              type="number"
              value={form.luasTanah}
              onChange={(e) => update('luasTanah', e.target.value)}
              placeholder="Masukkan luas tanah"
              className="input"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Kamar Tidur">
            <input
              type="number"
              value={form.bedrooms}
              onChange={(e) => update('bedrooms', e.target.value)}
              placeholder="Masukkan jumlah"
              className="input"
            />
          </Field>
          <Field label="Kamar Mandi">
            <input
              type="number"
              value={form.bathrooms}
              onChange={(e) => update('bathrooms', e.target.value)}
              placeholder="Masukkan jumlah"
              className="input"
            />
          </Field>
        </div>

        <Field label="Daya Listrik">
          <input
            type="text"
            value={form.electricity}
            onChange={(e) => update('electricity', e.target.value)}
            placeholder="Masukkan daya listrik (contoh: 2200 VA)"
            className="input"
          />
        </Field>

        <Field label="Air">
          <select value={form.air} onChange={(e) => update('air', e.target.value)} className="input">
            <option value="">Pilih Jenis Air</option>
            {AIR_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>

        <Field label="Sertifikat">
          <select value={form.sertifikat} onChange={(e) => update('sertifikat', e.target.value)} className="input">
            <option value="">Pilih Sertifikat</option>
            {SERTIFIKAT_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>

        {form.type === 'perumahan' && (
          <Field label="Unit Tersedia">
            <input
              type="number"
              value={form.unitTersedia}
              onChange={(e) => update('unitTersedia', e.target.value)}
              placeholder="Masukkan jumlah unit tersedia"
              className="input"
            />
          </Field>
        )}

        <Field label="URL Video" info="Kosongkan jika tidak ada">
          <input
            type="url"
            value={form.videoUrl}
            onChange={(e) => update('videoUrl', e.target.value)}
            placeholder="Masukkan link video jika ada (YouTube/TikTok/Instagram)"
            className="input"
          />
        </Field>

        <div className="rounded-xl border border-line bg-white">
          <button
            type="button"
            onClick={() => setMaterialOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left"
          >
            <span className="text-sm font-semibold text-ink">
              Material <span className="font-normal text-ink/40">(opsional)</span>
            </span>
            {materialOpen ? (
              <FaChevronUp className="text-ink/50" size={14} />
            ) : (
              <FaChevronDown className="text-ink/50" size={14} />
            )}
          </button>
          {materialOpen && (
            <div className="space-y-4 border-t border-line px-4 py-4">
              {MATERIAL_FIELDS.map((f) => (
                <Field key={f.key} label={f.label}>
                  <select value={form[f.key]} onChange={(e) => update(f.key, e.target.value)} className="input">
                    <option value="">Pilih {f.label}</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
          )}
        </div>

        <Field label="Deskripsi" info="Jelaskan mengapa orang harus membeli rumahmu, tambahkan bonus jika ada, tipe pembayaran, dan lain-lain">
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Masukkan keunggulan rumahmu..."
            className="input"
          />
        </Field>

        <Field label="WhatsApp">
          <input
            type="tel"
            inputMode="numeric"
            maxLength={13}
            value={form.whatsapp}
            onChange={handleWhatsappChange}
            placeholder="Masukkan nomor WhatsApp (10-13 digit)"
            className="input"
          />
            </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-forest py-3.5 text-center font-semibold text-white hover:bg-forest-dark disabled:opacity-60"
        >
          {submitting ? 'Menyimpan...' : isEditMode ? 'SIMPAN PERUBAHAN' : 'POSTING'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, info, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-ink">
        {label}
        {info && <InfoTip text={info} />}
      </label>
      {children}
    </div>
  );
}
  
