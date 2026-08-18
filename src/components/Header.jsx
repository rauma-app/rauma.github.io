                  import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../lib/admin';
import { isPerumahanAdmin } from '../lib/perumahanAdmin';
import { usePremium } from '../context/PremiumContext';
import { d1Api } from '../lib/d1Api';
import rauLogo from '../assets/logo/rauma-logo.svg';

export default function Header() {
  const { user, loginWithGoogle, logout } = useAuth();
  const { perumahanAdminMap } = usePremium();
  const userIsPerumahanAdmin = isPerumahanAdmin(user, perumahanAdminMap);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Foto & nama yang tampil di header: utamakan profil custom yang udah
  // diisi di menu "Profil Saya", kalau belum pernah isi -> fallback ke
  // data bawaan akun Google. Sebelumnya header cuma pakai user.photoURL
  // langsung, jadi gak ikut kebaruan pas foto profil custom diganti.
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profileName, setProfileName] = useState(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setProfilePhoto(null);
      setProfileName(null);
      return;
    }
    d1Api.getProfile(user.uid).then((profile) => {
      if (!active) return;
      setProfilePhoto(profile?.photo || null);
      setProfileName(profile?.name || null);
    });
    return () => {
      active = false;
    };
    // Sengaja ikut re-fetch tiap pindah halaman (location.pathname) --
    // biar begitu user simpan foto baru di "Profil Saya" lalu navigasi ke
    // halaman lain, foto di header ikut kebaruan otomatis tanpa perlu
    // refresh manual.
  }, [user, location.pathname]);

  const displayPhoto = profilePhoto || user?.photoURL;
  const displayName = profileName || user?.displayName;

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handlePostingClick() {
    if (!user) {
      try {
        await loginWithGoogle();
        navigate('/posting');
      } catch (err) {
        console.error('Login gagal:', err);
        alert(`Login gagal: ${err.code || err.message}`);
      }
    } else {
      navigate('/posting');
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 relative">
        <Link to="/" className="flex items-center gap-2 overflow-visible">
          <img
            src={rauLogo}
            alt="Rauma"
            className="h-10 md:h-14 w-auto object-contain"
          />
        </Link>

        {!user ? (
          <button
            onClick={handlePostingClick}
            className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-dark"
          >
            + Pasang Iklan
          </button>
        ) : (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full border border-line bg-white p-1 pr-3 hover:border-forest"
            >
              <img
                src={displayPhoto}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="hidden text-sm font-medium text-ink sm:inline">
                {displayName?.split(' ')[0]}
              </span>
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
                <Link
                  to="/posting"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-sm text-ink hover:bg-cream"
                >
                  Posting
                </Link>
                <Link
                  to="/iklan-saya"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-sm text-ink hover:bg-cream"
                >
                  Iklan Saya
                </Link>
                {!userIsPerumahanAdmin && (
                  <Link
                    to="/disimpan"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 text-sm text-ink hover:bg-cream"
                  >
                    Disimpan
                  </Link>
                )}
                {!userIsPerumahanAdmin && (
                  <Link
                    to="/profil-saya"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 text-sm text-ink hover:bg-cream"
                  >
                    Profil Saya
                  </Link>
                )}
                {isAdmin(user) && !userIsPerumahanAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 text-sm text-forest hover:bg-cream"
                  >
                    Tinjau Iklan (Admin)
                  </Link>
                )}
                {isAdmin(user) && !userIsPerumahanAdmin && (
                  <Link
                    to="/admin/statistik"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 text-sm text-forest hover:bg-cream"
                  >
                    Statistik (Admin)
                  </Link>
                )}
                <button
                  onClick={async () => {
                    setOpen(false);
                    await logout();
                    navigate('/');
                  }}
                  className="block w-full border-t border-line px-4 py-3 text-left text-sm text-ink/60 hover:bg-cream"
                >
                  Keluar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
