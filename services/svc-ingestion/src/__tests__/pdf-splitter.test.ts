import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  splitPdfIfNeeded,
  getSmallerChunkSize,
  SPLIT_SIZE_THRESHOLD_BYTES,
  SPLIT_PAGE_THRESHOLD,
  MIN_PAGES_PER_CHUNK,
} from "../parsing/pdf-splitter.js";

/**
 * Helper: create a PDF with N blank pages for testing.
 */
async function createTestPdf(pageCount: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([612, 792]); // US Letter
  }
  const bytes = await doc.save();
  return bytes.buffer as ArrayBuffer;
}

// ── splitPdfIfNeeded ───────────────────────────────────────────────

describe("splitPdfIfNeeded", () => {
  it("does not split small PDFs (< threshold)", async () => {
    const pdf = await createTestPdf(5);
    const result = await splitPdfIfNeeded(pdf);

    expect(result.wasSplit).toBe(false);
    expect(result.totalPages).toBe(5);
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]!.startPage).toBe(1);
    expect(result.chunks[0]!.endPage).toBe(5);
  });

  it("splits PDFs exceeding page threshold", async () => {
    const pdf = await createTestPdf(25);
    const result = await splitPdfIfNeeded(pdf, 10);

    expect(result.wasSplit).toBe(true);
    expect(result.totalPages).toBe(25);
    expect(result.chunks).toHaveLength(3); // 10 + 10 + 5
    expect(result.chunks[0]!.startPage).toBe(1);
    expect(result.chunks[0]!.endPage).toBe(10);
    expect(result.chunks[1]!.startPage).toBe(11);
    expect(result.chunks[1]!.endPage).toBe(20);
    expect(result.chunks[2]!.startPage).toBe(21);
    expect(result.chunks[2]!.endPage).toBe(25);
  });

  it("splits exactly at page boundary", async () => {
    const pdf = await createTestPdf(30);
    const result = await splitPdfIfNeeded(pdf, 10);

    expect(result.wasSplit).toBe(true);
    expect(result.chunks).toHaveLength(3); // 10 + 10 + 10
    expect(result.chunks[2]!.endPage).toBe(30);
  });

  it("produces valid PDF bytes in each chunk", async () => {
    const pdf = await createTestPdf(25);
    const result = await splitPdfIfNeeded(pdf, 10);

    for (const chunk of result.chunks) {
      const chunkDoc = await PDFDocument.load(chunk.bytes);
      const expectedPages = chunk.endPage - chunk.startPage + 1;
      expect(chunkDoc.getPageCount()).toBe(expectedPages);
    }
  });

  it("respects custom pagesPerChunk", async () => {
    const pdf = await createTestPdf(25);
    const result = await splitPdfIfNeeded(pdf, 5);

    expect(result.wasSplit).toBe(true);
    expect(result.chunks).toHaveLength(5); // 5 + 5 + 5 + 5 + 5
  });

  it("does not split when exactly at threshold", async () => {
    const pdf = await createTestPdf(SPLIT_PAGE_THRESHOLD);
    const result = await splitPdfIfNeeded(pdf);

    expect(result.wasSplit).toBe(false);
    expect(result.totalPages).toBe(SPLIT_PAGE_THRESHOLD);
  });

  it("splits when one page over threshold", async () => {
    const pdf = await createTestPdf(SPLIT_PAGE_THRESHOLD + 1);
    const result = await splitPdfIfNeeded(pdf);

    expect(result.wasSplit).toBe(true);
  });
});

// ── getSmallerChunkSize ────────────────────────────────────────────

describe("getSmallerChunkSize", () => {
  it("halves the chunk size", () => {
    expect(getSmallerChunkSize(10)).toBe(5);
  });

  it("halves 6 to 3", () => {
    expect(getSmallerChunkSize(6)).toBe(3);
  });

  it("returns null when at minimum", () => {
    expect(getSmallerChunkSize(MIN_PAGES_PER_CHUNK)).toBeNull();
  });

  it("returns null when below minimum after halving", () => {
    expect(getSmallerChunkSize(4)).toBeNull();
  });

  it("returns 3 for 7 (floor(7/2) = 3)", () => {
    expect(getSmallerChunkSize(7)).toBe(3);
  });
});

// ── Constants ──────────────────────────────────────────────────────

describe("constants", () => {
  it("has correct size threshold", () => {
    expect(SPLIT_SIZE_THRESHOLD_BYTES).toBe(5 * 1024 * 1024);
  });

  it("has correct page threshold", () => {
    expect(SPLIT_PAGE_THRESHOLD).toBe(20);
  });

  it("has correct min chunk size", () => {
    expect(MIN_PAGES_PER_CHUNK).toBe(3);
  });
});
