import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import {
  splitPptxIfNeeded,
  getSmallerPptxChunkSize,
  SPLIT_SLIDE_THRESHOLD,
  MIN_SLIDES_PER_CHUNK,
} from "../parsing/pptx-splitter.js";

/**
 * Helper: create a minimal PPTX with N slides for testing.
 * PPTX is a ZIP containing slide XML files + required metadata.
 */
function createTestPptx(slideCount: number): ArrayBuffer {
  const files: Record<string, Uint8Array> = {};

  // Required [Content_Types].xml
  let contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>`;

  for (let i = 1; i <= slideCount; i++) {
    contentTypes += `\n  <Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
  }
  contentTypes += "\n</Types>";
  files["[Content_Types].xml"] = strToU8(contentTypes);

  // _rels/.rels
  files["_rels/.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

  // ppt/presentation.xml
  let sldIdLst = "";
  for (let i = 1; i <= slideCount; i++) {
    sldIdLst += `<p:sldId id="${255 + i}" r:id="rId${i + 1}"/>`;
  }
  files["ppt/presentation.xml"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>${sldIdLst}</p:sldIdLst>
</p:presentation>`);

  // ppt/_rels/presentation.xml.rels
  let presRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;
  for (let i = 1; i <= slideCount; i++) {
    presRels += `\n  <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>`;
  }
  presRels += "\n</Relationships>";
  files["ppt/_rels/presentation.xml.rels"] = strToU8(presRels);

  // Slide files
  for (let i = 1; i <= slideCount; i++) {
    files[`ppt/slides/slide${i}.xml`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:r><a:t>Slide ${i} content</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`);
  }

  // A shared resource (theme)
  files["ppt/theme/theme1.xml"] = strToU8(`<?xml version="1.0"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Theme1"/>`);

  const zipped = zipSync(files);
  return zipped.buffer as ArrayBuffer;
}

// ── splitPptxIfNeeded ──────────────────────────────────────────────

describe("splitPptxIfNeeded", () => {
  it("does not split small PPTX (< threshold)", async () => {
    const pptx = createTestPptx(5);
    const result = await splitPptxIfNeeded(pptx);

    expect(result.wasSplit).toBe(false);
    expect(result.totalSlides).toBe(5);
    expect(result.chunks).toHaveLength(1);
  });

  it("splits PPTX exceeding slide threshold", async () => {
    const pptx = createTestPptx(20);
    const result = await splitPptxIfNeeded(pptx, 8);

    expect(result.wasSplit).toBe(true);
    expect(result.totalSlides).toBe(20);
    expect(result.chunks).toHaveLength(3); // 8 + 8 + 4
    expect(result.chunks[0]!.startSlide).toBe(1);
    expect(result.chunks[0]!.endSlide).toBe(8);
    expect(result.chunks[1]!.startSlide).toBe(9);
    expect(result.chunks[1]!.endSlide).toBe(16);
    expect(result.chunks[2]!.startSlide).toBe(17);
    expect(result.chunks[2]!.endSlide).toBe(20);
  });

  it("produces valid PPTX chunks (can be unzipped)", async () => {
    const { unzipSync } = await import("fflate");
    const pptx = createTestPptx(20);
    const result = await splitPptxIfNeeded(pptx, 8);

    for (const chunk of result.chunks) {
      const entries = unzipSync(new Uint8Array(chunk.bytes));
      expect(entries["ppt/presentation.xml"]).toBeDefined();
      expect(entries["[Content_Types].xml"]).toBeDefined();

      // Verify only chunk slides are present
      const expectedSlideCount = chunk.endSlide - chunk.startSlide + 1;
      const slideFiles = Object.keys(entries).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p));
      expect(slideFiles).toHaveLength(expectedSlideCount);
    }
  });

  it("chunk Content_Types only references chunk slides", async () => {
    const { unzipSync, strFromU8 } = await import("fflate");
    const pptx = createTestPptx(20);
    const result = await splitPptxIfNeeded(pptx, 8);

    // First chunk should have slides 1-8
    const chunk0 = unzipSync(new Uint8Array(result.chunks[0]!.bytes));
    const ct = strFromU8(chunk0["[Content_Types].xml"]!);
    expect(ct).toContain("slide1.xml");
    expect(ct).toContain("slide8.xml");
    expect(ct).not.toContain("slide9.xml");
    expect(ct).not.toContain("slide20.xml");
  });

  it("chunk presentation.xml only references chunk slides", async () => {
    const { unzipSync, strFromU8 } = await import("fflate");
    const pptx = createTestPptx(20);
    const result = await splitPptxIfNeeded(pptx, 8);

    // Last chunk should only have slides 17-20
    const lastChunk = unzipSync(new Uint8Array(result.chunks[2]!.bytes));
    const presRels = strFromU8(lastChunk["ppt/_rels/presentation.xml.rels"]!);
    expect(presRels).toContain("slide17.xml");
    expect(presRels).toContain("slide20.xml");
    expect(presRels).not.toContain("slide1.xml");
    expect(presRels).not.toContain("slide16.xml");
  });

  it("preserves shared resources (theme) in all chunks", async () => {
    const { unzipSync } = await import("fflate");
    const pptx = createTestPptx(20);
    const result = await splitPptxIfNeeded(pptx, 8);

    for (const chunk of result.chunks) {
      const entries = unzipSync(new Uint8Array(chunk.bytes));
      expect(entries["ppt/theme/theme1.xml"]).toBeDefined();
    }
  });

  it("does not split when exactly at threshold", async () => {
    const pptx = createTestPptx(SPLIT_SLIDE_THRESHOLD);
    const result = await splitPptxIfNeeded(pptx);

    expect(result.wasSplit).toBe(false);
  });

  it("splits when one slide over threshold", async () => {
    const pptx = createTestPptx(SPLIT_SLIDE_THRESHOLD + 1);
    const result = await splitPptxIfNeeded(pptx);

    expect(result.wasSplit).toBe(true);
  });

  it("throws on invalid ZIP data", async () => {
    const garbage = new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer as ArrayBuffer;
    await expect(splitPptxIfNeeded(garbage)).rejects.toThrow("Failed to unzip PPTX file");
  });
});

// ── getSmallerPptxChunkSize ────────────────────────────────────────

describe("getSmallerPptxChunkSize", () => {
  it("halves the chunk size", () => {
    expect(getSmallerPptxChunkSize(8)).toBe(4);
  });

  it("returns 3 for 6", () => {
    expect(getSmallerPptxChunkSize(6)).toBe(3);
  });

  it("returns null when at minimum", () => {
    expect(getSmallerPptxChunkSize(MIN_SLIDES_PER_CHUNK)).toBeNull();
  });

  it("returns null when below minimum after halving", () => {
    expect(getSmallerPptxChunkSize(4)).toBeNull();
  });
});
