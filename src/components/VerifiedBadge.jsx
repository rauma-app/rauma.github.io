import React from 'react';

const COLORS = {
  gold: '#F5B700', // admin/CEO
  blue: '#1D9BF0', // akun premium
};

/**
 * Badge centang ala verified, ditampilkan di sebelah nama.
 * color="gold" untuk admin/CEO (ADMIN_UIDS), color="blue" untuk akun
 * premium (PREMIUM_UIDS). Lihat src/lib/admin.js dan src/lib/premium.js.
 */
export default function VerifiedBadge({ size = 16, color = 'gold' }) {
  const fill = COLORS[color] || COLORS.gold;
  const label = color === 'blue' ? 'Akun Premium' : 'Akun Terverifikasi';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label={label}
      role="img"
      className="inline-block shrink-0 align-middle"
    >
      <title>{label}</title>
      <path
        d="M12 2l2.39 1.94 3.06-.4.99 2.9 2.9.99-.4 3.06L23 12l-1.94 2.39.4 3.06-2.9.99-.99 2.9-3.06-.4L12 23l-2.39-1.94-3.06.4-.99-2.9-2.9-.99.4-3.06L1 12l1.94-2.39-.4-3.06 2.9-.99.99-2.9 3.06.4L12 2z"
        fill={fill}
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
