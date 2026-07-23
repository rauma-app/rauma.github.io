import React, { createContext, useContext, useEffect, useState } from 'react';
import { getRedirectResult, onAuthStateChanged, signInWithRedirect, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext(null);
const REDIRECT_KEY = 'rauma_redirect_after_login';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Tangkap hasil signInWithRedirect secara eksplisit, biar kalau ada
    // error (misal domain belum diizinkan, storage diblokir browser, dst)
    // kelihatan jelas -- bukan gagal diam-diam.
    getRedirectResult(auth).catch((err) => {
      console.error('Redirect sign-in error:', err);
      alert(`Login gagal: ${err.code || err.message}`);
    });

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);

      if (u) {
        const redirectTo = sessionStorage.getItem(REDIRECT_KEY);
        if (redirectTo) {
          sessionStorage.removeItem(REDIRECT_KEY);
          navigate(redirectTo);
        }
      }
    });
    return unsub;
  }, [navigate]);

  // redirectTo: halaman yang mau dituju SETELAH login berhasil (misal '/posting')
  async function loginWithGoogle(redirectTo = '/posting') {
    sessionStorage.setItem(REDIRECT_KEY, redirectTo);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      console.error('Gagal memulai sign-in:', err);
      alert(`Gagal memulai login: ${err.code || err.message}`);
    }
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
