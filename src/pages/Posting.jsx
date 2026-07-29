import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadManyToR2 } from '../lib/r2';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../lib/admin';
import { isPremium, FREE_LISTING_LIMIT, PREMIUM_LISTING_LIMIT } from '../lib/premium';
import LocationAutocomplete from '../components/LocationAutocomplete';

const PREMIUM_WHATSAPP = '6285156222635';
const PREMIUM_PRICE_LABEL = 'Rp250.000 (Lifetime)';

const SERTIFIKAT_OPTIONS = ['SHM', 'SHGB', 'HGB', 'AJB', 'Girik', 'PPJB', 'Lainnya'];
const AIR_OPTIONS = ['PDAM', 'Sumur Bor', 'Sumur Gali', 'Lainnya'];

const TYPE_LABELS = {
  pribadi: 'Pribadi',
  perumahan: 'Perumahan',
  take_over_kpr: 'Take Over KPR',
  subsidi: 'Subsidi',
  jual_cepat: 'Jual Cepat',
};

// Tipe listing yang punya field "Cicilan Mulai dari" manual.
const CICILAN_TYPES = ['perumahan', 'subsidi', 'take_over_kpr'];

const emptyForm = {
  type: 'pribadi',
  priceRaw: '', // angka mentah tanpa titik, contoh "100000000"
  cicilanRaw: '', // angka mentah cicilan bulanan manual, contoh "2500000"
  location: null, // { label, kabupaten, kecamatan, lat, lon }
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
};

const MAX_PHOTOS = 5;

function formatThousands(digits) {
  if (!digits) return '';
  return new Intl.NumberFormat('id-ID').format(Number(digits));
}

export default function Posting() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // ada isinya kalau mode EDIT, kosong kalau mode TAMBAH BARU
  const isEditMode = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [priceDisplay, setPriceDisplay] = useState('');
  const [cicilanDisplay, setCicilanDisplay] = useState('');
  const [files, setFiles] = useState([]); // foto BARU (File object) yang belum di-upload
  const [existingImages, setExistingImages] = useState([]); // foto LAMA (url string), khusus edit mode
  const [previews, setPreviews] = useState([]); // gabungan url lama + preview foto baru, untuk ditampilkan
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [error, setError] = useState('');
  const [listingCount, setListingCount] = useState(null); // null = belum dicek

  const userIsAdmin = isAdmin(user);
  const userIsPremium = isPremium(user);
  const listingLimit = userIsAdmin ? Infinity : userIsPremium ? PREMIUM_LISTING_LIMIT : FREE_LISTING_LIMIT;
  const limitReached = !isEditMode && listingCount !== null && listingCount >= listingLimit;

  // Cek berapa iklan yang sudah dipunya user, buat nentuin masih boleh
  // nambah iklan baru atau udah mentok limit (2 buat user biasa, 50
  // buat premium, admin gak dibatasi).
  useEffect(() => {
    if (isEditMode || !user || userIsAdmin) return;
    let cancelled = false;

    async function loadCount() {
      try {
        const q = query(collection(db, 'listings'), where('ownerUid', '==', user.uid));
        const snap = await getDocs(q);
        if (!cancelled) setListingCount(snap.size);
      } catch (err) {
        console.error(err);
      }
    }

    loadCount();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, user, userIsAdmin]);

  // Mode edit: ambil data listing lama, isi form otomatis.
  useEffect(() => {
    if (!isEditMode || !user) return;
    let cancelled = false;

    async function loadExisting() {
      setLoadingExisting(true);
      try {
        const snap = await getDoc(doc(db, 'listings', id));
        if (!snap.exists()) {
          setError('Iklan tidak ditemukan.');
          return;
        }
        const data = snap.data();
        if (data.ownerUid !== user.uid) {
          setError('Kamu tidak punya akses untuk mengedit iklan ini.');
          return;
        }
        if (cancelled) return;

        setForm({
          type: data.type || 'pribadi',
          priceRaw: String(data.price || ''),
          cicilanRaw: data.cicilanPerBulan ? String(data.cicilanPerBulan) : '',
          location: {
            label: data.kecamatan ? `${data.kecamatan} - ${data.kabupaten}` : data.kabupaten,
            kabupaten: data.kabupaten || '',
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
          whatsapp: data.whatsapp || '',
        });
        setPriceDisplay(formatThousands(String(data.price || '')));
        setCicilanDisplay(data.cicilanPerBulan ? formatThousands(String(data.cicilanPerBulan)) : '');
        setExistingImages(data.images || []);
        setPreviews(data.images || []);
      } catch (err) {
        console.error(err);
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
      // Hapus dari foto lama
      const updatedExisting = existingImages.filter((_, i) => i !== index);
      setExistingImages(updatedExisting);
      setPreviews([...updatedExisting, ...files.map((f) => URL.createObjectURL(f))]);
    } else {
      // Hapus dari foto baru
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

    if (form.whatsapp.length < 10 || form.whatsapp.length > 13) {
      setError('Nomor WhatsApp harus 10-13 digit.');
      return;
    }

    if (form.videoUrl && !/^https?:\/\//i.test(form.videoUrl.trim())) {
      setError('URL video harus diawali http:// atau https://');
      return;
    }

    setSubmitting(true);
    try {
      const newImageUrls = files.length ? await uploadManyToR2(files) : [];
      const imageUrls = [...existingImages, ...newImageUrls];

      const payload = {
        type: form.type,
        price: Number(form.priceRaw),
        cicilanPerBulan: CICILAN_TYPES.includes(form.type) && form.cicilanRaw ? Number(form.cicilanRaw) : null,
        kabupaten: form.location.kabupaten,
        kecamatan: form.location.kecamatan,
        lat: form.location.lat,
        lon: form.location.lon,
        luasTanah: form.luasTanah ? Number(form.luasTanah) : null,
        luasBangunan: form.luasBangunan ? Number(form.luasBangunan) : null,
        unitTersedia: form.type === 'perumahan' && form.unitTersedia ? Number(form.unitTersedia) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        electricity: form.electricity || null,
        air: form.air || null,
        sertifikat: form.sertifikat || null,
        videoUrl: form.videoUrl ? form.videoUrl.trim() : null,
        description: form.description || '',
        whatsapp: form.whatsapp || '',
        images: imageUrls,
      };

      if (isEditMode) {
        // User biasa yang edit -> balik ke 'pending', ditinjau ulang admin.
        // Admin yang edit -> tetap 'approved', gak perlu antri lagi.
        await updateDoc(doc(db, 'listings', id), {
          ...payload,
          status: userIsAdmin ? 'approved' : 'pending',
        });
        navigate(`/id/${id}`);
      } else {
        const docRef = await addDoc(collection(db, 'listings'), {
          ...payload,
          status: userIsAdmin ? 'approved' : 'pending',
          ownerUid: user.uid,
          // Firestore menolak field bernilai `undefined`. Sebagian akun
          // Google bisa saja tidak punya displayName/photoURL, jadi fallback
          // ke null biar addDoc tidak gagal untuk akun-akun itu.
          ownerName: user.displayName || null,
          ownerPhoto: user.photoURL || null,
          createdAt: serverTimestamp(),
        });
        navigate(`/id/${docRef.id}`);
      }
    } catch (err) {
      console.error('Gagal menyimpan iklan:', err.code || err.message, err);
      // Sertakan kode/pesan error asli biar gampang didiagnosis -- jangan
      // digeneralisir jadi satu pesan yang sama untuk semua jenis kegagalan
      // (rules, upload gambar, jaringan, dsb).
      const detail = err.code || err.message;
      setError(`Gagal menyimpan iklan${detail ? ` (${detail})` : ''}. Coba lagi ya.`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingExisting) {
    return <div className="mx-auto max-w-xl px-4 py-16 text-center text-ink/50">Memuat data iklan...</div>;
  }

  if (limitReached) {
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
            Akun kamu udah punya {listingCount} iklan. Bantu kami dengan Upgrade ke <b>Rauma Premium</b> ({PREMIUM_PRICE_LABEL}) buat lanjut posting lebih banyak.
          
          </p>

          <ul className="mt-4 space-y-1.5 text-left text-sm text-ink/80">
            <li>✅ Posting iklan maksimal {PREMIUM_LISTING_LIMIT}</li>
            <li>✅ Dapat ceklis biru</li>
            <li>✅ Profil bisa dibuka publik</li>
            <li>✅ Buka fitur Perumahan, Subsidi &amp; Jual Cepat</li>
            <li>✅ Gratis kartu nama dari Rauma ID</li>
            <li>✅ Posting Video rumah di akun TT/IG/FB/YT Rauma.id </li>
          </ul>
          <p><i> Bukan untuk foya foya, Uang akan digunakan untuk upgrade Kapasitas server dan
              Marketing agar makin banyak user berkunjung</i></p>
          

          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex items-center justify-center gap-2 rounded-full bg-forest px-4 py-3 text-sm font-semibold text-white hover:bg-forest-dark"
          >
            <span aria-hidden>💬</span> Upgrade ke Premium via WhatsApp
          </a>
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
        {/* Toggle Pribadi/Take Over KPR (+ Perumahan/Subsidi/Jual Cepat khusus admin & premium) */}
        <div className="flex flex-wrap gap-2">
          {['pribadi', 'take_over_kpr', ...(userIsAdmin || userIsPremium ? ['perumahan', 'subsidi', 'jual_cepat'] : [])].map((t) => (
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
        {!userIsAdmin && (
          <p className="-mt-3 text-xs text-ink/40">
            Iklan kamu akan ditinjau dulu sebelum tayang publik (biasanya cepat).
          </p>
        )}

        {/* Upload gambar */}
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
            <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 focus-within:border-forest">
              <span className="text-ink/50">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="100.000.000"
                value={priceDisplay}
                onChange={handlePriceChange}
                className="w-full bg-transparent py-3 text-ink placeholder:text-ink/40 outline-none"
              />
            </div>
          </Field>

          {CICILAN_TYPES.includes(form.type) && (
            <Field label="Cicilan Mulai dari">
              <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 focus-within:border-forest">
                <span className="text-ink/50">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="2.500.000"
                  value={cicilanDisplay}
                  onChange={handleCicilanChange}
                  className="w-full bg-transparent py-3 text-ink placeholder:text-ink/40 outline-none"
                />
              </div>
              <p className="mt-1.5 text-xs text-ink/40">Opsional. Cicilan per bulan, tampil berdampingan dengan harga jual.</p>
            </Field>
          )}
        </div>

        <Field label="Lokasi">
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

        <Field label="URL Video">
          <input
            type="url"
            value={form.videoUrl}
            onChange={(e) => update('videoUrl', e.target.value)}
            placeholder="Masukkan link video jika ada (YouTube/TikTok/Instagram)"
            className="input"
          />
          <p className="mt-1.5 text-xs text-ink/40">Opsional. Tempel link video tur rumah kalau ada.</p>
        </Field>

        <Field label="Deskripsi">
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

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-ink">{label}</label>
      {children}
    </div>
  );
}
