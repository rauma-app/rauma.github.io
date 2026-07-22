import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import PerumahanList from './pages/PerumahanList';
import PriceSortedList from './pages/PriceSortedList';
import { SubsidiList, JualCepatList } from './pages/SpecialCategoryList';
import KPRSyariahPage from './pages/KPRSyariahPage';
import NabungPage from './pages/NabungPage';
import Posting from './pages/Posting';
import Listing from './pages/Listing';
import MyListings from './pages/MyListings';
import AdminPending from './pages/AdminPending';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/perumahan" element={<PerumahanList />} />
          <Route path="/termurah" element={<PriceSortedList />} />
          <Route path="/termahal" element={<PriceSortedList />} />
          <Route path="/subsidi" element={<SubsidiList />} />
          <Route path="/jual-cepat" element={<JualCepatList />} />
          <Route path="/kpr-syariah" element={<KPRSyariahPage />} />
          <Route path="/nabung" element={<NabungPage />} />
          <Route path="/id/:id" element={<Listing />} />
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
