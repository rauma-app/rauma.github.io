import React, { useState } from 'react';
import { d1Api } from '../lib/d1Api';
import { uploadToR2 } from '../lib/r2';

export default function Posting({ currentUser, onSuccess }) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Rumah');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      // 1. Upload semua gambar ke R2 Worker
      const imageUrls = [];
      for (const file of imageFiles) {
        const url = await uploadToR2(file);
        imageUrls.push(url);
      }

      // 2. Simpan Metadata Properti ke Cloudflare D1
      const payload = {
        title,
        price: Number(price),
        location,
        category,
        description,
        seller_uid: currentUser?.uid || 'guest',
        seller_phone: phone,
        images: imageUrls,
      };

      await d1Api.createListing(payload);
      alert('Berhasil posting properti baru!');
      
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      alert('Gagal posting properti: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-4 bg-white rounded shadow space-y-4">
      <h2 className="text-xl font-bold">Tambah Properti Baru</h2>
      
      <input 
        type="text" 
        placeholder="Judul Properti" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)} 
        required 
        className="w-full border p-2 rounded"
      />

      <input 
        type="number" 
        placeholder="Harga (Rp)" 
        value={price} 
        onChange={(e) => setPrice(e.target.value)} 
        required 
        className="w-full border p-2 rounded"
      />

      <input 
        type="text" 
        placeholder="Lokasi (Kota/Kabupaten)" 
        value={location} 
        onChange={(e) => setLocation(e.target.value)} 
        required 
        className="w-full border p-2 rounded"
      />

      <select 
        value={category} 
        onChange={(e) => setCategory(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="Rumah">Rumah</option>
        <option value="Ruko">Ruko</option>
        <option value="Tanah">Tanah</option>
        <option value="Apartemen">Apartemen</option>
      </select>

      <textarea 
        placeholder="Deskripsi Lengkap" 
        value={description} 
        onChange={(e) => setDescription(e.target.value)} 
        className="w-full border p-2 rounded"
      />

      <input 
        type="text" 
        placeholder="Nomor WhatsApp/HP" 
        value={phone} 
        onChange={(e) => setPhone(e.target.value)} 
        required 
        className="w-full border p-2 rounded"
      />

      <div>
        <label className="block text-sm font-medium mb-1">Foto Properti</label>
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          onChange={(e) => setImageFiles(Array.from(e.target.files))} 
          className="w-full border p-1 rounded"
        />
      </div>

      <button 
        type="submit" 
        disabled={uploading}
        className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:bg-gray-400"
      >
        {uploading ? 'Mengunggah & Menyimpan...' : 'Post Properti'}
      </button>
    </form>
  );
}
