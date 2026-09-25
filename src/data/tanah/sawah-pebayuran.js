// Satu file = satu artikel. Format block content dijelaskan di
// src/components/ArticleContent.jsx (tipe: p, h2, list, table, image,
// quote, code, link).

export default {
  slug: 'sawah-produktif-19258m2-pebayuran-bekasi',
  title: 'Sawah Produktif 19.258 m² di Pebayuran, Bekasi -- Bisa Diperluas hingga 3 Hektar',
  excerpt:
    'Sawah produktif seluas 19.258 m² di Pebayuran, Bekasi, hasil panen 12-16 ton per musim. Bisa diperluas hingga 3 hektar, harga Rp150.000/m².',
  date: '2026-09-25',
  coverImage: '/blog/sawah-pebayuran/foto-1.jpg',
  seoDescription:
    'Dijual sawah produktif 19.258 m² di Pebayuran, Bekasi. Hasil panen 12-16 ton per musim, bisa diperluas hingga 3 hektar. Harga Rp150.000/m², SHM.',
  specs: [
    { label: 'Harga', value: 'Rp 150 rb/m²' },
    { label: 'Luas Tanah', value: '19.258 m²' },
    { label: 'Panen', value: '12-16 ton/musim' },
  ],
  content: [
    {
      type: 'p',
      text: 'Tersedia sawah produktif seluas **19.258 m²** di Sumberreja, Kecamatan Pebayuran, Kabupaten Bekasi, Jawa Barat. Lahan ini masih aktif digarap dan menghasilkan panen padi secara rutin, dengan luas yang dapat **diperluas hingga 3 hektar** bagi yang berminat menambah area garapan.',
    },
    { type: 'h2', text: 'Informasi Lahan' },
    {
      type: 'table',
      rows: [
        ['Lokasi', 'Sumberreja, Kec. Pebayuran, Kabupaten Bekasi, Jawa Barat'],
        ['Luas', '19.258 m² (dapat diperluas hingga 3 Hektar)'],
        ['Legalitas', 'SHM atas nama orang tua pemilik'],
        ['Harga', '**Rp 150.000 / m²**'],
      ],
    },
    {
      type: 'image',
      src: '/blog/sawah-pebayuran/foto-1.jpg',
      alt: 'Sawah produktif di Pebayuran, Bekasi',
      caption: 'Foto 1',
    },
    { type: 'h2', text: 'Hasil Panen' },
    {
      type: 'p',
      text: 'Setiap musim panen, sawah ini menghasilkan sekitar **12-14 ton gabah**, dengan hasil terbaik yang pernah dicapai hingga **16 ton** dalam sekali panen.',
    },
    {
      type: 'image',
      src: '/blog/sawah-pebayuran/foto-2.jpg',
      alt: 'Lahan sawah Pebayuran, Bekasi',
      caption: 'Foto 2',
    },
    { type: 'h2', text: 'Kontak' },
    {
      type: 'link',
      href: 'https://wa.me/6285156222635',
      label: 'WhatsApp: 085156222635',
    },
    {
      type: 'list',
      items: [
        'Instagram: [@alamproper.ty](https://instagram.com/alamproper.ty)',
        'Threads: [@alamproper.ty](https://www.threads.net/@alamproper.ty)',
      ],
    },
  ],
};
