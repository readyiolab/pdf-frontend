import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "@/lib/pdf";

export interface SearchHit {
  page: number; // 1-indexed
  /** Index of the hit within its page, for stable ordering. */
  indexInPage: number;
}

/**
 * Full-document text search.
 *
 * Text extraction is the expensive part (one worker round-trip per page), so
 * each page's text is pulled once and cached for the life of the document —
 * subsequent searches are pure string matching over the cache. Extraction runs
 * lazily on the first search rather than at open, so a user who never searches
 * never pays for it.
 */
export function usePdfSearch(pdf: PDFDocumentProxy | null, pageCount: number) {
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [currentHit, setCurrentHit] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const textCacheRef = useRef<Map<number, string>>(new Map());

  // A new document invalidates the cache; keeping it would search the old file.
  useEffect(() => {
    textCacheRef.current.clear();
    setTerm("");
    setHits([]);
    setCurrentHit(0);
  }, [pdf]);

  useEffect(() => {
    const needle = term.trim().toLowerCase();
    if (!pdf || needle.length < 2) {
      // Single characters match nearly everything and make the UI thrash.
      setHits([]);
      setCurrentHit(0);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    (async () => {
      const found: SearchHit[] = [];

      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        if (cancelled) return;

        let text = textCacheRef.current.get(pageNum);
        if (text === undefined) {
          try {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            text = content.items
              .map((i) => (i as { str?: string }).str ?? "")
              .join(" ")
              .toLowerCase();
            textCacheRef.current.set(pageNum, text);
          } catch {
            text = "";
            textCacheRef.current.set(pageNum, text);
          }
        }
        if (cancelled) return;

        // Count every occurrence, not just the first — "1 of 12" has to be true.
        let from = 0;
        let indexInPage = 0;
        for (;;) {
          const at = text.indexOf(needle, from);
          if (at === -1) break;
          found.push({ page: pageNum, indexInPage: indexInPage++ });
          from = at + needle.length;
        }
      }

      if (cancelled) return;
      setHits(found);
      setCurrentHit(0);
      setIsSearching(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [term, pdf, pageCount]);

  const nextHit = useCallback(() => {
    setCurrentHit((i) => (hits.length ? (i + 1) % hits.length : 0));
  }, [hits.length]);

  const prevHit = useCallback(() => {
    setCurrentHit((i) => (hits.length ? (i - 1 + hits.length) % hits.length : 0));
  }, [hits.length]);

  return {
    term,
    setTerm,
    hits,
    hitCount: hits.length,
    currentHit,
    currentHitPage: hits[currentHit]?.page ?? null,
    isSearching,
    nextHit,
    prevHit,
  };
}
