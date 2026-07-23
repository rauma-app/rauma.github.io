import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading, loginWithGoogle } = useAuth();

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
      </div>
    );
  }

  return children;
}
