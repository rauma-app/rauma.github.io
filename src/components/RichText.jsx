import React from 'react';

// Parser ringan buat teks artikel blog: mendukung **bold** dan [label](url).
// Sengaja gak pakai dangerouslySetInnerHTML / library markdown penuh --
// cukup buat kebutuhan artikel tutorial yang isinya paragraf + penekanan.
export default function RichText({ text }) {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'link', label: match[1], href: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  function renderBold(str, keyPrefix) {
    return str.split(/(\*\*[^*]+\*\*)/g).map((segment, i) => {
      if (segment.startsWith('**') && segment.endsWith('**')) {
        return (
          <strong key={`${keyPrefix}-${i}`} className="font-semibold text-navy">
            {segment.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={`${keyPrefix}-${i}`}>{segment}</React.Fragment>;
    });
  }

  return (
    <>
      {parts.map((part, i) =>
        part.type === 'link' ? (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-forest underline"
          >
            {part.label}
          </a>
        ) : (
          <React.Fragment key={i}>{renderBold(part.value, i)}</React.Fragment>
        )
      )}
    </>
  );
}
