import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import PerumahanList from './pages/PerumahanList';
import PriceSortedList from './pages/PriceSortedList';
import { SubsidiList } from './pages/SpecialCategoryList';
import TakeOverKPRPage from './pages/TakeOverKPRPage';
import CariProperti from './pages/CariProperti';
import KalkulatorKPR from './pages/KalkulatorKPR';
import Posting from './pages/Posting';
import Listing from './pages/Listing';
import MyListings from './pages/MyListings';
import AdminPending from './pages/AdminPending';
import SellerProfile from './pages/SellerProfile';
import TentangKami from './pages/TentangKami';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <ScrollToTop />
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/perumahan" element={<PerumahanList />} />
          <Route path="/termurah" element={<PriceSortedList />} />
          <Route path="/termahal" element={<PriceSortedList />} />
          <Route path="/subsidi" element={<SubsidiList />} />
          <Route path="/carikan-properti" element={<CariProperti />} />
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
          <Route path="/admin" element={<AdminPending />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
