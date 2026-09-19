import React from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { POSTS } from '../data/tanahPosts';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Tanah() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Seo
        title="Tanah"
        description="Lahan dan tanah pilihan untuk investasi, dari kebun produktif hingga lahan siap kembang, di seluruh Indonesia."
        path="/tanah"
      />

      <h1 className="font-display text-3xl font-semibold text-navy">Tanah</h1>
      <p className="mt-2 text-sm text-ink/60">
        Lahan dan tanah pilihan untuk investasi -- dari kebun produktif hingga lahan siap
        kembang.
      </p>

      <div className="mt-8 space-y-4">
        {POSTS.map((post) => (
          <Link
            key={post.slug}
            to={`/tanah/${post.slug}`}
            className="block rounded-2xl border border-line bg-white p-5 transition hover:border-forest"
          >
            <p className="text-xs text-ink/50">{formatDate(post.date)}</p>
            <h2 className="mt-1 font-display text-lg font-semibold leading-snug text-navy">
              {post.title}
            </h2>

            {post.specs?.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {post.specs.map((spec) => (
                  <div key={spec.label} className="rounded-xl bg-cream px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-ink/50">
                      {spec.label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-navy">{spec.value}</p>
                  </div>
                ))}
              </div>
            )}

            <span className="mt-4 inline-block text-sm font-semibold text-forest">
              Lihat detail →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
