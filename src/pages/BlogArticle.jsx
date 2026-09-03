import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import Seo from '../components/Seo';
import RichText from '../components/RichText';
import { getPostBySlug } from '../data/blogPosts';

const SITE_URL = 'https://rauma.id';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ContentBlock({ block }) {
  switch (block.type) {
    case 'h2':
      return (
        <h2 className="mt-8 font-display text-xl font-semibold text-navy">{block.text}</h2>
      );
    case 'p':
      return (
        <p className="mt-3 text-[15px] leading-relaxed text-ink/80">
          <RichText text={block.text} />
        </p>
      );
    case 'list':
      return (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink/80">
          {block.items.map((item, i) => (
            <li key={i}>
              <RichText text={item} />
            </li>
          ))}
        </ul>
      );
    case 'image':
      return (
        <figure className="mt-5">
          <img
            src={block.src}
            alt={block.alt}
            className="w-full rounded-xl border border-line"
          />
          {block.caption && (
            <figcaption className="mt-1.5 text-center text-xs text-ink/50">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    case 'quote':
      return (
        <blockquote className="mt-4 rounded-xl border border-forest/30 bg-forest/5 px-4 py-3 text-[15px] font-medium italic text-forest">
          "{block.text}"
        </blockquote>
      );
    case 'code':
      return (
        <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-cream px-3 py-2">
          <code className="whitespace-nowrap break-all font-mono text-xs text-ink/70">
            {block.text}
          </code>
        </div>
      );
    case 'link':
      return block.variant === 'secondary' ? (
        <a
          href={block.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full rounded-full border border-forest px-6 py-2.5 text-center text-sm font-semibold text-forest hover:bg-forest/5"
        >
          {block.label}
        </a>
      ) : (
        <a
          href={block.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full rounded-full bg-forest px-6 py-2.5 text-center text-sm font-semibold text-white hover:bg-forest-dark"
        >
          {block.label}
        </a>
      );
    default:
      return null;
  }
}

export default function BlogArticle() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
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
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Seo
        title={post.title}
        description={post.seoDescription}
        path={`/blog/${post.slug}`}
        image={`${SITE_URL}${post.coverImage}`}
        jsonLd={jsonLd}
      />

      <Link to="/blog" className="text-sm font-semibold text-forest">
        ← Kembali ke Blog
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

      <article className="mt-2">
        {post.content.map((block, i) => (
          <ContentBlock key={i} block={block} />
        ))}
      </article>

      <div className="mt-10 rounded-2xl border border-line bg-white p-5">
        <p className="text-sm text-ink/70">Cari rumah KPR yang sesuai kebutuhan kamu?</p>
        <Link to="/" className="mt-2 inline-block text-sm font-semibold text-forest underline">
          Jelajahi Rauma
        </Link>
      </div>
    </div>
  );
}
