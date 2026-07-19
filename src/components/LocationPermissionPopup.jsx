import React, { useEffect, useState } from 'react';

const DISMISS_KEY = 'rauma_location_prompt_dismissed';

export default function LocationPermissionPopup({ onLocationGranted }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, '1');
  }

  function handleAllow() {
    if (!navigator.geolocation) {
      dismiss();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationGranted?.({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        dismiss();
      },
      () => dismiss(),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:bottom-6">
      <div className="flex w-full max-w-md items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-xl">
        <span className="text-2xl" aria-hidden>📍</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">Aktifkan lokasi kamu</p>
          <p className="mt-0.5 text-sm text-ink/60">
            Biar kami bisa tampilkan rumah yang paling dekat dengan lokasi kamu duluan.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAllow}
              className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-dark"
            >
              Aktifkan Lokasi
            </button>
            <button
              onClick={dismiss}
              className="rounded-full px-4 py-2 text-sm font-medium text-ink/50 hover:bg-cream"
            >
              Nanti saja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
