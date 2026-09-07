import React from 'react';
import RichText from './RichText';

// Renderer blok konten artikel, dipakai bareng oleh halaman Blog dan Tanah
// supaya format datanya konsisten & gak ada logika render yang dobel.
//
// Tipe block yang didukung:
// - { type: 'h2', text }
// - { type: 'p', text }                 -> boleh pakai **bold**
// - { type: 'list', items }             -> tiap item boleh pakai **bold**
// - { type: 'table', rows }             -> rows: [[label, value], ...]
// - { type: 'image', src, alt, caption }
// - { type: 'quote', text }
// - { type: 'code', text }
// - { type: 'link', href, label, variant } -> variant: 'primary' (default) | 'secondary'
export default function ArticleContent({ blocks }) {
  return (
    <article className="mt-2">
      {blocks.map((block, i) => (
        <ContentBlock key={i} block={block} />
      ))}
    </article>
  );
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
    case 'table':
      return (
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-[14px]">
            <tbody>
              {block.rows.map(([label, value], i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-cream' : 'bg-white'}>
                  <th
                    scope="row"
                    className="w-1/3 border-b border-line px-3 py-2 align-top font-semibold text-navy last:border-b-0"
                  >
                    {label}
                  </th>
                  <td className="border-b border-line px-3 py-2 align-top text-ink/80 last:border-b-0">
                    <RichText text={value} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
