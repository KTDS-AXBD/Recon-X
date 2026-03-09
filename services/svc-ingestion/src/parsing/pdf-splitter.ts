import { PDFDocument } from "pdf-lib";
import { createLogger } from "@ai-foundry/utils";

const logger = createLogger("svc-ingestion:pdf-splitter");

/** Threshold: split if file > 5MB OR page count > 20 */
const SPLIT_SIZE_THRESHOLD_BYTES = 5 * 1024 * 1024;
const SPLIT_PAGE_THRESHOLD = 20;
/** Default chunk size: 10 pages per split */
const DEFAULT_PAGES_PER_CHUNK = 10;
/** Minimum chunk size for retry with smaller splits */
const MIN_PAGES_PER_CHUNK = 3;

export type PdfSplitResult = {
  /** Whether the PDF was actually split (false = sent as-is) */
  wasSplit: boolean;
  /** Total page count of the original PDF */
  totalPages: number;
  /** Split PDF chunks as ArrayBuffer, each covering a page range */
  chunks: PdfChunk[];
};

export type PdfChunk = {
  /** 0-based index of this chunk */
  index: number;
  /** 1-based start page (inclusive) */
  startPage: number;
  /** 1-based end page (inclusive) */
  endPage: number;
  /** PDF bytes for this chunk */
  bytes: ArrayBuffer;
};

/**
 * Detect whether a PDF needs splitting and return split chunks if so.
 * Returns a single-chunk result (wasSplit=false) if the PDF is small enough.
 */
export async function splitPdfIfNeeded(
  fileBytes: ArrayBuffer,
  pagesPerChunk: number = DEFAULT_PAGES_PER_CHUNK,
): Promise<PdfSplitResult> {
  const srcDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const needsSplit =
    fileBytes.byteLength > SPLIT_SIZE_THRESHOLD_BYTES || totalPages > SPLIT_PAGE_THRESHOLD;

  if (!needsSplit) {
    return {
      wasSplit: false,
      totalPages,
      chunks: [{ index: 0, startPage: 1, endPage: totalPages, bytes: fileBytes }],
    };
  }

  logger.info("Splitting large PDF", {
    sizeMB: (fileBytes.byteLength / (1024 * 1024)).toFixed(1),
    totalPages,
    pagesPerChunk,
  });

  const chunks: PdfChunk[] = [];
  let chunkIndex = 0;

  for (let start = 0; start < totalPages; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk, totalPages);
    const pageIndices = Array.from({ length: end - start }, (_, i) => start + i);

    const chunkDoc = await PDFDocument.create();
    const copiedPages = await chunkDoc.copyPages(srcDoc, pageIndices);
    for (const page of copiedPages) {
      chunkDoc.addPage(page);
    }

    const chunkBytes = await chunkDoc.save();

    chunks.push({
      index: chunkIndex,
      startPage: start + 1,
      endPage: end,
      bytes: chunkBytes.buffer as ArrayBuffer,
    });
    chunkIndex++;
  }

  logger.info("PDF split complete", { totalPages, chunkCount: chunks.length, pagesPerChunk });

  return { wasSplit: true, totalPages, chunks };
}

/**
 * Get a smaller pages-per-chunk value for retry.
 * Returns null if already at minimum.
 */
export function getSmallerChunkSize(currentPagesPerChunk: number): number | null {
  const smaller = Math.floor(currentPagesPerChunk / 2);
  if (smaller < MIN_PAGES_PER_CHUNK) return null;
  return smaller;
}

export { DEFAULT_PAGES_PER_CHUNK, SPLIT_SIZE_THRESHOLD_BYTES, SPLIT_PAGE_THRESHOLD, MIN_PAGES_PER_CHUNK };
