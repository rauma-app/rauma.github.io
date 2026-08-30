import React, { useRef, useState, useCallback } from 'react';
import Seo from '../components/Seo';

const SCALE_OPTIONS = [
  { label: '1x (ukuran asli)', value: 1 },
  { label: '2x', value: 2 },
  { label: '4x', value: 4 },
];

// Batas ukuran output biar browser (terutama di HP) gak nge-hang pas proses
// gambar besar. Bukan AI upscaling (kayak Real-ESRGAN di Upscayl) -- ini
// interpolasi gambar biasa + unsharp mask, jadi diproses cepat langsung di
// browser tanpa perlu server/GPU.
const MAX_OUTPUT_DIMENSION = 4000;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Unsharp mask sederhana: hitung versi "pentajam" pakai kernel konvolusi,
// lalu campur dengan piksel asli sesuai `amount` (0-1) dari slider ketajaman.
function sharpen(imageData, amount) {
  if (amount <= 0) return imageData;
  const { width, height, data } = imageData;
  const src = new Uint8ClampedArray(data); // salinan piksel asli buat dibaca
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        // hanya kanal R,G,B -- alpha dibiarkan apa adanya
        let sum = 0;
        let k = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const nIdx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += src[nIdx] * kernel[k];
            k++;
          }
        }
        const original = src[idx + c];
        data[idx + c] = original + (sum - original) * amount;
      }
    }
  }
  return imageData;
}

export default function PenjernihFoto() {
  const [originalSrc, setOriginalSrc] = useState(null);
  const [resultSrc, setResultSrc] = useState(null);
  const [scale, setScale] = useState(2);
  const [sharpenAmount, setSharpenAmount] = useState(50);
  const [processing, setProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const canvasRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('File yang dipilih bukan gambar.');
      return;
    }
    setError('');
    setFileName(file.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => {
      setOriginalSrc(reader.result);
      setResultSrc(null);
    };
    reader.readAsDataURL(file);
  }

  const handleProcess = useCallback(async () => {
    if (!originalSrc) return;
    setProcessing(true);
    setError('');
    try {
      const img = await loadImage(originalSrc);
      let targetW = img.width * scale;
      let targetH = img.height * scale;

      if (targetW > MAX_OUTPUT_DIMENSION || targetH > MAX_OUTPUT_DIMENSION) {
        const ratio = MAX_OUTPUT_DIMENSION / Math.max(targetW, targetH);
        targetW = Math.round(targetW * ratio);
        targetH = Math.round(targetH * ratio);
      }

      const canvas = canvasRef.current;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      if (sharpenAmount > 0) {
        const imageData = ctx.getImageData(0, 0, targetW, targetH);
        sharpen(imageData, sharpenAmount / 100);
        ctx.putImageData(imageData, 0, 0);
      }

      setResultSrc(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error(err);
      setError('Gagal memproses gambar. Coba gambar lain.');
    } finally {
      setProcessing(false);
    }
  }, [originalSrc, scale, sharpenAmount]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Seo
        title="Penjernih Foto"
        description="Perbesar dan pertajam foto rumah gratis langsung dari browser, tanpa upload ke server."
        path="/alat/penjernih-foto"
      />

      <h1 className="font-display text-2xl font-semibold text-navy">Penjernih Foto</h1>
      <p className="mt-1 text-sm text-ink/60">
        Perbesar ukuran & pertajam foto rumah kamu langsung di browser -- semua diproses
        di perangkat kamu sendiri, foto tidak dikirim ke server manapun.
      </p>

      <div className="mt-6 rounded-2xl border border-line bg-white p-5">
        <label
          htmlFor="photo-input"
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-cream px-4 py-8 text-center hover:border-forest"
        >
          <span className="text-sm font-medium text-ink">
            {fileName ? `Foto dipilih: ${fileName}` : 'Tap untuk pilih foto'}
          </span>
          <span className="mt-1 text-xs text-ink/50">JPG, PNG, atau WEBP</span>
        </label>
        <input
          id="photo-input"
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {originalSrc && (
          <>
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm font-medium text-ink">Perbesar</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SCALE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setScale(opt.value)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                        scale === opt.value
                          ? 'bg-forest text-white'
                          : 'border border-line text-ink/70 hover:border-forest'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm">
                  <label htmlFor="sharpen-slider" className="font-medium text-ink">
                    Ketajaman
                  </label>
                  <span className="text-ink/60">{sharpenAmount}%</span>
                </div>
                <input
                  id="sharpen-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={sharpenAmount}
                  onChange={(e) => setSharpenAmount(Number(e.target.value))}
                  className="mt-2 w-full accent-forest"
                />
              </div>

              <button
                type="button"
                onClick={handleProcess}
                disabled={processing}
                className="w-full rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark disabled:opacity-60"
              >
                {processing ? 'Memproses...' : 'Proses Foto'}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Sebelum
                </p>
                <img src={originalSrc} alt="Sebelum" className="w-full rounded-xl border border-line" />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Sesudah
                </p>
                {resultSrc ? (
                  <img src={resultSrc} alt="Sesudah" className="w-full rounded-xl border border-line" />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-line text-xs text-ink/40">
                    Hasil muncul di sini
                  </div>
                )}
              </div>
            </div>

            {resultSrc && (
              <a
                href={resultSrc}
                download={`${fileName || 'foto'}-jernih.png`}
                className="mt-4 block w-full rounded-full border border-forest px-6 py-2.5 text-center text-sm font-semibold text-forest hover:bg-forest/5"
              >
                Download Hasil
              </a>
            )}
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="mt-4 rounded-2xl border border-line bg-cream p-4 text-xs text-ink/50">
        <strong>Catatan:</strong> Alat ini memperbesar dan mempertajam foto memakai
        pemrosesan gambar biasa (bukan AI), jadi cocok buat foto blur ringan atau
        resolusi kecil. Untuk foto yang sudah sangat rusak/pecah, hasilnya tidak akan
        sebagus alat berbasis AI khusus seperti Upscayl.
      </div>
    </div>
  );
}
