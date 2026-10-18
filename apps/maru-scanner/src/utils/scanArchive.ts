import JSZip from "jszip";
import { ScannedPage, ScanManifest } from "../types";
import { dataUrlToBlob } from "./imageFilters";

/**
 * Build the proprietary .scan archive file (a ZIP package) containing:
 * - manifest.json (metadata, scanner options, geometry, timestamps)
 * - full_text.txt (aggregated OCR transcript)
 * - pages/raw/page-XX.png
 * - pages/processed/page-XX.jpg
 */
export async function createScanArchive(
  pages: ScannedPage[],
  scannerName: string,
  outFileName: string
): Promise<Blob> {
  const zip = new JSZip();

  const manifest: ScanManifest & { archiveName: string } = {
    format: "maru-scan",
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    archiveName: outFileName,
    scannerName,
    source: pages[0]?.source || "Flatbed",
    dpi: pages[0]?.dpi || 300,
    colorMode: pages[0]?.colorMode || "Color",
    precrop: pages[0]?.precrop || "Entire",
    pageCount: pages.length,
    featuresApplied: {
      removeBackground: pages.some((p) => !!p.processedUrl),
      ocr: pages.some((p) => !!p.ocrText),
      contrast: 15,
    },
    pages: pages.map((p, idx) => ({
      pageNumber: idx + 1,
      fileName: `pages/page_${String(idx + 1).padStart(2, "0")}.jpg`,
      width: p.width,
      height: p.height,
      dpi: p.dpi,
      ocrText: p.ocrText,
    })),
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // Build aggregate OCR transcript
  const allOcr = pages
    .map((p, idx) => `=== Page ${idx + 1} ===\n${p.ocrText || "(No OCR text)"}\n`)
    .join("\n");
  zip.file("full_text.txt", allOcr);

  // Store pages
  const pagesFolder = zip.folder("pages");
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const targetUrl = page.processedUrl || page.previewUrl;
    if (targetUrl.startsWith("data:")) {
      const blob = await dataUrlToBlob(targetUrl);
      pagesFolder?.file(`page_${String(i + 1).padStart(2, "0")}.jpg`, blob);
    }
  }

  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/**
 * Open and extract a .scan archive back into the app
 */
export async function readScanArchive(file: Blob): Promise<{
  manifest: ScanManifest | null;
  pages: ScannedPage[];
}> {
  const zip = await JSZip.loadAsync(file);

  let manifest: ScanManifest | null = null;
  const manifestFile = zip.file("manifest.json");
  if (manifestFile) {
    const text = await manifestFile.async("string");
    try {
      manifest = JSON.parse(text);
    } catch {}
  }

  const pages: ScannedPage[] = [];
  const pageEntries: Array<{ name: string; file: JSZip.JSZipObject }> = [];

  zip.forEach((relativePath, zipEntry) => {
    if (relativePath.startsWith("pages/") && !zipEntry.dir) {
      pageEntries.push({ name: relativePath, file: zipEntry });
    }
  });

  pageEntries.sort((a, b) => a.name.localeCompare(b.name));

  for (let i = 0; i < pageEntries.length; i++) {
    const entry = pageEntries[i];
    const blob = await entry.file.async("blob");
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    const pageMeta = manifest?.pages?.[i];

    pages.push({
      id: `imported-${Date.now()}-${i}`,
      pageNumber: i + 1,
      filePath: entry.name,
      fileName: entry.name.split("/").pop() || `page-${i + 1}.jpg`,
      previewUrl: dataUrl,
      thumbUrl: dataUrl,
      rawUrl: dataUrl,
      width: pageMeta?.width || 2480,
      height: pageMeta?.height || 3508,
      dpi: pageMeta?.dpi || 300,
      colorMode: manifest?.colorMode || "Color",
      precrop: manifest?.precrop || "Entire",
      source: manifest?.source || "Flatbed",
      rotation: 0,
      ocrText: pageMeta?.ocrText,
    });
  }

  return { manifest, pages };
}
