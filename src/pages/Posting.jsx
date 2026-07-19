import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import LocationAutocomplete from '../components/LocationAutocomplete';

const SERTIFIKAT_OPTIONS = ['SHM', 'SHGB', 'HGB', 'AJB', 'Girik', 'PPJB', 'Lainnya'];
const AIR_OPTIONS = ['PDAM', 'Sumur Bor', 'Sumur Gali', 'Lainnya'];

const emptyForm = {
  type: 'pribadi',
  price: '',
  location: null, // { label, kabupaten, kecamatan, lat, lon }
  luasTanah: '',
  luasBangunan: '',
  bedrooms: '',
  bathrooms: '',
  electricity: '',
  air: '',
  sertifikat: '',
  description: '',
  whatsapp: '',
};

export default function Posting() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleFiles(e) {
    const selected = Array.from(e.target.files || []).slice(0, 8);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.price || !form.location || files.length === 0) {
      setError('Harga, lokasi, dan minimal 1 foto wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const imageUrls = [];
      for (const file of files) {
        const path = `listings/${user.uid}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        imageUrls.push(await getDownloadURL(storageRef));
      }

      const docRef = await addDoc(collection(db, 'listings'), {
        type: form.type,
        price: Number(form.price),
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
        description: form.description || '',
        whatsapp: form.whatsapp || '',
        images: imageUrls,
        ownerUid: user.uid,
        ownerName: user.displayName,
        ownerPhoto: user.photoURL,
        createdAt: serverTimestamp(),
      });

      navigate(`/id/${docRef.id}`);
    } catch (err) {
      console.error(err);
      setError('Gagal memposting iklan. Coba lagi ya.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-navy">Pasang Iklan</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Toggle Pribadi/Perumahan */}
        <div className="flex gap-2">
          {['pribadi', 'perumahan'].map((t) => (
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
              {t}
            </button>
          ))}
        </div>

        {/* Upload gambar */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">Foto Rumah</label>
          <label className="flex h-28 w-28 cursor-pointer items-center justify-center rounded-xl bg-ink/70 text-3xl text-white hover:bg-ink/80">
            +
            <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
          </label>
          {previews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <img key={i} src={src} alt={`preview ${i + 1}`} className="h-20 w-20 rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>

        <Field label="Harga">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Rp 100.000.000"
            value={form.price}
            onChange={(e) => update('price', e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Lokasi">
          <LocationAutocomplete
            value={form.location}
            onSelect={(loc) => update('location', loc)}
            placeholder="Kota/Kabupaten - Kecamatan"
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
            value={form.whatsapp}
            onChange={(e) => update('whatsapp', e.target.value)}
            placeholder="Masukkan nomor WhatsApp"
            className="input"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-forest py-3.5 text-center font-semibold text-white hover:bg-forest-dark disabled:opacity-60"
        >
          {submitting ? 'Memposting...' : 'POSTING'}
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
