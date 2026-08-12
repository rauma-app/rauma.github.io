import { useEffect } from 'react';

const SITE_NAME = 'Rauma';
const SITE_URL = 'https://rauma.id';

function setMetaTag(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLinkTag(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!data) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Komponen tanpa render apapun ke layar — cuma menyuntik/update
 * <title>, meta description, canonical URL, Open Graph, dan
 * JSON-LD structured data ke <head> tiap kali props berubah.
 *
 * Pasang di halaman manapun yang butuh SEO spesifik (halaman detail
 * listing, halaman kategori kota/kecamatan, dst).
 */
export default function Seo({ title, description, path, jsonLd, image }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Jual Beli Rumah KPR`;
    document.title = fullTitle;

    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:site_name', SITE_NAME);
    if (image) setMetaTag('property', 'og:image', image);
    setMetaTag('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', description);

    const canonical = path ? `${SITE_URL}${path}` : undefined;
    setLinkTag('canonical', canonical);
    setMetaTag('property', 'og:url', canonical);

    setJsonLd('seo-jsonld', jsonLd || null);

    // Bersihkan JSON-LD saat komponen unmount / pindah halaman.
    return () => setJsonLd('seo-jsonld', null);
  }, [title, description, path, jsonLd, image]);

  return null;
}
