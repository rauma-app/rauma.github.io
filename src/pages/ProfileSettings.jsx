import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { d1Api } from '../lib/d1Api';
import { r2Uploader } from '../lib/r2Uploader';
import Seo from '../components/Seo';

export default function ProfileSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  const [description, setDescription] = useState('');
  const [username, setUsername] = useState('');

  // Kalau belum login, tendang ke beranda (menu ini dibuka lewat link yang
  // sudah dijaga ProtectedRoute juga, tapi jaga-jaga akses URL langsung).
  useEffect(() => {
    if (!authLoading && !user) navigate('/');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const profile = await d1Api.getProfile(user.uid);
        // Belum pernah isi profil -> pakai default dari akun Google.
        setName(profile?.name || user.displayName || '');
        setPhoto(profile?.photo || user.photoURL || '');
        setDescription(profile?.description || '');
        setUsername(profile?.username || '');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingPhoto(true);
    try {
      const url = await r2Uploader.uploadFile(file);
      setPhoto(url);
    } catch (err) {
      setError(err.message || 'Gagal mengunggah foto');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!name.trim()) {
      setError('Nama tidak boleh kosong');
      return;
    }

    setSaving(true);
    try {
      await d1Api.updateProfile({
        name: name.trim(),
        photo,
        description: description.trim(),
        username: username.trim(),
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-ink/50">Memuat...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Seo title="Profil Saya" description="Kelola nama, foto, dan deskripsi profil kamu di Rauma." path="/profil-saya" />

      <h1 className="font-display text-2xl font-semibold text-navy">Profil Saya</h1>
      <p className="mt-1 text-sm text-ink/60">
        Nama dan foto ini akan muncul sebagai identitas kamu di setiap iklan yang kamu posting.
      </p>

      <form onSubmit={handleSave} className="mt-6 space-y-6 rounded-2xl border border-line bg-white p-6">
        {/* Foto profil */}
        <div className="flex items-center gap-4">
          <img
            src={photo || user?.photoURL}
            alt={name}
            referrerPolicy="no-referrer"
            className="h-20 w-20 rounded-full border border-line object-cover"
          />
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-forest disabled:opacity-50"
            >
              {uploadingPhoto ? 'Mengunggah...' : 'Ganti Foto'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Nama */}
        <div>
          <label className="block text-sm font-medium text-ink">Nama</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="mt-1 w-full rounded-xl border border-line px-4 py-2.5 text-sm focus:border-forest focus:outline-none"
            placeholder="Nama yang tampil di iklan"
          />
        </div>

        {/* Username (opsional) */}
        <div>
          <label className="block text-sm font-medium text-ink">Username (opsional)</label>
          <div className="mt-1 flex items-center overflow-hidden rounded-xl border border-line focus-within:border-forest">
            <span className="whitespace-nowrap bg-cream px-3 py-2.5 text-sm text-ink/50">rauma.id/u/</span>
            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
              }
              maxLength={20}
              className="w-full min-w-0 px-2 py-2.5 text-sm focus:outline-none"
              placeholder="namakamu"
            />
          </div>
          <p className="mt-1 text-xs text-ink/40">
            3-20 karakter, huruf kecil/angka/underscore. Kosongkan kalau tidak perlu link pendek.
          </p>
        </div>

        {/* Deskripsi */}
        <div>
          <label className="block text-sm font-medium text-ink">Deskripsi</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={4}
            className="mt-1 w-full resize-none rounded-xl border border-line px-4 py-2.5 text-sm focus:border-forest focus:outline-none"
            placeholder="Ceritakan sedikit tentang kamu, misalnya jenis properti yang biasa kamu tawarkan"
          />
          <p className="mt-1 text-right text-xs text-ink/40">{description.length}/500</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-forest">Profil berhasil disimpan.</p>}

        <button
          type="submit"
          disabled={saving || uploadingPhoto}
          className="w-full rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-dark disabled:opacity-50"
        >
          {saving ? 'Menyimpan...' : 'Simpan Profil'}
        </button>
      </form>
    </div>
  );
}
