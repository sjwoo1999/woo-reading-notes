/**
 * Wiki Link Parser Utility
 *
 * Handles parsing, validation, and rendering of wiki links
 * Format: [[노트명]] or [[노트명|표시텍스트]]
 */

// Wiki link regex pattern
// Matches: [[text]] or [[text|display]]
export const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export interface WikiLink {
  text: string;
  displayText: string;
  startIndex: number;
  endIndex: number;
}

export interface WikiLinkMatch extends WikiLink {
  foundNoteId?: string;
  foundNoteTitle?: string;
  type: 'exact' | 'partial' | 'notfound';
}

/**
 * Extract all wiki links from text
 * @param text - Content text to parse
 * @returns Array of WikiLink objects
 */
export function extractWikiLinks(text: string): WikiLink[] {
  const links: WikiLink[] = [];
  let match;

  // Reset lastIndex for global regex
  WIKI_LINK_REGEX.lastIndex = 0;

  while ((match = WIKI_LINK_REGEX.exec(text)) !== null) {
    const text = match[1].trim();
    const displayText = (match[2] || match[1]).trim();

    // Validate: at least 1 character
    if (text.length === 0) continue;

    links.push({
      text,
      displayText,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return links;
}

/**
 * Check if text contains valid wiki links
 * @param text - Content text to check
 * @returns true if valid wiki links exist
 */
export function hasWikiLinks(text: string): boolean {
  return WIKI_LINK_REGEX.test(text);
}

/**
 * Replace wiki links with custom callback
 * @param text - Content text
 * @param callback - Function to process each match
 * @returns Modified text
 */
export function replaceWikiLinks(text: string, callback: (link: WikiLink) => string): string {
  let result = text;
  let offset = 0;
  const links = extractWikiLinks(text);

  for (const link of links) {
    const replacement = callback(link);
    const start = link.startIndex + offset;
    const end = link.endIndex + offset;

    result = result.substring(0, start) + replacement + result.substring(end);
    offset += replacement.length - (end - start);
  }

  return result;
}

/**
 * Highlight wiki links in text for preview
 * @param text - Content text
 * @returns HTML string with highlighted wiki links
 */
export function highlightWikiLinks(text: string): {
  html: string;
  validLinks: WikiLink[];
  invalidLinks: WikiLink[];
} {
  const validLinks: WikiLink[] = [];
  const invalidLinks: WikiLink[] = [];
  const links = extractWikiLinks(text);

  let html = text;
  let offset = 0;

  for (const link of links) {
    const start = link.startIndex + offset;
    const end = link.endIndex + offset;
    const originalText = html.substring(start, end);

    // Simple validation: non-empty text
    if (link.text.length > 0) {
      validLinks.push(link);
      const highlighted = `<mark class="wiki-link-valid">${originalText}</mark>`;
      html = html.substring(0, start) + highlighted + html.substring(end);
      offset += highlighted.length - (end - start);
    } else {
      invalidLinks.push(link);
      const highlighted = `<mark class="wiki-link-invalid">${originalText}</mark>`;
      html = html.substring(0, start) + highlighted + html.substring(end);
      offset += highlighted.length - (end - start);
    }
  }

  return { html, validLinks, invalidLinks };
}

/**
 * Normalize note title for matching
 * Case-insensitive, trim whitespace
 * @param title - Note title
 * @returns Normalized title
 */
export function normalizeTitle(title: string): string {
  return title.toLowerCase().trim();
}

/**
 * Search for matching notes (case-insensitive)
 * @param wikiLinkText - Wiki link text to match
 * @param availableTitles - Available note titles to search
 * @returns Matching note title or null
 */
export function findMatchingNote(wikiLinkText: string, availableTitles: string[]): string | null {
  const normalized = normalizeTitle(wikiLinkText);

  // Exact match (case-insensitive)
  for (const title of availableTitles) {
    if (normalizeTitle(title) === normalized) {
      return title;
    }
  }

  // No match found
  return null;
}

/**
 * Search for matching notes with prefix matching
 * Used for autocomplete
 * @param query - Search query
 * @param availableTitles - Available note titles
 * @returns Array of matching titles
 */
export function searchNotesByPrefix(query: string, availableTitles: string[]): string[] {
  if (query.length === 0) return [];

  const normalized = normalizeTitle(query);
  const prefixMatches: string[] = [];
  const containsMatches: string[] = [];

  for (const title of availableTitles) {
    const normalizedTitle = normalizeTitle(title);

    if (normalizedTitle.startsWith(normalized)) {
      prefixMatches.push(title);
    } else if (normalizedTitle.includes(normalized)) {
      containsMatches.push(title);
    }
  }

  // Return prefix matches first, then contains matches
  return [...prefixMatches, ...containsMatches];
}

/**
 * Convert wiki link to HTML link
 * @param link - WikiLink object
 * @param noteId - Target note ID
 * @returns HTML anchor tag
 */
export function wikiLinkToHtml(link: WikiLink, noteId: string): string {
  return `<a href="/notes/${noteId}" class="wiki-link">${link.displayText}</a>`;
}

/**
 * Parse wiki link text to extract note name and display text
 * @param linkText - Text inside [[ ]]
 * @returns Object with text and displayText
 */
export function parseWikiLinkText(linkText: string): { text: string; displayText: string } {
  const parts = linkText.split('|').map((p) => p.trim());

  return {
    text: parts[0],
    displayText: parts[1] || parts[0],
  };
}

/**
 * Validate wiki link format
 * @param text - Wiki link text (without brackets)
 * @returns true if valid
 */
export function isValidWikiLinkFormat(text: string): boolean {
  // Must be non-empty after trimming
  if (text.trim().length === 0) return false;

  // Allow: alphanumeric, spaces, korean, underscore, hyphen
  // Disallow: <>{}[] special chars that conflict with wiki syntax
  const validPattern = /^[^\[\]<>{}]+$/;
  return validPattern.test(text);
}
