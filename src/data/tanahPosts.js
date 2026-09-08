// Data artikel Tanah. Tambah artikel baru dengan menambahkan object baru
// ke array POSTS di bawah -- gak perlu bikin halaman React baru per
// artikel. Format block content sama seperti blogPosts.js, lihat
// src/components/ArticleContent.jsx untuk daftar tipe block yang didukung.

export const POSTS = [
  {
    slug: 'kebun-teh-cipasung-42-hektar-majalengka',
    title: 'Kebun Teh Cipasung: 42 Hektar Lahan Produktif di Jantung Kawasan Rebana, Majalengka',
    excerpt:
      '42 hektar kebun teh produktif dengan legalitas SHM lengkap di Lemahsugih, Majalengka -- cashflow berjalan, dekat Tol Cisumdawu & Bandara Kertajati.',
    date: '2026-09-07',
    coverImage: '/blog/kebun-teh-cipasung/banner.webp',
    seoDescription:
      '42 hektar kebun teh produktif SHM lengkap di Majalengka, cashflow berjalan Rp948 juta/tahun, dekat Tol Cisumdawu & Bandara Kertajati. Siap jadi resort/agrowisata.',
    content: [
      {
        type: 'p',
        text: 'Di antara perbukitan sejuk Lemahsugih, Kabupaten Majalengka, terhampar salah satu aset lahan paling langka yang bisa ditemukan di Jawa Barat saat ini: kebun teh aktif seluas **42 hektar** dengan legalitas lengkap, cashflow yang sudah berjalan, dan lokasi yang tepat berada di jantung salah satu kawasan pertumbuhan ekonomi terbesar Jawa Barat -- **Kawasan Rebana**.',
      },
      {
        type: 'p',
        text: 'Ini bukan sekadar tanah kosong yang dijual dengan janji potensi di masa depan. Ini adalah kebun teh yang **sudah produktif hari ini**, dengan hasil panen yang rutin disalurkan ke pabrik-pabrik teh besar seperti Sosro dan Teh Tong Tjie.',
      },
      { type: 'h2', text: 'Sekilas Tentang Lahan' },
      {
        type: 'table',
        rows: [
          ['Lokasi', 'Blok Mulyajaya, Kp. Nyangkokot, Desa Cipasung, Kec. Lemahsugih, Kab. Majalengka'],
          ['Luas', '± 42 Hektar (dapat dikembangkan lebih luas)'],
          ['Legalitas', '52 bidang bersertifikat SHM, bebas sengketa'],
          ['Kondisi', 'Produktif -- 2-2,5 ton pucuk basah per hari'],
          ['Penyaluran hasil', 'Pabrik Teh Sosro & Teh Tong Tjie'],
          ['Fasilitas', 'Pabrik pengolahan + 10 mesin penggiling & pengeringan, rumah mess karyawan, rumah kantor operasional'],
          ['Harga', '**Rp 26.000.000.000** (Negotiable)'],
        ],
      },
      {
        type: 'image',
        src: '/blog/kebun-teh-cipasung/pemandangan.webp',
        alt: 'Pemandangan Kebun Teh Cipasung',
        caption: 'Foto 1',
      },
      { type: 'h2', text: 'Bukan Lahan Kosong -- Ini Bisnis yang Sudah Berjalan' },
      {
        type: 'p',
        text: 'Salah satu hal yang membedakan Kebun Teh Cipasung dari kebanyakan listing tanah lainnya adalah: **pembeli tidak memulai dari nol**. Berdasarkan data operasional yang berjalan, kebun ini menghasilkan profit bersih sekitar **Rp 79 juta per bulan**, atau **± Rp 948,7 juta per tahun**, dari hasil penjualan teh kering saja -- sebelum satu rupiah pun diinvestasikan untuk pengembangan lain.',
      },
      { type: 'p', text: 'Rincian arus kas tahunan:' },
      {
        type: 'list',
        items: [
          'Pendapatan penjualan teh: Rp 2,1 miliar/tahun',
          'Biaya perawatan kebun: Rp 215,25 juta/tahun',
          'Biaya pemetikan & operasional: Rp 936 juta/tahun',
          '**Profit bersih: Rp 948,75 juta/tahun**',
        ],
      },
      {
        type: 'image',
        src: '/blog/kebun-teh-cipasung/pemetikan.webp',
        alt: 'Aktivitas pemetikan teh di kebun',
        caption: 'Foto 2',
      },
      { type: 'h2', text: 'Legalitas yang Bersih dan Siap Proses' },
      {
        type: 'p',
        text: 'Seluruh 52 bidang tanah tercatat atas nama pemilik dengan **Sertifikat Hak Milik (SHM)** lengkap dengan NOP/NJOP resmi per bidang. Status ini diperkuat dengan **Surat Keterangan Tanah Tidak Sengketa** Nomor 500/569/Des-2025 yang diterbitkan langsung oleh Kepala Desa Cipasung.',
      },
      {
        type: 'p',
        text: 'Kepemilikan berada dalam satu keluarga yang tengah mempersiapkan pembagian waris -- artinya proses akuisisi bisa lebih sederhana karena hanya melibatkan satu pihak penjual utama, tanpa perlu negosiasi dengan puluhan pemilik bidang secara terpisah seperti yang biasa terjadi pada lahan seluas ini.',
      },
      { type: 'h2', text: 'Kenapa Majalengka, Bukan Ciwidey atau Lembang?' },
      {
        type: 'p',
        text: 'Bila membandingkan dengan destinasi wisata perbukitan yang sudah mapan seperti Ciwidey dan Lembang, Majalengka justru berada pada **fase awal kurva pertumbuhan**:',
      },
      {
        type: 'list',
        items: [
          '**Akses infrastruktur unggul** -- diapit Tol Cisumdawu, Tol Cipali, dan berjarak dekat dari Bandara Internasional Kertajati (BIJB), tanpa harus menembus kemacetan Kota Bandung seperti rute menuju Ciwidey/Lembang.',
          '**Harga lahan masih terjangkau** -- dengan potensi capital gain yang jauh lebih tinggi dibanding kawasan yang harganya sudah di titik puncak.',
          '**Kompetitor minim** -- belum ada pemain resort atau glamping mewah berskala besar di kawasan ini, membuka peluang menjadi pionir.',
          '**Captive market besar** -- berada 30-45 menit dari Cirebon, Indramayu, dan Subang, kawasan bisnis dan industri migas dengan jutaan penduduk kelas menengah-atas.',
          '**Berada di Segitiga Emas Kawasan Rebana** -- mega-proyek ekonomi terpadu Jawa Barat yang menghubungkan Pelabuhan Internasional Patimban (Subang) dan Bandara Internasional Kertajati (Majalengka).',
        ],
      },
      {
        type: 'image',
        src: '/blog/kebun-teh-cipasung/maps.jpg',
        alt: 'Akses jalan menuju kawasan Kebun Teh Cipasung',
        caption: 'Foto 3',
      },
      { type: 'h2', text: 'Potensi Pengembangan: Lebih dari Sekadar Kebun Teh' },
      {
        type: 'p',
        text: 'Topografi perbukitan, udara sejuk, hamparan kebun hijau, dan sumber mata air alami membuka ruang diversifikasi bisnis yang jauh lebih besar daripada hasil perkebunan semata:',
      },
      {
        type: 'list',
        items: [
          '**Agrowisata Kebun Teh** -- wisata edukasi petik teh, jalur trekking, spot foto ikonik, dan kafe kebun terbuka.',
          '**Glamping / Eco-Camp** -- tenda mewah di titik-titik punggung bukit dengan pemandangan kebun teh dan matahari terbit.',
          '**Boutique Resort & Wellness Retreat** -- resort skala butik untuk segmen wellness retreat, MICE kecil, dan weekend getaway.',
          '**AMDK & Produk Turunan Teh** -- mata air alami berpotensi dikembangkan menjadi Air Minum Dalam Kemasan, sementara hasil kebun bisa diperluas menjadi produk teh bermerek sendiri.',
        ],
      },
      {
        type: 'image',
        src: '/blog/kebun-teh-cipasung/glamping.jpg',
        alt: 'Ilustrasi potensi pengembangan agrowisata dan resort',
        caption: 'Foto 4',
      },
      { type: 'h2', text: 'Kesimpulan' },
      {
        type: 'p',
        text: 'Kebun Teh Cipasung menggabungkan empat hal yang jarang ditemukan bersamaan pada satu aset: **legalitas bersih**, **cashflow yang sudah terbukti berjalan**, **lokasi strategis** di episentrum megaproyek infrastruktur Jawa Barat, dan **ruang pengembangan bisnis** yang luas. Bagi investor atau pengembang yang mencari lahan besar dengan fundamental kuat sebelum harga kawasan ini mengikuti jejak kenaikan seperti Ciwidey dan Lembang, ini adalah window of opportunity yang layak dipertimbangkan.',
      },
      {
        type: 'p',
        text: 'Tertarik untuk survei lokasi langsung atau ingin data lebih lengkap? Hubungi kami untuk penjadwalan kunjungan atau diskusi lebih lanjut mengenai skema akuisisi.',
      },
    ],
  },
];

export function getPostBySlug(slug) {
  return POSTS.find((p) => p.slug === slug);
}
