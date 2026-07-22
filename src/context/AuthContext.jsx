import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithRedirect, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext(null);
const REDIRECT_KEY = 'rauma_redirect_after_login';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // onAuthStateChanged juga yang menangkap hasil signInWithRedirect
    // begitu user kembali dari halaman login Google.
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
    await signInWithRedirect(auth, googleProvider);
    // Baris setelah ini biasanya tidak sempat jalan karena browser
    // langsung pindah halaman ke Google.
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
