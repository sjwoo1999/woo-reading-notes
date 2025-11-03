'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { extractWikiLinks } from '@/lib/utils/wikiLinkParser';

interface NoteContentProps {
  content: string;
  noteIdMap: Map<string, string>; // Maps note title to note ID
}

/**
 * Component to render note content with wiki link support
 * Converts [[노트명]] to clickable links
 */
export default function NoteContent({ content, noteIdMap }: NoteContentProps) {
  const [renderedContent, setRenderedContent] = useState<(string | ReactNode)[]>([]);

  useEffect(() => {
    if (!content) {
      setRenderedContent([]);
      return;
    }

    // Extract all wiki links
    const wikiLinks = extractWikiLinks(content);

    if (wikiLinks.length === 0) {
      // No wiki links, return content as-is
      setRenderedContent([content]);
      return;
    }

    // Sort links by startIndex in descending order to process from end to start
    const sortedLinks = [...wikiLinks].sort((a, b) => b.startIndex - a.startIndex);

    // Build segments with wiki links converted to clickable elements
    const result: (string | ReactNode)[] = [];
    let lastIndex = content.length;

    for (const link of sortedLinks) {
      // Add content after this link
      if (lastIndex > link.endIndex) {
        result.unshift(content.substring(link.endIndex, lastIndex));
      }

      // Add the wiki link
      const noteId = noteIdMap.get(link.text);

      if (noteId) {
        // Create clickable link
        result.unshift(
          <Link
            key={`${link.startIndex}-${link.text}`}
            href={`/notes/${noteId}`}
            className="wiki-link"
            style={{
              color: '#3B4E76',
              textDecoration: 'underline',
              textDecorationColor: '#D7C9A7',
              textUnderlineOffset: '2px',
            }}
          >
            {link.displayText}
          </Link>
        );
      } else {
        // No matching note, show as plain text with different styling
        result.unshift(
          <span
            key={`${link.startIndex}-${link.text}`}
            style={{
              color: '#A67C52',
              opacity: 0.7,
            }}
          >
            {link.displayText}
          </span>
        );
      }

      // Add content before this link
      if (link.startIndex > 0) {
        result.unshift(content.substring(0, link.startIndex));
      }

      lastIndex = link.startIndex;
    }

    setRenderedContent(result);
  }, [content, noteIdMap]);

  return (
    <div
      style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: '1.6',
      }}
    >
      {renderedContent}
    </div>
  );
}
