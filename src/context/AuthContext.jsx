import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    // Setelah signInWithRedirect() memindahkan halaman ke Google lalu balik
    // lagi ke situs, hasil login gak langsung "return" dari fungsi manapun
    // (halamannya sempat reload total). Ini yang nangkep hasil itu begitu
    // app jalan lagi -- kalau berhasil, onAuthStateChanged di atas otomatis
    // ke-trigger juga dengan user yang baru login.
    getRedirectResult(auth).catch((err) => {
      console.error('Login Google gagal:', err);
      setAuthError(err);
    });

    return unsub;
  }, []);

  // Pakai redirect (bukan popup): popup gampang di-block/nutup sendiri di
  // browser HP -- terutama in-app browser (Instagram/TikTok/dll) dan Chrome
  // dengan pembatasan cookie pihak ketiga, yang bikin komunikasi popup<->app
  // putus di tengah jalan. Redirect memindah seluruh halaman ke Google,
  // jadi gak bergantung ke komunikasi popup yang rawan itu.
  //
  // KONSEKUENSI: fungsi ini gak "return" user secara langsung kayak popup
  // dulu, karena halaman keburu pindah ke Google. Komponen yang mau
  // lanjut aksi setelah login (Header.jsx, SaveButton.jsx) perlu simpan
  // "niat" aksinya sendiri (mis. lewat sessionStorage) sebelum manggil ini,
  // lalu cek balik & lanjutkan aksinya di useEffect setelah `user` terisi.
  function loginWithGoogle() {
    return signInWithRedirect(auth, googleProvider);
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
