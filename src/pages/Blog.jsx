import React from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { POSTS } from '../data/blogPosts';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Blog() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Seo
        title="Blog"
        description="Tips, panduan, dan artikel seputar rumah, KPR, dan properti dari Rauma."
        path="/blog"
      />

      <h1 className="font-display text-3xl font-semibold text-navy">Blog</h1>
      <p className="mt-2 text-sm text-ink/60">
        Tips, panduan, dan artikel seputar rumah, KPR, dan properti.
      </p>

      <div className="mt-8 space-y-5">
        {POSTS.map((post) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            className="block overflow-hidden rounded-2xl border border-line bg-white transition hover:border-forest"
          >
            <img
              src={post.coverImage}
              alt={post.title}
              className="h-48 w-full object-cover"
            />
            <div className="p-5">
              <p className="text-xs text-ink/50">{formatDate(post.date)}</p>
              <h2 className="mt-1 font-display text-lg font-semibold text-navy">
                {post.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{post.excerpt}</p>
              <span className="mt-3 inline-block text-sm font-semibold text-forest">
                Baca selengkapnya →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
