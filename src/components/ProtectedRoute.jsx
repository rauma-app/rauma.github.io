import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const attempted = useRef(false);

  useEffect(() => {
    if (loading || user || attempted.current) return;
    attempted.current = true;
    loginWithGoogle().catch(() => navigate('/'));
  }, [loading, user, loginWithGoogle, navigate]);

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-ink/50">Memuat...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-ink/50">
        Silakan masuk dengan Google untuk melanjutkan.
      </div>
    );
  }

  return children;
}
