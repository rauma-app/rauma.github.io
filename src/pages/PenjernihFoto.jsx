import React, { useRef, useState, useEffect, useCallback } from 'react';
import Seo from '../components/Seo';

const SCALE_OPTIONS = [
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '4x', value: 4 },
];

// Batas ukuran output biar browser (terutama di HP) gak nge-hang pas proses
// gambar besar. Ini BUKAN AI upscaling (kayak Real-ESRGAN di Upscayl) --
// melainkan kombinasi resize halus + auto-kontras + saturasi + unsharp mask,
// semua dihitung langsung di browser tanpa server/GPU.
const MAX_OUTPUT_DIMENSION = 4000;
const PROCESS_DEBOUNCE_MS = 120;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

// Auto-contrast: regangkan histogram tiap kanal warna berdasarkan persentil,
// biar foto yang keliatan "kusam"/pudar jadi lebih hidup -- efek utama yang
// bikin hasil "penjernihan" ini kelihatan jelas bedanya, bukan cuma tajam
// dikit doang.
function autoLevels(imageData, clipPercent = 0.5) {
  const { data } = imageData;
  const total = data.length / 4;
  const histR = new Array(256).fill(0);
  const histG = new Array(256).fill(0);
  const histB = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    histR[data[i]]++;
    histG[data[i + 1]]++;
    histB[data[i + 2]]++;
  }
  const clip = total * (clipPercent / 100);
  function bounds(hist) {
    let low = 0;
    let high = 255;
    let count = 0;
    for (let i = 0; i < 256; i++) {
      count += hist[i];
      if (count > clip) {
        low = i;
        break;
      }
    }
    count = 0;
    for (let i = 255; i >= 0; i--) {
      count += hist[i];
      if (count > clip) {
        high = i;
        break;
      }
    }
    if (high <= low) return [0, 255];
    return [low, high];
  }
  const [rl, rh] = bounds(histR);
  const [gl, gh] = bounds(histG);
  const [bl, bh] = bounds(histB);
  const stretch = (v, lo, hi) => clamp255(((v - lo) / (hi - lo)) * 255);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = stretch(data[i], rl, rh);
    data[i + 1] = stretch(data[i + 1], gl, gh);
    data[i + 2] = stretch(data[i + 2], bl, bh);
  }
  return imageData;
}

// Naikkan saturasi dikit biar warna "pop", umum dipakai alat enhance foto.
function adjustSaturation(imageData, factor) {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = clamp255(gray + (r - gray) * factor);
    data[i + 1] = clamp255(gray + (g - gray) * factor);
    data[i + 2] = clamp255(gray + (b - gray) * factor);
  }
}

// Unsharp mask: campur piksel asli dengan versi konvolusi kernel pentajam,
// porsinya diatur `amount` (0-1) dari slider ketajaman.
function sharpen(imageData, amount) {
  if (amount <= 0) return imageData;
  const { width, height, data } = imageData;
  const src = new Uint8ClampedArray(data);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let k = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            sum += src[((y + ky) * width + (x + kx)) * 4 + c] * kernel[k];
            k++;
          }
        }
        const original = src[idx + c];
        data[idx + c] = clamp255(original + (sum - original) * amount);
      }
    }
  }
  return imageData;
}

// Slider bandingkan sebelum/sesudah dalam 1 gambar, gaya Squoosh: tarik
// pegangan di tengah untuk geser batas kiri/kanan.
function BeforeAfterSlider({ beforeSrc, afterSrc, processing }) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(50);

  const updateFromClientX = useCallback((clientX) => {
    const rect = containerRef.current.getBoundingClientRect();
    let pct = ((clientX - rect.left) / rect.width) * 100;
    pct = Math.min(100, Math.max(0, pct));
    setPosition(pct);
  }, []);

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  }
  function handlePointerMove(e) {
    if (e.buttons === 0 && e.pointerType !== 'touch') return;
    updateFromClientX(e.clientX);
  }

  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs font-semibold uppercase tracking-wide text-ink/50">
        <span>Sebelum</span>
        <span>Sesudah</span>
      </div>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="relative w-full touch-none select-none overflow-hidden rounded-xl border border-line bg-cream"
        style={{ aspectRatio: '4 / 3' }}
      >
        <img
          src={afterSrc || beforeSrc}
          alt="Sesudah"
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
        />
        <img
          src={beforeSrc}
          alt="Sebelum"
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
          style={{ clipPath: `polygon(0 0, ${position}% 0, ${position}% 100%, 0 100%)` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow"
          style={{ left: `${position}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-forest shadow"
          style={{ left: `${position}%` }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5l-6 7 6 7V5zM16 5v14l6-7-6-7z" />
          </svg>
        </div>
        {processing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-xs font-medium text-white">
            Memproses...
          </div>
        )}
      </div>
    </div>
  );
}

export default function PenjernihFoto() {
  const [originalSrc, setOriginalSrc] = useState(null);
  const [resultSrc, setResultSrc] = useState(null);
  const [scale, setScale] = useState(2);
  const [sharpenAmount, setSharpenAmount] = useState(60);
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

  // Proses otomatis begitu foto dipilih, dan diproses ulang tiap kali
  // pengaturan (perbesar/ketajaman) diubah -- gak perlu klik tombol apapun.
  useEffect(() => {
    if (!originalSrc) return;
    let cancelled = false;
    setProcessing(true);
    setError('');

    const timer = setTimeout(async () => {
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

        const imageData = ctx.getImageData(0, 0, targetW, targetH);
        autoLevels(imageData, 0.5);
        adjustSaturation(imageData, 1.12);
        sharpen(imageData, sharpenAmount / 100);
        ctx.putImageData(imageData, 0, 0);

        if (!cancelled) setResultSrc(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Gagal memproses gambar. Coba gambar lain.');
      } finally {
        if (!cancelled) setProcessing(false);
      }
    }, PROCESS_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
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
        Upload foto, hasilnya otomatis diproses. Geser pegangan di tengah gambar untuk
        bandingkan sebelum & sesudah. Semua diproses di perangkat kamu sendiri, foto
        tidak dikirim ke server manapun.
      </p>

      <div className="mt-6 rounded-2xl border border-line bg-white p-5">
        <label
          htmlFor="photo-input"
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-cream px-4 py-8 text-center hover:border-forest"
        >
          <span className="text-sm font-medium text-ink">
            {fileName ? `Ganti foto (dipilih: ${fileName})` : 'Tap untuk pilih foto'}
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
            <div className="mt-5">
              <BeforeAfterSlider beforeSrc={originalSrc} afterSrc={resultSrc} processing={processing} />
            </div>

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
        <strong>Catatan:</strong> Alat ini memakai pemrosesan gambar biasa (auto-kontras,
        saturasi, dan penajaman), bukan AI, jadi cocok buat foto blur ringan/kusam. Untuk
        foto yang sudah sangat rusak/pecah, hasilnya tidak akan sebagus alat berbasis AI
        khusus seperti Upscayl.
      </div>
    </div>
  );
}
  
