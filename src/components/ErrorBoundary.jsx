import React from 'react';

// Kalau ada error React yang gak ketangkep di manapun, biasanya halaman
// jadi BLANK PUTIH TOTAL tanpa petunjuk apapun -- susah di-debug, apalagi
// dari HP tanpa akses DevTools/console. Komponen ini nangkep error itu dan
// nampilin pesannya langsung di layar, biar ketauan persis apa & di mana
// masalahnya, tanpa perlu buka Console sama sekali.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('ErrorBoundary menangkap error:', error, info);
  }

  // Error semacam ini muncul kalau lagi offline dan komponen lazy-load
  // (mis. ImageSlider) belum sempat ke-cache. Daripada nampilin stack
  // trace teknis yang bikin bingung/panik, kasih pesan yang jelas aja --
  // isu koneksi, bukan situsnya rusak.
  isLikelyOfflineChunkError() {
    const msg = String(this.state.error?.message || this.state.error || '');
    return (
      !navigator.onLine ||
      /preload CSS|dynamically imported module|Failed to fetch/i.test(msg)
    );
  }

  render() {
    if (this.state.error) {
      if (this.isLikelyOfflineChunkError()) {
        return (
          <div
            style={{
              padding: 24,
              fontFamily: 'sans-serif',
              fontSize: 15,
              background: '#fff',
              color: '#111',
              textAlign: 'center',
            }}
          >
            <h1 style={{ color: '#064734', fontSize: 18, marginBottom: 8 }}>
              Koneksi internet terputus
            </h1>
            <p style={{ marginBottom: 16, color: '#555' }}>
              Sebagian halaman ini belum sempat tersimpan untuk mode offline.
              Coba sambungkan internet lalu muat ulang.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                background: '#064734',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              Muat Ulang Halaman
            </button>
          </div>
        );
      }
      return (
        <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 13, background: '#fff', color: '#111' }}>
          <h1 style={{ color: '#c0392b', fontSize: 18, marginBottom: 12 }}>
            Ada error di halaman ini
          </h1>
          <p style={{ marginBottom: 8 }}>
            Screenshot semua tulisan di bawah ini dan kirim ke pengelola situs:
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: '#f5f5f5',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #ddd',
            }}
          >
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            {this.state.info?.componentStack ? '\n\n--- Component Stack ---' + this.state.info.componentStack : ''}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: '10px 20px',
              background: '#064734',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            Muat Ulang Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
