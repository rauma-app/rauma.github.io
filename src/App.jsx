import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import { d1Api } from './lib/d1Api';
import { getAnonId } from './lib/anon';

// Halaman di-load "malas" (lazy) -- kode tiap halaman baru didownload
// browser pas beneran dibuka, bukan semua sekaligus di awal. Ini yang
// bikin ukuran JS awal jauh lebih kecil (dampak ke skor PageSpeed).
const Home = lazy(() => import('./pages/Home'));
const PerumahanList = lazy(() => import('./pages/PerumahanList'));
const PriceSortedList = lazy(() => import('./pages/PriceSortedList'));
const TakeOverKPRPage = lazy(() => import('./pages/TakeOverKPRPage'));
const CariProperti = lazy(() => import('./pages/CariProperti'));
const Cari = lazy(() => import('./pages/Cari'));
const KalkulatorKPR = lazy(() => import('./pages/KalkulatorKPR'));
const Posting = lazy(() => import('./pages/Posting'));
const Listing = lazy(() => import('./pages/Listing'));
const MyListings = lazy(() => import('./pages/MyListings'));
const SavedListings = lazy(() => import('./pages/SavedListings'));
const AdminPending = lazy(() => import('./pages/AdminPending'));
const AdminStats = lazy(() => import('./pages/AdminStats'));
const SellerProfile = lazy(() => import('./pages/SellerProfile'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const TentangKami = lazy(() => import('./pages/TentangKami'));
const KebijakanPrivasi = lazy(() => import('./pages/KebijakanPrivasi'));
const SyaratKetentuan = lazy(() => import('./pages/SyaratKetentuan'));
const SaranMasukan = lazy(() => import('./pages/SaranMasukan'));
const PetaSitus = lazy(() => import('./pages/PetaSitus'));
const Kerjasama = lazy(() => import('./pages/Kerjasama'));
const PenjernihFoto = lazy(() => import('./pages/PenjernihFoto'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogArticle = lazy(() => import('./pages/BlogArticle'));

// SpecialCategoryList.jsx pakai named export (bukan default), jadi
// bungkus tipis biar tetap bisa di-lazy-load dengan cara yang sama.
const SubsidiList = lazy(() =>
  import('./pages/SpecialCategoryList').then((m) => ({ default: m.SubsidiList }))
);

// Nyatet 1 "pageview" tiap kali pindah halaman -- dipakai dashboard
// statistik Admin buat hitung jumlah pengunjung. Gak render apa-apa,
// cuma efek samping di background.
function PageviewTracker() {
  const location = useLocation();
  useEffect(() => {
    d1Api.logEvent('pageview', { anon_id: getAnonId() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
  return null;
}

// Ditampilkan sebentar saat kode halaman baru masih didownload
// (biasanya cuma sepersekian detik di koneksi normal).
function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <ScrollToTop />
      <PageviewTracker />
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/perumahan" element={<PerumahanList />} />
            <Route path="/termurah" element={<PriceSortedList />} />
            <Route path="/termahal" element={<PriceSortedList />} />
            <Route path="/subsidi" element={<SubsidiList />} />
            <Route path="/carikan-properti" element={<CariProperti />} />
            <Route path="/cari" element={<Cari />} />
            <Route path="/cari/:slug" element={<Cari />} />
            <Route path="/take-over-kpr" element={<TakeOverKPRPage />} />
            <Route path="/kalkulator-kpr" element={<KalkulatorKPR />} />
            <Route path="/tentang-kami" element={<TentangKami />} />
            <Route path="/kebijakan-privasi" element={<KebijakanPrivasi />} />
            <Route path="/syarat-ketentuan" element={<SyaratKetentuan />} />
            <Route path="/saran-masukan" element={<SaranMasukan />} />
            <Route path="/peta-situs" element={<PetaSitus />} />
            <Route path="/kerjasama" element={<Kerjasama />} />
            <Route path="/alat/penjernih-foto" element={<PenjernihFoto />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogArticle />} />
            <Route path="/id/:id" element={<Listing />} />
            <Route path="/perumahan/:slug" element={<Listing />} />
            <Route path="/penjual/:uid" element={<SellerProfile />} />
            <Route path="/u/:username" element={<SellerProfile />} />
            <Route
              path="/posting"
              element={
                <ProtectedRoute>
                  <Posting />
                </ProtectedRoute>
              }
            />
            <Route
              path="/posting/:id"
              element={
                <ProtectedRoute>
                  <Posting />
                </ProtectedRoute>
              }
            />
            <Route
              path="/iklan-saya"
              element={
                <ProtectedRoute>
                  <MyListings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/disimpan"
              element={
                <ProtectedRoute>
                  <SavedListings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profil-saya"
              element={
                <ProtectedRoute>
                  <ProfileSettings />
                </ProtectedRoute>
              }
            />
            <Route path="/admin" element={<AdminPending />} />
            <Route path="/admin/statistik" element={<AdminStats />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
