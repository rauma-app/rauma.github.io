// URL Worker API rauma-uploader
const API_BASE_URL = 'https://rauma-uploader.abduloh-salam7.workers.dev/api';

// D1 menyimpan `images` sebagai string JSON. Supaya semua halaman yang
// pakai d1Api tidak perlu parse manual berulang-ulang, kita normalisasi
// jadi array di sini, sekali saja.
function normalizeListing(raw) {
  if (!raw) return raw;
  let images = raw.images;
  if (typeof images === 'string') {
    try {
      images = JSON.parse(images);
    } catch {
      images = [];
    }
  }
  if (!Array.isArray(images)) images = [];
  return { ...raw, images };
}

export const d1Api = {
  // Ambil listing dengan filter opsional:
  //   { type, category, owner, status, minPrice, maxPrice, location }
  // status='all' -> tanpa filter status (khusus admin)
  // status tidak diisi -> default hanya yang 'approved' (aman utk publik)
  async getListings(params = {}) {
    try {
      const qs = new URLSearchParams();
      if (params.type) qs.set('type', params.type);
      if (params.category) qs.set('category', params.category);
      if (params.owner) qs.set('owner', params.owner);
      if (params.status) qs.set('status', params.status);
      if (params.whatsapp) qs.set('whatsapp', params.whatsapp);
      if (params.minPrice) qs.set('minPrice', params.minPrice);
      if (params.maxPrice) qs.set('maxPrice', params.maxPrice);
      if (params.location) qs.set('location', params.location);

      const query = qs.toString();
      const url = `${API_BASE_URL}/listings${query ? `?${query}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal mengambil data properti');
      const data = await res.json();
      return Array.isArray(data) ? data.map(normalizeListing) : [];
    } catch (err) {
      console.error('Error d1Api.getListings:', err);
      return [];
    }
  },

  // Ambil N listing terdekat dari koordinat tertentu, dihitung server-side
  // dari SELURUH data di database (bukan cuma yang sudah ke-load di frontend)
  async getNearbyListings({ lat, lon, limit = 20, type, minPrice, maxPrice }) {
    try {
      const qs = new URLSearchParams({ lat, lon, limit });
      if (type) qs.set('type', type);
      if (minPrice) qs.set('minPrice', minPrice);
      if (maxPrice) qs.set('maxPrice', maxPrice);
      const res = await fetch(`${API_BASE_URL}/listings/nearby?${qs.toString()}`);
      if (!res.ok) throw new Error('Gagal mengambil listing terdekat');
      const data = await res.json();
      return Array.isArray(data) ? data.map(normalizeListing) : [];
    } catch (err) {
      console.error('Error d1Api.getNearbyListings:', err);
      return [];
    }
  },

  // Ambil detail 1 properti
  async getListingById(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/listings/${id}`);
      if (!res.ok) throw new Error('Properti tidak ditemukan');
      const data = await res.json();
      return normalizeListing(data);
    } catch (err) {
      console.error('Error d1Api.getListingById:', err);
      return null;
    }
  },

  // Simpan properti baru / edit properti lama (upsert berdasarkan id) ke Cloudflare D1
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

  // Update status listing (approved / rejected / pending)
  async updateListingStatus(id, status) {
    try {
      const res = await fetch(`${API_BASE_URL}/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return await res.json();
    } catch (err) {
      console.error('Error d1Api.updateListingStatus:', err);
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
  },

  // Cek apakah 1 listing sudah disimpan oleh user ini
  async isListingSaved(uid, listingId) {
    try {
      const qs = new URLSearchParams({ uid, listingId });
      const res = await fetch(`${API_BASE_URL}/saved/status?${qs.toString()}`);
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.saved;
    } catch (err) {
      console.error('Error d1Api.isListingSaved:', err);
      return false;
    }
  },

  // Simpan listing ke daftar simpanan user
  async saveListing(uid, listingId) {
    try {
      const res = await fetch(`${API_BASE_URL}/saved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, listingId }),
      });
      return await res.json();
    } catch (err) {
      console.error('Error d1Api.saveListing:', err);
      throw err;
    }
  },

  // Batalkan simpan (unsave) listing dari daftar simpanan user
  async unsaveListing(uid, listingId) {
    try {
      const res = await fetch(`${API_BASE_URL}/saved`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, listingId }),
      });
      return await res.json();
    } catch (err) {
      console.error('Error d1Api.unsaveListing:', err);
      throw err;
    }
  },

  // Ambil semua listing yang disimpan user ini (data lengkap)
  async getSavedListings(uid) {
    try {
      const qs = new URLSearchParams({ uid });
      const res = await fetch(`${API_BASE_URL}/saved?${qs.toString()}`);
      if (!res.ok) throw new Error('Gagal mengambil listing tersimpan');
      const data = await res.json();
      return Array.isArray(data) ? data.map(normalizeListing) : [];
    } catch (err) {
      console.error('Error d1Api.getSavedListings:', err);
      return [];
    }
  },
};
