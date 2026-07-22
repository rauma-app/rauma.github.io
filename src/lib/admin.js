// Daftar UID Firebase Auth yang dianggap admin.
// Cara dapetin UID kamu sendiri:
//   Firebase Console -> Authentication -> tab "Users" -> cari akun Google kamu
//   -> kolom "User UID" itu yang di-copy ke sini.
export const ADMIN_UIDS = [
  'al7pklcovEhT9Dfusg6diEmrzfO2',
];

export function isAdmin(user) {
  return Boolean(user && ADMIN_UIDS.includes(user.uid));
}
