export type ScannerSource = "Flatbed" | "Feeder";

export type PrecropType = "Entire" | "Folio" | "Letter" | "A4" | "HalfLetter" | "Custom";

export type ColorMode = "Color" | "Gray" | "Text";

export type DpiValue = 100 | 150 | 200 | 300 | 600;

export type SaveFormat = "PNG" | "JPEG" | "PDF" | "SCAN";

export interface ScannerDevice {
  id: string | null;
  name: string;
  description: string;
  hasFeeder: boolean;
  hasFlatbed: boolean;
}

export interface FeaturesState {
  removeBackground: boolean;
  bgThreshold: number; // 180 - 250 (default 215)
  ocrEnabled: boolean;
  autoDeskew: boolean;
  autoContrast: boolean;
  contrastValue: number; // -50 to 50
  brightnessValue: number; // -50 to 50
}

export interface SaveSettings {
  format: SaveFormat;
  jpegQuality: number; // 0 - 100
  outputDirectory: string;
  fileNamePrefix: string;
  saveAllPagesToSinglePdf: boolean;
}

export interface ScannedPage {
  id: string;
  pageNumber: number;
  filePath: string;
  fileName: string;
  previewUrl: string; // Base64 or local object URL
  thumbUrl: string;
  rawUrl: string;
  processedUrl?: string;
  width: number;
  height: number;
  dpi: number;
  colorMode: ColorMode;
  precrop: PrecropType;
  source: ScannerSource;
  rotation: number; // 0, 90, 180, 270
  ocrText?: string;
  ocrRunning?: boolean;
  cropRect?: { x: number; y: number; width: number; height: number };
}

export interface ScanManifest {
  format: "maru-scan";
  version: "1.0.0";
  createdAt: string;
  scannerName: string;
  source: ScannerSource;
  dpi: number;
  colorMode: ColorMode;
  precrop: PrecropType;
  pageCount: number;
  featuresApplied: {
    removeBackground: boolean;
    ocr: boolean;
    contrast: number;
  };
  pages: Array<{
    pageNumber: number;
    fileName: string;
    width: number;
    height: number;
    dpi: number;
    ocrText?: string;
  }>;
}
