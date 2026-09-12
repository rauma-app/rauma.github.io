import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading, loginWithGoogle, authError } = useAuth();

  async function handleLoginClick() {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Login gagal:', err);
      alert(`Login gagal: ${err.code || err.message}`);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-ink/50">Memuat...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-ink/60">Silakan masuk dengan Google untuk melanjutkan.</p>
        <button
          onClick={handleLoginClick}
          className="mt-4 rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark"
        >
          Masuk dengan Google
        </button>
        {/* Sengaja ditampilkan langsung di layar (bukan cuma di console) --
            supaya kalau login gagal, errornya kebaca tanpa perlu buka
            DevTools, yang ribet diakses dari HP. HAPUS blok ini nanti
            setelah bug login ini beres, ini cuma buat debugging sementara. */}
        {authError && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-left text-xs text-red-700">
            <p className="font-semibold">Debug -- error login:</p>
            <p className="mt-1 break-words">code: {authError.code || '(tidak ada code)'}</p>
            <p className="mt-1 break-words">message: {authError.message || String(authError)}</p>
          </div>
        )}
      </div>
    );
  }

  return children;
}
