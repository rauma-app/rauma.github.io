import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router (SPA) gak otomatis reset scroll position tiap pindah
 * halaman -- jadi kalau tadinya scroll ke bawah terus klik ke halaman
 * lain, halaman baru itu bakal "nyangkut" di posisi scroll yang sama.
 * Komponen ini dengerin tiap perubahan URL dan paksa scroll ke atas.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

