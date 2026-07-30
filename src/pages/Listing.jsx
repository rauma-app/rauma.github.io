import React, { useEffect, useState } from 'react';
import { d1Api } from '../lib/d1Api';

export default function Listing({ categoryFilter = '' }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await d1Api.getListings(categoryFilter);
      setListings(data);
      setLoading(false);
    }
    loadData();
  }, [categoryFilter]);

  if (loading) {
    return <div className="text-center py-10">Memuat properti...</div>;
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        Belum ada properti diposting.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
      {listings.map((item) => {
        // Handle images baik berbentuk string JSON atau Array
        let images = [];
        try {
          images = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
        } catch (e) {
          images = [];
        }

        const firstImage = images && images.length > 0 ? images[0] : '/placeholder.jpg';

        return (
          <div key={item.id} className="border rounded-lg overflow-hidden shadow-sm bg-white">
            <img 
              src={firstImage} 
              alt={item.title} 
              className="w-full h-48 object-cover" 
              onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=Foto+Tidak+Tersedia'; }}
            />
            <div className="p-4">
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {item.category || 'Rumah'}
              </span>
              <h3 className="font-bold text-lg mt-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.location}</p>
              <p className="text-green-600 font-bold text-md mt-2">
                Rp {Number(item.price).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
