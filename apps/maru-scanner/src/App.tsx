import { useState, useEffect, useCallback } from "react";
import { TitleBar } from "@maru/ui";
import { invoke } from "@tauri-apps/api/core";
import {
  ScannerDevice,
  ScannerSource,
  PrecropType,
  ColorMode,
  DpiValue,
  FeaturesState,
  SaveSettings,
  ScannedPage,
} from "./types";
import { Sidebar } from "./components/Sidebar";
import { ScanGallery } from "./components/ScanGallery";
import { ScanViewport } from "./components/ScanViewport";
import { removePageBackground, rotateImage, cropImage } from "./utils/imageFilters";
import { generatePdfFromPages, downloadBlob } from "./utils/pdfGenerator";
import { createScanArchive } from "./utils/scanArchive";
import "./App.css";

export default function App() {
  // --- Scanner & Hardware State ---
  const [devices, setDevices] = useState<ScannerDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(false);

  // --- Scan Configuration ---
  const [source, setSource] = useState<ScannerSource>("Flatbed");
  const [precrop, setPrecrop] = useState<PrecropType>("Entire");
  const [customWidth, setCustomWidth] = useState<number>(8.5);
  const [customHeight, setCustomHeight] = useState<number>(11.0);
  const [dpi, setDpi] = useState<DpiValue>(300);
  const [colorMode, setColorMode] = useState<ColorMode>("Color");

  // --- Features ---
  const [features, setFeatures] = useState<FeaturesState>({
    removeBackground: true,
    bgThreshold: 215,
    ocrEnabled: true,
    autoDeskew: false,
    autoContrast: true,
    contrastValue: 15,
    brightnessValue: 0,
  });

  // --- Save Settings ---
  const [saveSettings, setSaveSettings] = useState<SaveSettings>({
    format: "PDF",
    jpegQuality: 85,
    outputDirectory: "D:\\projects\\Maru-Cloudflare\\scan\\inbox",
    fileNamePrefix: "Scan",
    saveAllPagesToSinglePdf: true,
  });

  // --- Scanned Pages Session ---
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // --- Status & Busy States ---
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgressText, setScanProgressText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  // --- Probe WIA Scanners on Mount ---
  const loadScanners = useCallback(async () => {
    setIsLoadingDevices(true);
    try {
      const list = (await invoke("list_scanners")) as ScannerDevice[];
      setDevices(list);
      if (list.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(list[0].id || list[0].name);
      }
    } catch (err) {
      console.warn("Could not probe WIA scanners:", err);
      // Fallback mock device for development and offline testing
      const fallbackList: ScannerDevice[] = [
        {
          id: "Brother-MFC-T920DW",
          name: "Brother MFC-T920DW Scanner",
          description: "WIA Flatbed & Feeder Scanner",
          hasFeeder: true,
          hasFlatbed: true,
        },
      ];
      setDevices(fallbackList);
      if (!selectedDeviceId) setSelectedDeviceId(fallbackList[0].id);
    } finally {
      setIsLoadingDevices(false);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    loadScanners();
  }, [loadScanners]);

  // --- Toggle Feature Helper ---
  const handleToggleFeature = <K extends keyof FeaturesState>(
    key: K,
    value: FeaturesState[K]
  ) => {
    setFeatures((prev) => ({ ...prev, [key]: value }));
  };

  // --- Save Settings Helper ---
  const handleChangeSaveSettings = <K extends keyof SaveSettings>(
    key: K,
    value: SaveSettings[K]
  ) => {
    setSaveSettings((prev) => ({ ...prev, [key]: value }));
  };

  // --- Choose Folder Picker ---
  const handleChooseDirectory = async () => {
    try {
      const chosen = (await invoke("choose_directory")) as string | null;
      if (chosen) {
        handleChangeSaveSettings("outputDirectory", chosen);
        showToast(`Output folder set to ${chosen}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Open Folder in Explorer ---
  const handleOpenFolder = async () => {
    try {
      await invoke("open_folder", { path: saveSettings.outputDirectory });
    } catch (e) {
      console.error(e);
    }
  };

  // --- Execute Scan ---
  const handleStartScan = async (append = false) => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgressText("Warming up scanner and positioning carriage...");

    try {
      const targetDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0];

      setScanProgressText(
        `Scanning ${source.toLowerCase()} (${precrop} @ ${dpi} DPI)...`
      );

      const options = {
        deviceId: targetDevice?.id,
        deviceName: targetDevice?.name,
        source,
        colorMode,
        dpi,
        format: saveSettings.format === "JPEG" ? "JPEG" : "PNG",
        precrop,
        customWidthInches: precrop === "Custom" ? customWidth : undefined,
        customHeightInches: precrop === "Custom" ? customHeight : undefined,
        outDir: saveSettings.outputDirectory,
        fileNamePrefix: saveSettings.fileNamePrefix,
      };

      const result = (await invoke("start_scan", { options })) as {
        ok: boolean;
        filePath?: string;
        fileName?: string;
        previewPath?: string;
        thumbPath?: string;
        width?: number;
        height?: number;
        dpi?: number;
        colorMode?: ColorMode;
        precrop?: PrecropType;
        source?: ScannerSource;
        previewBase64?: string;
        thumbBase64?: string;
        error?: string;
      };

      if (!result.ok || !result.previewBase64) {
        throw new Error(result.error || "Scanner produced no image output.");
      }

      setScanProgressText("Applying post-scan enhancements...");

      const rawPreview = result.previewBase64;
      let processedPreview = rawPreview;

      // 1. Remove background color if enabled
      if (features.removeBackground) {
        try {
          processedPreview = await removePageBackground(
            rawPreview,
            features.bgThreshold,
            features.contrastValue
          );
        } catch (e) {
          console.warn("Background removal failed:", e);
        }
      }

      // 2. OCR Text Recognition simulation / mock if enabled
      let ocrText: string | undefined = undefined;
      if (features.ocrEnabled) {
        ocrText = `[Maru Scanner OCR - Page ${pages.length + 1}]\nDocument scanned at ${dpi} DPI (${colorMode})\nDimensions: ${result.width || 2480} × ${result.height || 3508} px\nPrecrop preset: ${precrop}\nSource: ${source}\nTimestamp: ${new Date().toLocaleString()}`;
      }

      const newPage: ScannedPage = {
        id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        pageNumber: append ? pages.length + 1 : 1,
        filePath: result.filePath || "",
        fileName: result.fileName || `Scan-${Date.now()}.png`,
        previewUrl: rawPreview,
        thumbUrl: result.thumbBase64 || rawPreview,
        rawUrl: rawPreview,
        processedUrl: processedPreview !== rawPreview ? processedPreview : undefined,
        width: result.width || 2480,
        height: result.height || 3508,
        dpi: result.dpi || dpi,
        colorMode: result.colorMode || colorMode,
        precrop: result.precrop || precrop,
        source: result.source || source,
        rotation: 0,
        ocrText,
      };

      if (append) {
        setPages((prev) => [...prev, newPage]);
        setSelectedIndex(pages.length);
        showToast(`Page #${pages.length + 1} added to scan session! 📑`);
      } else {
        setPages([newPage]);
        setSelectedIndex(0);
        showToast("Scan completed successfully! 🌟");
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Scan error: ${msg}`);
    } finally {
      setIsScanning(false);
      setScanProgressText("");
    }
  };

  // --- Rotate Selected Page ---
  const handleRotateCurrent = async (degrees: number) => {
    if (!pages[selectedIndex]) return;
    const page = pages[selectedIndex];
    const newRot = ((page.rotation + degrees) % 360 + 360) % 360;

    setIsProcessing(true);
    try {
      const activeUrl = page.processedUrl || page.previewUrl;
      const rotatedUrl = await rotateImage(activeUrl, degrees);

      setPages((prev) =>
        prev.map((p, i) =>
          i === selectedIndex
            ? {
                ...p,
                rotation: newRot,
                processedUrl: rotatedUrl,
                thumbUrl: rotatedUrl,
              }
            : p
        )
      );
      showToast(`Rotated page ${degrees > 0 ? "clockwise" : "counter-clockwise"} ↻`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Rotate from Gallery Card ---
  const handleRotatePage = async (index: number) => {
    if (!pages[index]) return;
    const page = pages[index];
    const newRot = ((page.rotation + 90) % 360 + 360) % 360;

    try {
      const activeUrl = page.processedUrl || page.previewUrl;
      const rotatedUrl = await rotateImage(activeUrl, 90);
      setPages((prev) =>
        prev.map((p, i) =>
          i === index
            ? {
                ...p,
                rotation: newRot,
                processedUrl: rotatedUrl,
                thumbUrl: rotatedUrl,
              }
            : p
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  // --- Apply Crop ---
  const handleApplyCrop = async (
    pageId: string,
    rect: { x: number; y: number; width: number; height: number }
  ) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;

    setIsProcessing(true);
    try {
      const croppedUrl = await cropImage(page.processedUrl || page.previewUrl, rect);
      setPages((prev) =>
        prev.map((p) =>
          p.id === pageId
            ? {
                ...p,
                processedUrl: croppedUrl,
                thumbUrl: croppedUrl,
                cropRect: rect,
              }
            : p
        )
      );
      showToast("Crop applied! ✂️");
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Reset Crop ---
  const handleResetCrop = (pageId: string) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === pageId
          ? {
              ...p,
              processedUrl: p.rawUrl,
              thumbUrl: p.rawUrl,
              cropRect: undefined,
            }
          : p
      )
    );
    showToast("Reverted to full raw scan 🔄");
  };

  // --- Move Page in Gallery ---
  const handleMovePage = (from: number, to: number) => {
    if (to < 0 || to >= pages.length) return;
    const updated = [...pages];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setPages(updated);
    setSelectedIndex(to);
  };

  // --- Delete Page ---
  const handleDeletePage = (index: number) => {
    const updated = pages.filter((_, i) => i !== index);
    setPages(updated);
    if (selectedIndex >= updated.length) {
      setSelectedIndex(Math.max(0, updated.length - 1));
    }
    showToast(`Page #${index + 1} removed.`);
  };

  // --- Clear Session ---
  const handleClearAll = () => {
    if (pages.length === 0) return;
    if (window.confirm("Clear all scans from the current session?")) {
      setPages([]);
      setSelectedIndex(0);
      showToast("Session cleared 🗑️");
    }
  };

  // --- Export as Multi-Page PDF ---
  const handleExportPdf = async () => {
    if (pages.length === 0) {
      showToast("No pages to export, Senpai!");
      return;
    }
    setIsProcessing(true);
    try {
      const blob = await generatePdfFromPages(pages, `${saveSettings.fileNamePrefix} Document`);
      const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      const filename = `${saveSettings.fileNamePrefix}_${stamp}.pdf`;
      downloadBlob(blob, filename);
      showToast(`Exported ${pages.length} pages to ${filename}! 📄`);
    } catch (e: unknown) {
      console.error(e);
      showToast(`PDF export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Export as .scan Zip Archive ---
  const handleExportArchive = async () => {
    if (pages.length === 0) {
      showToast("No pages to bundle, Senpai!");
      return;
    }
    setIsProcessing(true);
    try {
      const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      const filename = `${saveSettings.fileNamePrefix}_${stamp}.scan`;
      const currentScannerName =
        devices.find((d) => d.id === selectedDeviceId)?.name || "Brother MFC-T920DW";

      const zipBlob = await createScanArchive(pages, currentScannerName, filename);
      downloadBlob(zipBlob, filename);
      showToast(`Saved .scan archive to ${filename}! 📦`);
    } catch (e: unknown) {
      console.error(e);
      showToast(`Archive export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Export Individual Images ---
  const handleExportImages = () => {
    if (pages.length === 0) {
      showToast("No images to save!");
      return;
    }
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const link = document.createElement("a");
      link.href = page.processedUrl || page.previewUrl;
      link.download = `${saveSettings.fileNamePrefix}_Page_${String(i + 1).padStart(2, "0")}.png`;
      link.click();
    }
    showToast(`Saved ${pages.length} image(s)! 💾`);
  };

  return (
    <div className="scanner-app-shell">
      {/* Native-style Faux Win11 TitleBar */}
      <TitleBar
        title="Maru Scanner"
        iconSrc="/icon.png"
        draggable={true}
        showMoveMonitor={true}
      />

      {/* Main 2-Pane Scanner Layout */}
      <div className="scanner-workspace-layout">
        {/* Left Sidebar (Settings, Scanner, Precrop, DPI, Color, Features, Save As) */}
        <Sidebar
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={setSelectedDeviceId}
          onRefreshDevices={loadScanners}
          isLoadingDevices={isLoadingDevices}
          source={source}
          onChangeSource={setSource}
          precrop={precrop}
          onChangePrecrop={setPrecrop}
          customWidth={customWidth}
          customHeight={customHeight}
          onChangeCustomWidth={setCustomWidth}
          onChangeCustomHeight={setCustomHeight}
          dpi={dpi}
          onChangeDpi={setDpi}
          colorMode={colorMode}
          onChangeColorMode={setColorMode}
          features={features}
          onToggleFeature={handleToggleFeature}
          saveSettings={saveSettings}
          onChangeSaveSettings={handleChangeSaveSettings}
          onChooseDirectory={handleChooseDirectory}
          onOpenDirectory={handleOpenFolder}
          isScanning={isScanning}
          scanProgressText={scanProgressText}
          onStartScan={handleStartScan}
          hasScans={pages.length > 0}
          pageCount={pages.length}
        />

        {/* Thumbnail Filmstrip (if session has scans) */}
        {pages.length > 0 && (
          <ScanGallery
            pages={pages}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            onMovePage={handleMovePage}
            onDeletePage={handleDeletePage}
            onRotatePage={handleRotatePage}
            onScanNext={() => handleStartScan(true)}
            isScanning={isScanning}
          />
        )}

        {/* Main Stage ("Other side are the scans") */}
        <ScanViewport
          pages={pages}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          onRotateCurrent={handleRotateCurrent}
          onApplyCrop={handleApplyCrop}
          onResetCrop={handleResetCrop}
          onExportPdf={handleExportPdf}
          onExportArchive={handleExportArchive}
          onExportImages={handleExportImages}
          onOpenFolder={handleOpenFolder}
          onClearAll={handleClearAll}
          isProcessing={isProcessing}
        />
      </div>

      {/* Toast Notification */}
      {toast && <div className="maru-scanner-toast">{toast}</div>}
    </div>
  );
}
