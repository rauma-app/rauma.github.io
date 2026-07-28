// Daftar UID Firebase Auth yang dianggap admin.
// Cara dapetin UID kamu sendiri:
//   Firebase Console -> Authentication -> tab "Users" -> cari akun Google kamu
//   -> kolom "User UID" itu yang di-copy ke sini.
export const ADMIN_UIDS = [
  'Wo0FNtm65fRmzrt35IQ3cgxm3fp1',
];

export function isAdmin(user) {
  return Boolean(user && ADMIN_UIDS.includes(user.uid));
}
