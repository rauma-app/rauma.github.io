import { useEffect, useState, useCallback } from 'react';

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // Safari iOS lama pakai properti non-standar ini
    window.navigator.standalone === true
  );
}

/**
 * Hook buat tombol "Download Aplikasi" di Footer.
 *
 * - Android/Chrome/Edge: browser nembak event `beforeinstallprompt`, kita
 *   tangkap & simpan, baru dipanggil pas tombol diklik (`promptInstall()`).
 * - iOS Safari: TIDAK support event itu sama sekali -- satu-satunya cara
 *   install adalah manual lewat tombol Share -> "Add to Home Screen".
 *   Jadi kita cuma bisa kasih instruksi (`needsIosInstructions`), gak bisa
 *   trigger dialognya langsung.
 * - Kalau situs udah ke-install (dibuka dalam mode standalone), sembunyikan
 *   tombolnya sama sekali -- gak ada gunanya install lagi.
 */
export function usePwaInstall() {
  const [deferredEvent, setDeferredEvent] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());

    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredEvent(e);
    }
    function handleAppInstalled() {
      setInstalled(true);
      setDeferredEvent(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const canPromptInstall = Boolean(deferredEvent) && !installed;
  const needsIosInstructions = isIos() && !installed && !canPromptInstall;

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return false;
    deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    setDeferredEvent(null);
    return outcome === 'accepted';
  }, [deferredEvent]);

  return { installed, canPromptInstall, needsIosInstructions, promptInstall };
}
