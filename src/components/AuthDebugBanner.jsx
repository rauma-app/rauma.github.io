import React from 'react';
import { useAuth } from '../context/AuthContext';

// Muncul di halaman MANAPUN (bukan cuma yang butuh login) begitu ada info
// debug soal login redirect yang gagal/aneh. Sengaja fixed di atas layar
// biar kelihatan gak peduli kamu berakhir di halaman mana setelah balik
// dari Google. HAPUS komponen ini nanti setelah bug login beres -- ini
// cuma alat bantu sementara biar error kebaca tanpa perlu buka DevTools.
export default function AuthDebugBanner() {
  const { authDebug } = useAuth();

  if (!authDebug) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] border-b border-red-300 bg-red-50 px-4 py-3 text-xs text-red-800 shadow-lg">
      <p className="font-semibold">Debug -- login Google bermasalah:</p>
      {authDebug.code && <p className="mt-1 break-words">code: {authDebug.code}</p>}
      <p className="mt-1 break-words">{authDebug.message}</p>
    </div>
  );
}
