// URL Worker API rauma-uploader
const API_BASE_URL = 'https://rauma-uploader.abduloh-salam7.workers.dev/api';

export const d1Api = {
  // Ambil semua listing / berdasarkan kategori
  async getListings(category = '') {
    try {
      const url = category 
        ? `${API_BASE_URL}/listings?category=${encodeURIComponent(category)}`
        : `${API_BASE_URL}/listings`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal mengambil data properti');
      return await res.json();
    } catch (err) {
      console.error('Error d1Api.getListings:', err);
      return [];
    }
  },

  // Ambil detail 1 properti
  async getListingById(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/listings/${id}`);
      if (!res.ok) throw new Error('Properti tidak ditemukan');
      return await res.json();
    } catch (err) {
      console.error('Error d1Api.getListingById:', err);
      return null;
    }
  },

  // Simpan properti baru ke Cloudflare D1
  async createListing(data) {
    try {
      const res = await fetch(`${API_BASE_URL}/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err) {
      console.error('Error d1Api.createListing:', err);
      throw err;
    }
  },

  // Hapus properti
  async deleteListing(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/listings/${id}`, {
        method: 'DELETE',
      });
      return await res.json();
    } catch (err) {
      console.error('Error d1Api.deleteListing:', err);
      throw err;
    }
  }
};

