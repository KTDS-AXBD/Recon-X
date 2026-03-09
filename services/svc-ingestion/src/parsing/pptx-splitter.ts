import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import { createLogger } from "@ai-foundry/utils";

const logger = createLogger("svc-ingestion:pptx-splitter");

/** Split if slide count exceeds this */
const SPLIT_SLIDE_THRESHOLD = 15;
/** Default slides per chunk */
const DEFAULT_SLIDES_PER_CHUNK = 8;
/** Minimum chunk size for retry */
const MIN_SLIDES_PER_CHUNK = 3;
/** Split if file size exceeds 5MB */
const SPLIT_SIZE_THRESHOLD_BYTES = 5 * 1024 * 1024;

export type PptxSplitResult = {
  wasSplit: boolean;
  totalSlides: number;
  chunks: PptxChunk[];
};

export type PptxChunk = {
  index: number;
  startSlide: number;
  endSlide: number;
  bytes: ArrayBuffer;
};

const SLIDE_FILE_RE = /^ppt\/slides\/slide(\d+)\.xml$/;
const SLIDE_RELS_RE = /^ppt\/slides\/_rels\/slide(\d+)\.xml\.rels$/;
const NOTES_FILE_RE = /^ppt\/notesSlides\/notesSlide(\d+)\.xml$/;
const NOTES_RELS_RE = /^ppt\/notesSlides\/_rels\/notesSlide(\d+)\.xml\.rels$/;

/**
 * Detect whether a PPTX needs splitting and return split chunks if so.
 */
export async function splitPptxIfNeeded(
  fileBytes: ArrayBuffer,
  slidesPerChunk: number = DEFAULT_SLIDES_PER_CHUNK,
): Promise<PptxSplitResult> {
  const u8 = new Uint8Array(fileBytes);
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(u8);
  } catch {
    throw new Error("Failed to unzip PPTX file");
  }

  // Find slide files and their numbers
  const slideNumbers: number[] = [];
  for (const path of Object.keys(entries)) {
    const match = SLIDE_FILE_RE.exec(path);
    if (match?.[1]) {
      slideNumbers.push(parseInt(match[1], 10));
    }
  }
  slideNumbers.sort((a, b) => a - b);
  const totalSlides = slideNumbers.length;

  const needsSplit =
    fileBytes.byteLength > SPLIT_SIZE_THRESHOLD_BYTES || totalSlides > SPLIT_SLIDE_THRESHOLD;

  if (!needsSplit) {
    return {
      wasSplit: false,
      totalSlides,
      chunks: [{ index: 0, startSlide: 1, endSlide: totalSlides, bytes: fileBytes }],
    };
  }

  logger.info("Splitting large PPTX", {
    sizeMB: (fileBytes.byteLength / (1024 * 1024)).toFixed(1),
    totalSlides,
    slidesPerChunk,
  });

  // Build relationship map: rId → slide target from presentation.xml.rels
  const presRelsPath = "ppt/_rels/presentation.xml.rels";
  const presRelsData = entries[presRelsPath];
  const presRelsXml = presRelsData ? strFromU8(presRelsData) : "";

  const chunks: PptxChunk[] = [];

  for (let i = 0; i < slideNumbers.length; i += slidesPerChunk) {
    const chunkSlides = slideNumbers.slice(i, i + slidesPerChunk);
    const chunkSlideSet = new Set(chunkSlides);
    const startSlide = chunkSlides[0]!;
    const endSlide = chunkSlides[chunkSlides.length - 1]!;

    const chunkEntries: Record<string, Uint8Array> = {};

    // Include all files, filtering out slides not in this chunk
    for (const [path, data] of Object.entries(entries)) {
      const slideMatch = SLIDE_FILE_RE.exec(path);
      if (slideMatch?.[1]) {
        if (chunkSlideSet.has(parseInt(slideMatch[1], 10))) {
          chunkEntries[path] = data;
        }
        continue;
      }

      const slideRelsMatch = SLIDE_RELS_RE.exec(path);
      if (slideRelsMatch?.[1]) {
        if (chunkSlideSet.has(parseInt(slideRelsMatch[1], 10))) {
          chunkEntries[path] = data;
        }
        continue;
      }

      const notesMatch = NOTES_FILE_RE.exec(path);
      if (notesMatch?.[1]) {
        if (chunkSlideSet.has(parseInt(notesMatch[1], 10))) {
          chunkEntries[path] = data;
        }
        continue;
      }

      const notesRelsMatch = NOTES_RELS_RE.exec(path);
      if (notesRelsMatch?.[1]) {
        if (chunkSlideSet.has(parseInt(notesRelsMatch[1], 10))) {
          chunkEntries[path] = data;
        }
        continue;
      }

      // Non-slide files: keep as-is (masters, layouts, themes, media, etc.)
      chunkEntries[path] = data;
    }

    // Update [Content_Types].xml — remove entries for excluded slides
    const contentTypesData = entries["[Content_Types].xml"];
    if (contentTypesData) {
      const xml = strFromU8(contentTypesData);
      const filtered = filterContentTypes(xml, chunkSlideSet, slideNumbers);
      chunkEntries["[Content_Types].xml"] = strToU8(filtered);
    }

    // Update ppt/presentation.xml — remove sldIdLst entries for excluded slides
    const presData = entries["ppt/presentation.xml"];
    if (presData) {
      const xml = strFromU8(presData);
      const filtered = filterPresentation(xml, presRelsXml, chunkSlideSet);
      chunkEntries["ppt/presentation.xml"] = strToU8(filtered);
    }

    // Update ppt/_rels/presentation.xml.rels — remove rels for excluded slides
    if (presRelsData) {
      const filtered = filterPresentationRels(presRelsXml, chunkSlideSet);
      chunkEntries[presRelsPath] = strToU8(filtered);
    }

    const zipped = zipSync(chunkEntries);
    chunks.push({
      index: chunks.length,
      startSlide,
      endSlide,
      bytes: zipped.buffer as ArrayBuffer,
    });
  }

  logger.info("PPTX split complete", { totalSlides, chunkCount: chunks.length, slidesPerChunk });

  return { wasSplit: true, totalSlides, chunks };
}

/**
 * Filter [Content_Types].xml to only include slides in the chunk.
 */
function filterContentTypes(xml: string, keepSlides: Set<number>, allSlides: number[]): string {
  const excludeSlides = allSlides.filter((n) => !keepSlides.has(n));
  let result = xml;
  for (const n of excludeSlides) {
    // Remove Override entries for excluded slides and their notes
    result = result.replace(
      new RegExp(`<Override[^>]*PartName="/ppt/slides/slide${n}\\.xml"[^>]*/?>`, "g"),
      "",
    );
    result = result.replace(
      new RegExp(`<Override[^>]*PartName="/ppt/notesSlides/notesSlide${n}\\.xml"[^>]*/?>`, "g"),
      "",
    );
  }
  return result;
}

/**
 * Filter ppt/presentation.xml to only reference slides in the chunk.
 * Removes <p:sldId> entries whose r:id points to excluded slides.
 */
function filterPresentation(xml: string, relsXml: string, keepSlides: Set<number>): string {
  // Build rId → slideNumber map from rels
  const rIdToSlide = new Map<string, number>();
  const relRe = /<Relationship[^>]*Id="(rId\d+)"[^>]*Target="slides\/slide(\d+)\.xml"[^>]*\/?>/g;
  let match;
  while ((match = relRe.exec(relsXml)) !== null) {
    if (match[1] && match[2]) {
      rIdToSlide.set(match[1], parseInt(match[2], 10));
    }
  }

  // Remove sldId entries for excluded slides
  let result = xml;
  for (const [rId, slideNum] of rIdToSlide) {
    if (!keepSlides.has(slideNum)) {
      result = result.replace(
        new RegExp(`<p:sldId[^>]*r:id="${rId}"[^>]*/?>`, "g"),
        "",
      );
    }
  }

  return result;
}

/**
 * Filter ppt/_rels/presentation.xml.rels to only include relationships for chunk slides.
 */
function filterPresentationRels(xml: string, keepSlides: Set<number>): string {
  return xml.replace(
    /<Relationship[^>]*Target="slides\/slide(\d+)\.xml"[^>]*\/?>/g,
    (fullMatch, numStr: string) => {
      const slideNum = parseInt(numStr, 10);
      return keepSlides.has(slideNum) ? fullMatch : "";
    },
  );
}

/**
 * Get a smaller slides-per-chunk value for retry.
 */
export function getSmallerPptxChunkSize(currentSize: number): number | null {
  const smaller = Math.floor(currentSize / 2);
  if (smaller < MIN_SLIDES_PER_CHUNK) return null;
  return smaller;
}

export { SPLIT_SLIDE_THRESHOLD, SPLIT_SIZE_THRESHOLD_BYTES, DEFAULT_SLIDES_PER_CHUNK, MIN_SLIDES_PER_CHUNK };
