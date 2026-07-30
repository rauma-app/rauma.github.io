import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { d1Api } from '../lib/d1Api';

export default function Listing() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      try {
        const data = await d1Api.getListingById(id);
        
        if (data) {
          // Normalisasi gambar dari D1 (Parse JSON jika tersimpan sebagai string)
          let images = [];
          try {
            images = typeof data.images === 'string' ? JSON.parse(data.images) : data.images;
          } catch (e) {
            images = [];
          }

          setListing({
            ...data,
            images: images && images.length > 0 ? images : ['https://via.placeholder.com/600x400?text=Foto+Tidak+Tersedia'],
            price: Number(data.price) || 0,
          });
        }
      } catch (err) {
        console.error('Gagal mengambil detail listing dari D1:', err);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-500">
        Memuat detail properti...
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-gray-800">Properti Tidak Ditemukan</h2>
        <Link to="/" className="text-forest underline mt-4 inline-block font-semibold">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Gambar Utama */}
      <div className="rounded-2xl overflow-hidden shadow-md bg-gray-100">
        <img 
          src={listing.images[activeImage] || listing.images[0]} 
          alt={listing.title} 
          className="w-full h-80 sm:h-96 object-cover"
        />
      </div>

      {/* Thumbnail Gambar (Jika Foto Lebih dari 1) */}
      {listing.images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {listing.images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt=""
              onClick={() => setActiveImage(idx)}
              className={`h-20 w-24 object-cover rounded-xl cursor-pointer border-2 transition-all ${
                activeImage === idx ? 'border-forest scale-95' : 'border-transparent opacity-70'
              }`}
            />
          ))}
        </div>
      )}

      {/* Informasi Detail Properti */}
      <div className="bg-white p-6 rounded-2xl border border-line space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="bg-forest/10 text-forest text-xs font-bold px-3 py-1 rounded-full">
            {listing.category || 'Rumah'}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-navy">{listing.title}</h1>
        <p className="text-gray-500 text-sm sm:text-base">{listing.location}</p>
        
        <p className="text-2xl font-extrabold text-forest">
          Rp {listing.price.toLocaleString('id-ID')}
        </p>

        <hr className="border-line my-4" />

        <div>
          <h3 className="font-bold text-lg text-navy mb-2">Deskripsi</h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
            {listing.description || 'Tidak ada deskripsi detail untuk properti ini.'}
          </p>
        </div>

        {/* Tombol WhatsApp Penjual */}
        {listing.seller_phone && (
          <div className="pt-4">
            <a
              href={`https://wa.me/${listing.seller_phone.replace(/^0/, '62')}?text=Halo,%20saya%20tertarik%20dengan%20properti%20"${encodeURIComponent(listing.title)}"%20di%20Rauma.`}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center bg-forest text-white font-bold py-3.5 rounded-xl hover:bg-forest-dark transition shadow-md"
            >
              Hubungi Penjual via WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
