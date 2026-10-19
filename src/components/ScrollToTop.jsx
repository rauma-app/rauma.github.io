import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router (SPA) gak otomatis reset scroll position tiap pindah
 * halaman. Komponen ini paksa scroll ke atas tiap pindah halaman.
 *
 * Untuk halaman iklan (/id/:id/:slug), yang dihitung "halaman baru"
 * cuma kalau ID-nya berubah. Perubahan slug saja (rapihin URL otomatis)
 * tidak boleh menggulung layar ke atas lagi.
 */
function scrollKey(pathname) {
  const m = pathname.match(/^\/id\/([^/]+)/);
  return m ? `/id/${m[1]}` : pathname;
}

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const key = scrollKey(pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);

  return null;
}
