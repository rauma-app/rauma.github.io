import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import Seo from '../components/Seo';
import ArticleContent from '../components/ArticleContent';
import { getPostBySlug } from '../data/tanahPosts';

const SITE_URL = 'https://rauma.id';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function TanahArticle() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);

  if (!post) {
    return <Navigate to="/tanah" replace />;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seoDescription,
    image: `${SITE_URL}${post.coverImage}`,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'Rauma' },
    publisher: { '@type': 'Organization', name: 'Rauma' },
    mainEntityOfPage: `${SITE_URL}/tanah/${post.slug}`,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Seo
        title={post.title}
        description={post.seoDescription}
        path={`/tanah/${post.slug}`}
        image={`${SITE_URL}${post.coverImage}`}
        jsonLd={jsonLd}
      />

      <Link to="/tanah" className="text-sm font-semibold text-forest">
        ← Kembali ke Tanah
      </Link>

      <h1 className="mt-3 font-display text-2xl font-semibold leading-snug text-navy sm:text-3xl">
        {post.title}
      </h1>
      <p className="mt-2 text-xs text-ink/50">{formatDate(post.date)}</p>

      <img
        src={post.coverImage}
        alt={post.title}
        className="mt-5 w-full rounded-2xl border border-line"
      />

      <ArticleContent blocks={post.content} />
    </div>
  );
}
