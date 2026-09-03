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
// - { type: 'code', text }     -> contoh teks/tautan bergaya monospace
// - { type: 'link', href, label, variant } -> tombol/link menonjol
//   (variant: 'primary' default, atau 'secondary' untuk gaya outline)

export const POSTS = [
  {
    slug: 'cara-daftar-internet-rakyat-terbaru',
    title: 'Cara Daftar Internet Rakyat Terbaru',
    excerpt:
      'Panduan resmi cara registrasi Internet Rakyat: membuka link referral, verifikasi data melalui WhatsApp, mengirim lokasi rumah, hingga aktivasi modem.',
    date: '2026-09-03',
    coverImage: '/blog/internet-rakyat/338886.jpg',
    seoDescription:
      'Panduan lengkap dan resmi cara daftar Internet Rakyat: buka link referral, verifikasi data via WhatsApp, kirim lokasi rumah, pilih paket dan metode pembayaran, sampai aktivasi modem.',
    content: [
      {
        type: 'p',
        text: 'Berikut panduan lengkap cara melakukan registrasi Internet Rakyat, mulai dari membuka tautan referral hingga proses aktivasi modem.',
      },
      { type: 'h2', text: '1. Buka Tautan Referral' },
      {
        type: 'p',
        text: 'Langkah pertama, buka tautan referral resmi Internet Rakyat berikut untuk memulai proses pendaftaran.',
      },
      {
        type: 'link',
        href: 'https://sahabat.internetrakyat.id/go/sira_abdul635',
        label: 'Buka Tautan Referral Internet Rakyat',
      },
      {
        type: 'image',
        src: '/blog/internet-rakyat/foto-1.jpg',
        alt: 'Halaman tautan referral Internet Rakyat',
        caption: 'Foto 1',
      },
      {
        type: 'p',
        text: 'Setelah halaman terbuka, tekan tombol **"Daftar Sekarang"**. Sistem akan secara otomatis mengalihkan Anda ke WhatsApp resmi Internet Rakyat untuk mengisi form proses verifikasi data dan lokasi rumah.',
      },
      { type: 'h2', text: '2. Verifikasi Data melalui WhatsApp' },
      {
        type: 'p',
        text: 'Tim Internet Rakyat akan meminta beberapa data secara bertahap melalui WhatsApp. Data awal yang diperlukan adalah:',
      },
      {
        type: 'list',
        items: ['**Nama Lengkap**', '**Nomor Telepon**'],
      },
      {
        type: 'p',
        text: 'Selanjutnya, Anda akan diminta melengkapi data alamat pemasangan sebagai berikut:',
      },
      {
        type: 'list',
        items: [
          'Provinsi',
          'Kota/Kabupaten',
          'Kecamatan',
          'Kelurahan',
          'Kode Pos',
          'RT & RW',
          'Alamat Lengkap Pemasangan',
        ],
      },
      { type: 'h2', text: '3. Mengirim Lokasi Rumah' },
      {
        type: 'p',
        text: 'Setelah seluruh data terisi, langkah terakhir pada tahap ini adalah mengirimkan lokasi rumah. Terdapat dua metode yang dapat digunakan.',
      },
      {
        type: 'p',
        text: '**Metode 1: Bagikan Lokasi (Share Location)**',
      },
      {
        type: 'p',
        text: 'Aktifkan layanan lokasi pada perangkat Anda seperti biasa, kemudian bagikan lokasi terkini melalui fitur berbagi lokasi WhatsApp.',
      },
      {
        type: 'image',
        src: '/blog/internet-rakyat/foto-2.jpg',
        alt: 'Membagikan lokasi rumah melalui WhatsApp',
        caption: 'Foto 2',
      },
      {
        type: 'p',
        text: '**Metode 2: Melalui Google Maps**',
      },
      {
        type: 'p',
        text: 'Untuk hasil yang lebih akurat, Anda dapat menentukan titik lokasi rumah secara manual melalui Google Maps, kemudian membagikan tautannya. Berikut contoh format tautan yang dapat dikirimkan:',
      },
      {
        type: 'code',
        text: 'https://maps.app.goo.gl/wPGWQcb2s7ESPT1o6?g_st=ac',
      },
      {
        type: 'image',
        src: '/blog/internet-rakyat/foto-3.jpg',
        alt: 'Menentukan lokasi rumah melalui Google Maps',
        caption: 'Foto 3',
      },
      {
        type: 'image',
        src: '/blog/internet-rakyat/foto-4.jpg',
        alt: 'Membagikan tautan lokasi dari Google Maps',
        caption: 'Foto 4',
      },
      { type: 'h2', text: '4. Pengecekan Jangkauan dan Pemilihan Paket' },
      {
        type: 'p',
        text: 'Setelah lokasi ditentukan, tim Internet Rakyat akan mencocokkan data Anda dengan jangkauan ketersediaan layanan di wilayah tersebut.',
      },
      {
        type: 'p',
        text: 'Apabila lokasi Anda terjangkau, Anda akan diberikan pilihan paket serta metode pembayaran yang tersedia, di antaranya:',
      },
      {
        type: 'list',
        items: [
          'Virtual Account (VA)',
          'QRIS',
          'GoPay',
          'DANA',
          'OVO',
          'Pembayaran offline melalui outlet resmi',
        ],
      },
      { type: 'h2', text: '5. Pengiriman dan Aktivasi Modem' },
      {
        type: 'p',
        text: 'Setelah proses pemesanan selesai, modem akan dikirimkan kepada pelanggan dalam jangka waktu **7 hari kerja**.',
      },
      {
        type: 'p',
        text: 'Aktivasi modem dapat dilakukan secara mandiri oleh pelanggan dengan mengikuti panduan video resmi berikut:',
      },
      {
        type: 'link',
        href: 'https://www.youtube.com/watch?v=mwwagWY9Sg4',
        label: 'Tonton Tutorial Aktivasi Modem',
        variant: 'secondary',
      },
    ],
  },
];

export function getPostBySlug(slug) {
  return POSTS.find((p) => p.slug === slug);
}
