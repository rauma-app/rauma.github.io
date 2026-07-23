        import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadManyToR2 } from '../lib/r2';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../lib/admin';
import LocationAutocomplete from '../components/LocationAutocomplete';

const SERTIFIKAT_OPTIONS = ['SHM', 'SHGB', 'HGB', 'AJB', 'Girik', 'PPJB', 'Lainnya'];
const AIR_OPTIONS = ['PDAM', 'Sumur Bor', 'Sumur Gali', 'Lainnya'];

const emptyForm = {
  type: 'pribadi',
  priceRaw: '', // angka mentah tanpa titik, contoh "100000000"
  location: null, // { label, kabupaten, kecamatan, lat, lon }
  luasTanah: '',
  luasBangunan: '',
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
  const [files, setFiles] = useState([]); // foto BARU (File object) yang belum di-upload
  const [existingImages, setExistingImages] = useState([]); // foto LAMA (url string), khusus edit mode
  const [previews, setPreviews] = useState([]); // gabungan url lama + preview foto baru, untuk ditampilkan
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [error, setError] = useState('');

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
          location: {
            label: data.kecamatan ? `${data.kecamatan} - ${data.kabupaten}` : data.kabupaten,
            kabupaten: data.kabupaten || '',
            kecamatan: data.kecamatan || '',
            lat: data.lat,
            lon: data.lon,
          },
          luasTanah: data.luasTanah ?? '',
          luasBangunan: data.luasBangunan ?? '',
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
        kabupaten: form.location.kabupaten,
        kecamatan: form.location.kecamatan,
        lat: form.location.lat,
        lon: form.location.lon,
        luasTanah: form.luasTanah ? Number(form.luasTanah) : null,
        luasBangunan: form.luasBangunan ? Number(form.luasBangunan) : null,
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
          status: isAdmin(user) ? 'approved' : 'pending',
        });
        navigate(`/id/${id}`);
      } else {
        const docRef = await addDoc(collection(db, 'listings'), {
          ...payload,
          status: isAdmin(user) ? 'approved' : 'pending',
          ownerUid: user.uid,
          ownerName: user.displayName,
          ownerPhoto: user.photoURL,
          createdAt: serverTimestamp(),
        });
        navigate(`/id/${docRef.id}`);
      }
    } catch (err) {
      console.error(err);
      setError('Gagal menyimpan iklan. Coba lagi ya.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingExisting) {
    return <div className="mx-auto max-w-xl px-4 py-16 text-center text-ink/50">Memuat data iklan...</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-navy">
        {isEditMode ? 'Edit Iklan' : 'Pasang Iklan'}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Toggle Pribadi/Perumahan (+ Subsidi khusus admin) */}
        <div className="flex flex-wrap gap-2">
          {['pribadi', 'perumahan', ...(isAdmin(user) ? ['subsidi', 'jual_cepat'] : [])].map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => update('type', t)}
              className={`rounded-full border px-5 py-2 text-sm font-semibold capitalize transition-colors ${
                form.type === t
                  ? 'border-navy bg-navy text-white'
                  : 'border-line bg-white text-ink/60'
              }`}
            >
              {t === 'jual_cepat' ? 'Jual Cepat' : t}
            </button>
          ))}
        </div>
        {!isAdmin(user) && (
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

        <Field label="Lokasi">
          <LocationAutocomplete
            value={form.location}
            onSelect={(loc) => update('location', loc)}
            placeholder="Cari Kecamatan..."
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Luas Tanah (m²)">
            <input
              type="number"
              value={form.luasTanah}
              onChange={(e) => update('luasTanah', e.target.value)}
              placeholder="Masukkan luas tanah"
              className="input"
            />
          </Field>
          <Field label="Luas Bangunan (m²)">
            <input
              type="number"
              value={form.luasBangunan}
              onChange={(e) => update('luasBangunan', e.target.value)}
              placeholder="Masukkan luas bangunan"
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

                             
