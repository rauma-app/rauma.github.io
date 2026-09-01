// Data artikel blog. Tambah artikel baru dengan menambahkan object baru
// ke array POSTS di bawah -- gak perlu bikin halaman React baru per
// artikel, cukup isi data-nya di sini.
//
// Setiap `content` adalah array block dengan tipe:
// - { type: 'p', text }        -> paragraf. Pakai **kata** untuk bold.
// - { type: 'h2', text }       -> sub judul
// - { type: 'list', items }    -> daftar bullet, tiap item bisa pakai **kata**
// - { type: 'image', src, alt, caption } -> gambar + keterangan opsional
// - { type: 'quote', text }    -> kutipan/notifikasi ditonjolkan
// - { type: 'link', href, label } -> tombol/link menonjol

export const POSTS = [
  {
    slug: 'cara-daftar-internet-rakyat-lewat-aplikasi',
    title: 'Cara Daftar Internet Rakyat Lewat Aplikasi, Lengkap sampai Pembayaran',
    excerpt:
      'Panduan lengkap cara registrasi Internet Rakyat, mulai dari download aplikasi, daftar lewat link referral, sampai cara membeli paket internet dan pembayarannya.',
    date: '2026-09-01',
    coverImage: '/blog/internet-rakyat/foto-1.jpg',
    seoDescription:
      'Panduan lengkap cara daftar Internet Rakyat lewat aplikasi: download aplikasi, daftar lewat link referral, isi data, sampai cara membeli paket internet dan pembayarannya.',
    content: [
      {
        type: 'p',
        text: 'Berikut panduan lengkap cara melakukan registrasi Internet Rakyat, mulai dari mengunduh aplikasi hingga melakukan pembelian paket internet.',
      },
      { type: 'h2', text: '1. Download Aplikasi Internet Rakyat' },
      {
        type: 'p',
        text: 'Langkah pertama, download aplikasi Internet Rakyat melalui Google Play Store untuk pengguna Android atau App Store untuk pengguna iPhone.',
      },
      {
        type: 'list',
        items: [
          '**Android**: [Google Play Store](https://play.google.com/store/apps/details?id=com.weave.ira)',
          '**iPhone**: [App Store](https://apps.apple.com/id/app/internet-rakyat/id6758337694)',
        ],
      },
      {
        type: 'p',
        text: 'Pastikan aplikasi yang diunduh merupakan **aplikasi resmi** Internet Rakyat.',
      },
      { type: 'h2', text: '2. Daftar Menggunakan Link Referral' },
      {
        type: 'p',
        text: 'Setelah aplikasi berhasil diunduh, gunakan link referral berikut untuk melanjutkan proses pendaftaran:',
      },
      {
        type: 'link',
        href: 'https://sahabat.internetrakyat.id/go/sira_abdul635',
        label: 'Daftar Lewat Link Referral Internet Rakyat',
      },
      {
        type: 'image',
        src: '/blog/internet-rakyat/foto-1.jpg',
        alt: 'Halaman link referral Internet Rakyat',
        caption: 'Foto 1',
      },
      {
        type: 'p',
        text: 'Setelah membuka link tersebut, pilih **"Daftar Lewat Aplikasi"**. Anda akan diarahkan secara otomatis ke aplikasi Internet Rakyat yang sebelumnya sudah diunduh.',
      },
      { type: 'h2', text: '3. Isi Data Pendaftaran' },
      {
        type: 'p',
        text: 'Selanjutnya, isi seluruh data yang diperlukan pada formulir pendaftaran.',
      },
      {
        type: 'image',
        src: '/blog/internet-rakyat/foto-2.jpg',
        alt: 'Formulir pendaftaran Internet Rakyat',
        caption: 'Foto 2',
      },
      {
        type: 'image',
        src: '/blog/internet-rakyat/foto-3.jpg',
        alt: 'Formulir pendaftaran Internet Rakyat lanjutan',
        caption: 'Foto 3',
      },
      {
        type: 'p',
        text: 'Pastikan seluruh data yang dimasukkan sudah **benar dan sesuai** dengan data pelanggan. Periksa kembali sebelum melanjutkan ke tahap berikutnya.',
      },
      { type: 'h2', text: '4. Konfirmasi Data Pelanggan' },
      {
        type: 'p',
        text: 'Pada langkah terakhir, lakukan konfirmasi terhadap data pelanggan yang telah dimasukkan.',
      },
      {
        type: 'image',
        src: '/blog/internet-rakyat/foto-4.jpg',
        alt: 'Konfirmasi data pelanggan Internet Rakyat',
        caption: 'Foto 4',
      },
      {
        type: 'p',
        text: 'Pastikan seluruh informasi sudah benar, kemudian lanjutkan proses pendaftaran.',
      },
      { type: 'p', text: 'Jika registrasi berhasil, akan muncul notifikasi:' },
      { type: 'quote', text: 'Terima kasih, pendaftaran Anda berhasil!' },
      { type: 'h2', text: 'Cara Membeli Paket Internet di Aplikasi' },
      {
        type: 'p',
        text: 'Setelah proses registrasi selesai, pelanggan dapat membeli paket internet melalui aplikasi Internet Rakyat.',
      },
      { type: 'h2', text: '1. Pilih Paket Internet' },
      {
        type: 'list',
        items: [
          'Masuk ke halaman utama aplikasi Internet Rakyat.',
          'Pada banner **"Beli Paket untuk Menyelesaikan Pendaftaran Internet Rakyat"**, akan tersedia pilihan paket internet.',
          'Pilih paket yang sesuai dengan kebutuhan, misalnya paket 100 Mbps.',
          'Tekan **"Pilih Paket Ini"** untuk melanjutkan ke proses pembayaran.',
        ],
      },
      { type: 'h2', text: '2. Pilih Metode Pembayaran' },
      {
        type: 'p',
        text: 'Pada halaman Metode Pembayaran, pelanggan dapat memilih metode pembayaran yang tersedia, seperti:',
      },
      {
        type: 'list',
        items: [
          'Virtual Account, termasuk BRIVA, Mandiri, Danamon, dan BNI.',
          'QRIS.',
          'E-Wallet.',
        ],
      },
      {
        type: 'p',
        text: 'Sebelum melakukan pembayaran, pastikan kembali **total tagihan** paket yang dipilih.',
      },
      {
        type: 'p',
        text: 'Jika semua sudah sesuai, tekan **"Bayar"**, kemudian selesaikan pembayaran mengikuti instruksi dari metode pembayaran yang dipilih.',
      },
      { type: 'h2', text: '3. Setelah Pembayaran Berhasil' },
      { type: 'p', text: 'Setelah pembayaran berhasil dilakukan:' },
      {
        type: 'list',
        items: [
          'Akan muncul notifikasi **"Pembayaran Berhasil"** di aplikasi.',
          'Status paket akan otomatis berubah menjadi **"Menunggu Pengiriman Perangkat"**.',
          'Pelanggan tinggal menunggu perangkat dikirim dan proses pemasangan dilakukan oleh tim Internet Rakyat.',
        ],
      },
    ],
  },
];

export function getPostBySlug(slug) {
  return POSTS.find((p) => p.slug === slug);
}
