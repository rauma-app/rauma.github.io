import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
// Sign-in pakai redirect (bukan popup) karena jauh lebih reliable di browser HP.
import { getFirestore } from 'firebase/firestore';
// Catatan: Firebase Storage TIDAK dipakai (butuh paket Blaze/billing aktif).
// Upload gambar memakai Cloudflare R2 (lihat src/lib/r2.js +
// cloudflare-worker/) karena R2 gratis tanpa kartu DAN tidak charge
// bandwidth -- lebih hemat daripada Cloudinary untuk situs dengan trafik
// tinggi. (src/lib/cloudinary.js masih ada di repo tapi sudah tidak dipakai,
// aman dihapus.)

// Firebase config for the rauma-e0aff project.
// These values are safe to expose client-side (they identify the project,
// not authenticate as it) — real protection comes from Firestore/Storage
// security rules and Firebase Auth, not from hiding this object.
const firebaseConfig = {
  apiKey: 'AIzaSyD28Sr6hjTMlHyx3ZHjnciosVEythRFs_A',
  authDomain: 'rauma-e0aff.firebaseapp.com',
  projectId: 'rauma-e0aff',
  storageBucket: 'rauma-e0aff.firebasestorage.app',
  messagingSenderId: '357303011529',
  appId: '1:357303011529:web:e5fb5616be6e50c3ab2518',
  measurementId: 'G-4BJHYRSYGY',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Analytics only works in a real browser with a supported environment,
// guard it so it never breaks local dev / SSR.
isSupported().then((ok) => {
  if (ok) getAnalytics(app);
});
