import { jsPDF } from "jspdf";
import { loadImage } from "./imageFilters";
import { ScannedPage } from "../types";

/**
 * Generate a multi-page or single-page PDF from scanned pages
 */
export async function generatePdfFromPages(
  pages: ScannedPage[],
  title = "Scanned Document"
): Promise<Blob> {
  if (pages.length === 0) {
    throw new Error("No pages to export.");
  }

  // Load first image to determine initial orientation
  const firstUrl = pages[0].processedUrl || pages[0].previewUrl;
  const firstImg = await loadImage(firstUrl);
  const isLandscape = firstImg.width > firstImg.height;

  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "pt",
    format: "letter",
    compress: true,
  });

  pdf.setProperties({
    title,
    creator: "Maru Scanner",
  });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) {
      const pageUrl = pages[i].processedUrl || pages[i].previewUrl;
      const img = await loadImage(pageUrl);
      const pageLandscape = img.width > img.height;
      pdf.addPage("letter", pageLandscape ? "landscape" : "portrait");
    }

    const currentUrl = pages[i].processedUrl || pages[i].previewUrl;
    const img = await loadImage(currentUrl);

    // Get current PDF page dimensions in points
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Scale image maintaining aspect ratio within page margins
    const margin = 18; // 0.25 inch margin
    const availW = pageWidth - margin * 2;
    const availH = pageHeight - margin * 2;

    const scale = Math.min(availW / img.width, availH / img.height);
    const renderW = img.width * scale;
    const renderH = img.height * scale;

    const renderX = margin + (availW - renderW) / 2;
    const renderY = margin + (availH - renderH) / 2;

    pdf.addImage(currentUrl, "JPEG", renderX, renderY, renderW, renderH, undefined, "FAST");
  }

  return pdf.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
