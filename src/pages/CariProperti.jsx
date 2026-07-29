import React, { useState } from 'react';
import Seo from '../components/Seo';

// FormSubmit.co: tidak perlu daftar/API key. Cukup pastikan alamat email di
// bawah aktif — submission PERTAMA akan mengirim email konfirmasi ke
// rauma.contact@gmail.com, klik link "Activate Form" di email tersebut
// sekali saja, setelah itu semua submission berikutnya otomatis terkirim.
const CONTACT_EMAIL = 'rauma.contact@gmail.com';
const MAX_LENGTH = 500;

export default function CariProperti() {
  const [message, setMessage] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  function handleWhatsappChange(e) {
    const digits = e.target.value.replace(/\D/g, '');
    setWhatsapp(digits);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = message.trim();
    const nextErrors = {};

    if (!trimmed) {
      nextErrors.message = 'Ceritakan dulu rumah seperti apa yang kamu cari ya.';
    }
    if (whatsapp.length < 10 || whatsapp.length > 13) {
      nextErrors.whatsapp = 'Nomor WhatsApp harus 10-13 digit.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch(`https://formsubmit.co/ajax/${CONTACT_EMAIL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: 'Permintaan Carikan Properti - Rauma',
          Kriteria_Properti: trimmed,
          Nomor_WhatsApp: whatsapp,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setErrors({ form: 'Gagal mengirim, coba lagi sebentar lagi ya.' });
      }
    } catch (err) {
      setErrors({ form: 'Gagal terhubung ke server, coba lagi sebentar lagi ya.' });
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setMessage('');
    setWhatsapp('');
    setSubmitted(false);
    setErrors({});
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Seo
        title="Carikan Properti"
        description="Ceritakan rumah impianmu — jenis, harga, dan lokasi yang kamu inginkan — dan tim Rauma akan mencarikannya untukmu."
        path="/carikan-properti"
      />

      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-3 py-1 text-xs font-semibold text-forest">
          🔍 Layanan Gratis
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-navy sm:text-4xl">
          Bingung Cari Rumah?
          <br className="hidden sm:block" /> Biar Kami yang Carikan.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink/60">
          Cukup ceritakan rumah impianmu dan tinggalkan nomor WhatsApp-mu. Tim Rauma akan
          mencarikan pilihan terbaik dan menghubungimu begitu properti yang cocok ditemukan.
        </p>
      </div>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <label htmlFor="criteria" className="text-sm font-semibold text-ink">
            Ceritakan kebutuhan rumahmu
          </label>
          <textarea
            id="criteria"
            rows={5}
            maxLength={MAX_LENGTH}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Sebutkan jenis rumah, harga, dan lokasi yang kamu inginkan..."
            className="mt-2 w-full resize-none rounded-xl border border-line bg-cream px-4 py-3 text-sm text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
          />
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-red-500">{errors.message}</p>
            <p className="text-xs text-ink/40">{message.length}/{MAX_LENGTH}</p>
          </div>

          <div className="mt-4">
            <label htmlFor="whatsapp" className="text-sm font-semibold text-ink">
              Nomor WhatsApp kamu
            </label>
            <input
              id="whatsapp"
              type="tel"
              inputMode="numeric"
              value={whatsapp}
              onChange={handleWhatsappChange}
              placeholder="Contoh: 081234567890"
              className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
            />
            <p className="mt-1 text-xs text-red-500">{errors.whatsapp}</p>
            <p className="mt-1 text-xs text-ink/40">
              Nomor ini hanya dipakai tim Rauma untuk menghubungimu saat properti yang cocok
              sudah ketemu.
            </p>
          </div>

          {errors.form && <p className="mt-3 text-center text-xs text-red-500">{errors.form}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-dark disabled:opacity-60"
          >
            {submitting ? (
              'Mengirim...'
            ) : (
              <>
                <span aria-hidden>📩</span> Carikan Rumah untuk Saya
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="mt-8 rounded-2xl border border-forest/30 bg-forest/5 p-8 text-center">
          <p className="text-3xl">✅</p>
          <h2 className="mt-3 font-display text-xl font-bold text-navy">
            Oke, akan segera kami carikan!
          </h2>
          <p className="mt-2 text-sm text-ink/70">
            Tim Rauma sudah menerima kriteria kamu dan akan menghubungi lewat WhatsApp begitu
            properti yang cocok ditemukan.
          </p>
          <button
            onClick={handleReset}
            className="mt-5 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink/70 hover:bg-cream"
          >
            Cari kriteria lain
          </button>
        </div>
      )}
    </div>
  );
}
