import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, loginWithGoogle, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handlePostingClick() {
    if (!user) {
      // Belum login -> arahkan ke Google Sign-In, lalu langsung ke halaman posting.
      try {
        await loginWithGoogle();
        navigate('/posting');
      } catch (err) {
        console.error('Login gagal:', err);
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
        src="/rauma-logo.png" 
        alt="Rauma" 
        className="h-16 md:h-18 w-auto object-contain" 
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
                src={user.photoURL}
                alt={user.displayName}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="hidden text-sm font-medium text-ink sm:inline">
                {user.displayName?.split(' ')[0]}
              </span>
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
                <Link
                  to="/iklan-saya"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-sm text-ink hover:bg-cream"
                >
                  Iklan Saya
                </Link>
                <Link
                  to="/posting"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-sm text-ink hover:bg-cream"
                >
                  Posting
                </Link>
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
