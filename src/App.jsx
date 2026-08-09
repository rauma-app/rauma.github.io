import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import { d1Api } from './lib/d1Api';
import { getAnonId } from './lib/anon';
import Home from './pages/Home';
import PerumahanList from './pages/PerumahanList';
import PriceSortedList from './pages/PriceSortedList';
import { SubsidiList } from './pages/SpecialCategoryList';
import TakeOverKPRPage from './pages/TakeOverKPRPage';
import CariProperti from './pages/CariProperti';
import Cari from './pages/Cari';
import KalkulatorKPR from './pages/KalkulatorKPR';
import Posting from './pages/Posting';
import Listing from './pages/Listing';
import MyListings from './pages/MyListings';
import SavedListings from './pages/SavedListings';
import AdminPending from './pages/AdminPending';
import AdminStats from './pages/AdminStats';
import SellerProfile from './pages/SellerProfile';
import TentangKami from './pages/TentangKami';

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

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <ScrollToTop />
      <PageviewTracker />
      <Header />
      <main className="flex-1">
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
          <Route path="/id/:id" element={<Listing />} />
          <Route path="/penjual/:uid" element={<SellerProfile />} />
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
          <Route path="/admin" element={<AdminPending />} />
          <Route path="/admin/statistik" element={<AdminStats />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
