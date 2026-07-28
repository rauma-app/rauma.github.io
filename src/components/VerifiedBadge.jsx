import React from 'react';

/**
 * Badge centang kuning ala verified, khusus ditampilkan di sebelah nama
 * akun admin/CEO. Cek keanggotaan lewat ADMIN_UIDS (src/lib/admin.js).
 */
export default function VerifiedBadge({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Akun Terverifikasi"
      role="img"
      className="inline-block shrink-0 align-middle"
    >
      <title>Akun Terverifikasi</title>
      <path
        d="M12 2l2.39 1.94 3.06-.4.99 2.9 2.9.99-.4 3.06L23 12l-1.94 2.39.4 3.06-2.9.99-.99 2.9-3.06-.4L12 23l-2.39-1.94-3.06.4-.99-2.9-2.9-.99.4-3.06L1 12l1.94-2.39-.4-3.06 2.9-.99.99-2.9 3.06.4L12 2z"
        fill="#F5B700"
      />
      <path
        d="M8.5 12.3l2.4 2.4 4.6-5.2"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
