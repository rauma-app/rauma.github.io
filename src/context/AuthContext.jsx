import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext(null);
const LOGIN_ATTEMPTED_KEY = 'rauma_login_attempted';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Info debug login, ditampilkan lewat <AuthDebugBanner /> di halaman
  // manapun kamu berakhir setelah balik dari Google -- bukan cuma di
  // halaman yang butuh login. HAPUS mekanisme ini nanti setelah bug login
  // ini beres, ini cuma buat ketauan letak masalahnya tanpa perlu DevTools.
  const [authDebug, setAuthDebug] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) setAuthDebug(null); // login akhirnya kedeteksi -> gak perlu tampilin debug lagi
    });

    // Cuma tampilin info debug kalau SEBELUMNYA memang baru nyoba login di
    // tab ini (ditandai loginWithGoogle() di bawah) -- biar gak muncul
    // ngasal di kunjungan biasa yang emang belum pernah coba login.
    const justAttemptedLogin = sessionStorage.getItem(LOGIN_ATTEMPTED_KEY) === '1';

    getRedirectResult(auth)
      .then((result) => {
        if (!justAttemptedLogin) return;
        sessionStorage.removeItem(LOGIN_ATTEMPTED_KEY);
        if (!result) {
          // Gak error, tapi juga gak ada hasil -- artinya Firebase "lupa"
          // kalau tadi baru aja nyoba redirect ke Google. Ini biasanya
          // kejadian kalau storage/cookie sesi kepotong di tengah jalan.
          setAuthDebug({
            status: 'null-result',
            message:
              'getRedirectResult() mengembalikan kosong padahal barusan mencoba login -- sesi redirect kemungkinan hilang di tengah jalan (storage/cookie browser mereset antara pindah ke Google dan balik lagi).',
          });
        }
      })
      .catch((err) => {
        sessionStorage.removeItem(LOGIN_ATTEMPTED_KEY);
        console.error('Login Google gagal:', err);
        setAuthDebug({ status: 'error', code: err.code, message: err.message });
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
    sessionStorage.setItem(LOGIN_ATTEMPTED_KEY, '1');
    return signInWithRedirect(auth, googleProvider);
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, authDebug, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
