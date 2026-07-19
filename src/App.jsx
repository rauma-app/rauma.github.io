import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Posting from './pages/Posting';
import Listing from './pages/Listing';
import MyListings from './pages/MyListings';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
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
            path="/iklan-saya"
            element={
              <ProtectedRoute>
                <MyListings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
