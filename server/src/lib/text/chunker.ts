import { createHash } from 'node:crypto';

export interface ChunkOptions {
  minSize?: number;
  maxSize?: number;
  overlap?: number;
}

export interface ChunkResult {
  content: string;
  page: number;
  contentHash: string;
}

export interface PageInput {
  text: string;
  pageNumber: number;
}

// Sentence-ending characters for Chinese + common separators
const SENTENCE_END = /[。！？!?;\n]/;

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Split text into chunks of 500-800 characters with 80-120 character overlap.
 * Attempts to break on sentence boundaries (。！？\n) when possible.
 * Tracks which source page each chunk belongs to.
 */
export function chunkText(
  text: string,
  pages: PageInput[],
  options?: ChunkOptions,
): ChunkResult[] {
  const minSize = options?.minSize ?? 500;
  const maxSize = options?.maxSize ?? 800;
  const overlap = options?.overlap ?? 100;

  const results: ChunkResult[] = [];

  // Build a map: each character position → page number
  const charToPage = new Map<number, number>();
  let pos = 0;
  for (const page of pages) {
    for (let i = 0; i < page.text.length; i++) {
      charToPage.set(pos + i, page.pageNumber);
    }
    pos += page.text.length;
    // Account for the \n join in extractTextFromPdf
    charToPage.set(pos, page.pageNumber);
    pos += 1;
  }

  if (text.length === 0) return results;

  let start = 0;
  while (start < text.length) {
    // Target end position
    let end = Math.min(start + maxSize, text.length);

    // If we're not at the end, try to break at a sentence boundary
    if (end < text.length) {
      // Search backwards from maxSize for a sentence end
      const searchStart = Math.max(start + minSize, end - 200);
      let breakPoint = -1;
      for (let i = end; i >= searchStart; i--) {
        const char = text[i];
        if (char !== undefined && SENTENCE_END.test(char)) {
          breakPoint = i + 1;
          break;
        }
      }
      if (breakPoint > 0) {
        end = breakPoint;
      }
      // If no sentence boundary found and we have at least minSize, just cut at maxSize
    }

    const chunkContent = text.slice(start, end);
    const chunkStartPage = charToPage.get(start) ?? pages[0]?.pageNumber ?? 1;

    results.push({
      content: chunkContent,
      page: chunkStartPage,
      contentHash: hashContent(chunkContent),
    });

    if (end >= text.length) break;

    // Next chunk starts with overlap
    start = end - overlap;
    if (start <= 0) start = end; // Safety: prevent infinite loop
  }

  return results;
}