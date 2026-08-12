import { auth } from '../firebase';

// URL Worker API rauma-uploader
const API_BASE_URL = 'https://rauma-uploader.abduloh-salam7.workers.dev/api';

// Ambil ID Token Firebase user yang lagi login, buat dikirim di header
// Authorization -- Worker sekarang WAJIB verifikasi ini buat aksi yang
// sensitif (posting, hapus, ubah status, kelola premium, dst).
// Kalau belum login, balikin {} (endpoint publik tetap jalan tanpa ini).
async function authHeaders() {
  const user = auth.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch (err) {
    console.error('Gagal mengambil ID token:', err);
    return {};
  }
}

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
  // status='all'/'pending'/dll (selain 'approved') sekarang butuh login
  // (dicek server), makanya query ini juga kirim token kalau user login.
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
      const headers = params.status && params.status !== 'approved' ? await authHeaders() : {};
      const res = await fetch(url, { headers });
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
  // Wajib login -- Worker menolak kalau tidak ada token valid.
  async createListing(data) {
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      const res = await fetch(`${API_BASE_URL}/listings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Gagal menyimpan properti');
      return result;
    } catch (err) {
      console.error('Error d1Api.createListing:', err);
      throw err;
    }
  },

  // Update status listing (approved / rejected / pending) -- ADMIN ONLY di server
  async updateListingStatus(id, status) {
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      const res = await fetch(`${API_BASE_URL}/listings/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Gagal mengubah status');
      return result;
    } catch (err) {
      console.error('Error d1Api.updateListingStatus:', err);
      throw err;
    }
  },

  // Tandai 1 listing (atau sejumlah `amount` unit dari listing perumahan)
  // sebagai terjual. Cuma pemilik iklan atau admin yang bisa (dicek server).
  async markListingSold(id, amount = 1) {
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      const res = await fetch(`${API_BASE_URL}/listings/${id}/mark-sold`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Gagal menandai terjual');
      return result;
    } catch (err) {
      console.error('Error d1Api.markListingSold:', err);
      throw err;
    }
  },

  // Ambil total unit terjual milik 1 penjual (ditampilkan di halaman profil)
  async getSellerStats(uid) {
    try {
      const res = await fetch(`${API_BASE_URL}/sellers/${uid}`);
      if (!res.ok) return { uid, sold_units: 0 };
      return await res.json();
    } catch (err) {
      console.error('Error d1Api.getSellerStats:', err);
      return { uid, sold_units: 0 };
    }
  },

  // Catat 1 event analytics (pageview / whatsapp_click / search).
  // Fire-and-forget -- kalau gagal (misal lagi offline), diamkan aja,
  // jangan sampai ganggu pengalaman user.
  async logEvent(eventType, extra = {}) {
    try {
      await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, ...extra }),
      });
    } catch (err) {
      // sengaja diabaikan
    }
  },

  // Ambil data buat dashboard statistik Admin. ADMIN ONLY di server.
  // period: 'today' | 'month' | 'lastmonth'
  async getAdminStats(period = 'today') {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE_URL}/admin/stats?period=${period}`, { headers });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error('Error d1Api.getAdminStats:', err);
      return null;
    }
  },

  // Ambil semua akun Premium (buat dipakai di seluruh situs & halaman Admin) -- publik
  async getPremiumAccounts() {
    try {
      const res = await fetch(`${API_BASE_URL}/premium`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error('Error d1Api.getPremiumAccounts:', err);
      return [];
    }
  },

  // Tambah/update 1 akun jadi Premium. ADMIN ONLY di server.
  async addPremiumAccount(uid, label) {
    const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
    const res = await fetch(`${API_BASE_URL}/premium`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ uid, label }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result?.error || 'Gagal menambah akun premium');
    return result;
  },

  // Cabut status Premium 1 akun. ADMIN ONLY di server.
  async removePremiumAccount(uid) {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE_URL}/premium/${uid}`, { method: 'DELETE', headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result?.error || 'Gagal mencabut akun premium');
    return result;
  },

  // Ambil semua akun Admin Perumahan (centang kuning terbatas) -- publik
  async getPerumahanAdmins() {
    try {
      const res = await fetch(`${API_BASE_URL}/perumahan-admins`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error('Error d1Api.getPerumahanAdmins:', err);
      return [];
    }
  },

  // Tambah/update 1 akun jadi Admin Perumahan. ADMIN ONLY di server.
  async addPerumahanAdmin(uid, label) {
    const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
    const res = await fetch(`${API_BASE_URL}/perumahan-admins`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ uid, label }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result?.error || 'Gagal menambah admin perumahan');
    return result;
  },

  // Cabut status Admin Perumahan 1 akun. ADMIN ONLY di server.
  async removePerumahanAdmin(uid) {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE_URL}/perumahan-admins/${uid}`, { method: 'DELETE', headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result?.error || 'Gagal mencabut admin perumahan');
    return result;
  },

  // Hapus properti -- pemilik iklan ATAU admin (dicek server)
  async deleteListing(id) {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE_URL}/listings/${id}`, {
        method: 'DELETE',
        headers,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Gagal menghapus properti');
      return result;
    } catch (err) {
      console.error('Error d1Api.deleteListing:', err);
      throw err;
    }
  },

  // Cek apakah 1 listing sudah disimpan oleh user ini
  async isListingSaved(uid, listingId) {
    try {
      const qs = new URLSearchParams({ uid, listingId });
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE_URL}/saved/status?${qs.toString()}`, { headers });
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
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      const res = await fetch(`${API_BASE_URL}/saved`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ uid, listingId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Gagal menyimpan listing');
      return result;
    } catch (err) {
      console.error('Error d1Api.saveListing:', err);
      throw err;
    }
  },

  // Batalkan simpan (unsave) listing dari daftar simpanan user
  async unsaveListing(uid, listingId) {
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      const res = await fetch(`${API_BASE_URL}/saved`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ uid, listingId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Gagal membatalkan simpan listing');
      return result;
    } catch (err) {
      console.error('Error d1Api.unsaveListing:', err);
      throw err;
    }
  },

  // Ambil semua listing yang disimpan user ini (data lengkap)
  async getSavedListings(uid) {
    try {
      const qs = new URLSearchParams({ uid });
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE_URL}/saved?${qs.toString()}`, { headers });
      if (!res.ok) throw new Error('Gagal mengambil listing tersimpan');
      const data = await res.json();
      return Array.isArray(data) ? data.map(normalizeListing) : [];
    } catch (err) {
      console.error('Error d1Api.getSavedListings:', err);
      return [];
    }
  },
};
        
