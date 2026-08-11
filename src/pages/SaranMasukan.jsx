import React, { useState } from 'react';
import Seo from '../components/Seo';

// FormSubmit.co: sama seperti formulir "Carikan Properti", tidak perlu
// daftar/API key. Kirim ke email yang sama, cuma subjek & isinya beda.
const CONTACT_EMAIL = 'rauma.contact@gmail.com';
const MAX_LENGTH = 500;

export default function SaranMasukan() {
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
      nextErrors.message = 'Tulis dulu saran atau masukanmu ya.';
    }
    if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 13)) {
      nextErrors.whatsapp = 'Nomor WhatsApp harus 10-13 digit (atau kosongkan saja kalau tidak perlu dibalas).';
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
          _subject: 'Saran & Masukan - Rauma',
          Saran_Masukan: trimmed,
          Nomor_WhatsApp: whatsapp || '(tidak diisi)',
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
        title="Saran & Masukan"
        description="Punya saran, kritik, atau menemukan masalah di Rauma.id? Sampaikan langsung ke tim kami."
        path="/saran-masukan"
      />

      <div className="text-center">
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-navy sm:text-4xl">
          Punya Saran atau Masukan?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink/60">
          Rauma.id terus berkembang berkat masukan dari pengguna seperti kamu. Ceritakan apa yang
          bisa kami perbaiki, fitur yang kamu harapkan, atau kendala yang kamu temui.
        </p>
      </div>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <label htmlFor="message" className="text-sm font-semibold text-ink">
            Saran, kritik, atau masukanmu
          </label>
          <textarea
            id="message"
            rows={5}
            maxLength={MAX_LENGTH}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tulis apa saja yang ingin kamu sampaikan ke tim Rauma..."
            className="mt-2 w-full resize-none rounded-xl border border-line bg-cream px-4 py-3 text-sm text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
          />
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-red-500">{errors.message}</p>
            <p className="text-xs text-ink/40">{message.length}/{MAX_LENGTH}</p>
          </div>

          <div className="mt-4">
            <label htmlFor="whatsapp" className="text-sm font-semibold text-ink">
              Nomor WhatsApp <span className="font-normal text-ink/40">(opsional, kalau ingin dibalas)</span>
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
                <span aria-hidden>📩</span> Kirim Masukan
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="mt-8 rounded-2xl border border-forest/30 bg-forest/5 p-8 text-center">
          <p className="text-3xl">✅</p>
          <h2 className="mt-3 font-display text-xl font-bold text-navy">
            Terima kasih atas masukannya!
          </h2>
          <p className="mt-2 text-sm text-ink/70">
            Tim Rauma sudah menerima pesanmu dan akan meninjaunya. Kalau kamu mencantumkan nomor
            WhatsApp, kami akan menghubungi jika diperlukan.
          </p>
          <button
            onClick={handleReset}
            className="mt-5 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink/70 hover:bg-cream"
          >
            Kirim masukan lain
          </button>
        </div>
      )}
    </div>
  );
}
