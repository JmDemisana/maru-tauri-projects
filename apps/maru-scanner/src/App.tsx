import { useState, useEffect, useCallback } from "react";
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
import { NamiAssistantModal } from "./components/NamiAssistantModal";
import { removePageBackground, rotateImage, cropImage, getPrecropRectPx } from "./utils/imageFilters";
import { generatePdfFromPages, downloadBlob } from "./utils/pdfGenerator";
import { createScanArchive, readScanArchive } from "./utils/scanArchive";
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

  // --- Assistant & Dialog States ---
  const [showNamiModal, setShowNamiModal] = useState<boolean>(false);

  // --- Status & Busy States ---
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgressText, setScanProgressText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  // --- Load .scan archive from disk ---
  const loadScanFile = useCallback(
    async (archivePath: string) => {
      setIsProcessing(true);
      try {
        const res = (await invoke("load_scan_archive", { archivePath })) as {
          ok: boolean;
          manifestRaw?: string;
          pages: Array<{
            fileName: string;
            pageNumber: number;
            width: number;
            height: number;
            dpi: number;
            previewBase64: string;
            thumbBase64: string;
            ocrText?: string;
          }>;
          error?: string;
        };

        if (!res.ok || !res.pages || res.pages.length === 0) {
          throw new Error(res.error || "No pages found in archive.");
        }

        let parsedManifest: Record<string, unknown> | null = null;
        if (res.manifestRaw) {
          try {
            parsedManifest = JSON.parse(res.manifestRaw);
          } catch {}
        }

        const importedPages: ScannedPage[] = res.pages.map((p, idx) => ({
          id: `scan-imported-${Date.now()}-${idx}`,
          pageNumber: p.pageNumber || idx + 1,
          filePath: archivePath,
          fileName: p.fileName || `page-${idx + 1}.png`,
          previewUrl: p.previewBase64,
          thumbUrl: p.thumbBase64 || p.previewBase64,
          rawUrl: p.previewBase64,
          width: p.width || 2480,
          height: p.height || 3508,
          dpi: p.dpi || 300,
          colorMode: (parsedManifest?.colorMode as ColorMode) || "Color",
          precrop: (parsedManifest?.precrop as PrecropType) || "Entire",
          source: (parsedManifest?.source as ScannerSource) || "Flatbed",
          rotation: 0,
          ocrText: p.ocrText,
        }));

        setPages(importedPages);
        setSelectedIndex(0);
        const baseName = archivePath.split(/[\\/]/).pop() || "archive.scan";
        showToast(`Loaded ${importedPages.length} page(s) from ${baseName}! 📦`);
      } catch (err: unknown) {
        console.error(err);
        showToast(
          `Could not open .scan file: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [showToast]
  );

  const handleOpenScanFile = useCallback(async () => {
    try {
      const chosen = (await invoke("choose_scan_file")) as string | null;
      if (chosen) {
        await loadScanFile(chosen);
      }
    } catch (e) {
      console.error(e);
    }
  }, [loadScanFile]);

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

    // 1. Silently register Windows registry file association for .scan
    invoke("register_scan_association").catch(() => {});

    // 2. Check if a .scan file was passed via CLI (double clicked in Explorer)
    invoke("get_cli_open_file")
      .then((cliFile) => {
        if (cliFile && typeof cliFile === "string") {
          loadScanFile(cliFile);
        }
      })
      .catch(() => {});
  }, [loadScanners, loadScanFile]);

  // --- Drag and Drop .scan files onto window ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith(".scan")) {
        try {
          const { pages: importedPages } = await readScanArchive(file);
          if (importedPages.length > 0) {
            setPages(importedPages);
            setSelectedIndex(0);
            showToast(`Imported ${importedPages.length} page(s) from ${file.name}! 📦`);
          }
        } catch (err) {
          console.error(err);
          showToast("Failed to parse dropped .scan file.");
        }
      }
    }
  };

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
  const handleStartScan = async (append = false): Promise<ScannedPage | null> => {
    if (isScanning) return null;
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
        cropRect?: { x: number; y: number; width: number; height: number };
        fullFlatbedPreserved?: boolean;
        previewBase64?: string;
        thumbBase64?: string;
        pages?: Array<{
          pageNumber?: number;
          filePath: string;
          fileName: string;
          width: number;
          height: number;
          dpi: number;
          colorMode: ColorMode;
          precrop: PrecropType;
          source: ScannerSource;
          cropRect?: { x: number; y: number; width: number; height: number };
          fullFlatbedPreserved?: boolean;
          previewBase64?: string;
          thumbBase64?: string;
        }>;
        error?: string;
      };

      if (!result.ok) {
        throw new Error(result.error || "Scanner produced no image output.");
      }

      setScanProgressText("Processing scanned pages...");

      const batchItems = result.pages && result.pages.length > 0
        ? result.pages
        : result.previewBase64
        ? [{
            pageNumber: 1,
            filePath: result.filePath || "",
            fileName: result.fileName || `Scan-${Date.now()}.png`,
            width: result.width || 2480,
            height: result.height || 3508,
            dpi: result.dpi || dpi,
            colorMode: result.colorMode || colorMode,
            precrop: result.precrop || precrop,
            source: result.source || source,
            cropRect: result.cropRect,
            fullFlatbedPreserved: result.fullFlatbedPreserved,
            previewBase64: result.previewBase64,
            thumbBase64: result.thumbBase64,
          }]
        : [];

      if (batchItems.length === 0) {
        throw new Error("No image data returned from scanner.");
      }

      const startIndex = append ? pages.length : 0;
      const createdPages: ScannedPage[] = [];

      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        const rawPreview = item.previewBase64 || "";
        let processedPreview = rawPreview;

        // If Flatbed scan has a precrop applied, crop non-destructively for display
        if (item.source === "Flatbed" && item.cropRect && item.cropRect.width > 0) {
          try {
            processedPreview = await cropImage(rawPreview, item.cropRect);
          } catch (e) {
            console.warn("Initial precrop application failed:", e);
          }
        }

        // Whiten background if feature is enabled
        if (features.removeBackground && processedPreview) {
          try {
            processedPreview = await removePageBackground(
              processedPreview,
              features.bgThreshold,
              features.contrastValue
            );
          } catch (e) {
            console.warn("Background removal failed:", e);
          }
        }

        let ocrText: string | undefined = undefined;
        if (features.ocrEnabled) {
          ocrText = `[Maru Scanner OCR - Page ${startIndex + i + 1}]\nDocument scanned at ${item.dpi} DPI (${item.colorMode})\nDimensions: ${item.width} × ${item.height} px\nPrecrop preset: ${item.precrop}\nSource: ${item.source}\nTimestamp: ${new Date().toLocaleString()}`;
        }

        createdPages.push({
          id: `page-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          pageNumber: startIndex + i + 1,
          filePath: item.filePath,
          fileName: item.fileName,
          previewUrl: rawPreview,
          thumbUrl: item.thumbBase64 || rawPreview,
          rawUrl: rawPreview,
          processedUrl: processedPreview !== rawPreview ? processedPreview : undefined,
          width: item.width,
          height: item.height,
          dpi: item.dpi,
          colorMode: item.colorMode,
          precrop: item.precrop,
          source: item.source,
          rotation: 0,
          cropRect: item.cropRect,
          fullFlatbedPreserved: item.fullFlatbedPreserved,
          ocrText,
        });
      }

      if (append) {
        setPages((prev) => [...prev, ...createdPages]);
        setSelectedIndex(pages.length);
        showToast(
          createdPages.length > 1
            ? `Feeder scanned ${createdPages.length} pages in batch! 📑`
            : `Page #${pages.length + 1} added to scan session! 📑`
        );
      } else {
        setPages(createdPages);
        setSelectedIndex(0);
        showToast(
          createdPages.length > 1
            ? `ADF batch scan completed: ${createdPages.length} pages loaded! 🌟`
            : source === "Flatbed" && precrop !== "Entire"
            ? "Scan completed! (Entire flatbed preserved for easy recovery) ✨"
            : "Scan completed successfully! 🌟"
        );
      }
      return createdPages[0];
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Scan error: ${msg}`);
      return null;
    } finally {
      setIsScanning(false);
      setScanProgressText("");
    }
  };

  // --- Scan and directly ask Nami ---
  const handleScanAndAskNami = async () => {
    const scanned = await handleStartScan(false);
    if (scanned) {
      setShowNamiModal(true);
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
              precrop: "Entire",
              processedUrl: undefined,
              thumbUrl: p.rawUrl,
              cropRect: undefined,
            }
          : p
      )
    );
    showToast("Recovered full flatbed scan (entire glass restored) 🪟");
  };

  // --- Switch Page Precrop (Non-destructive from raw flatbed glass) ---
  const handleSwitchPagePrecrop = async (pageId: string, targetPrecrop: PrecropType) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;

    if (page.source !== "Flatbed") {
      showToast("Precrop adjustment from raw glass is only available on Flatbed scans.");
      return;
    }

    setIsProcessing(true);
    try {
      if (targetPrecrop === "Entire") {
        setPages((prev) =>
          prev.map((p) =>
            p.id === pageId
              ? {
                  ...p,
                  precrop: "Entire",
                  cropRect: undefined,
                  processedUrl: undefined,
                  thumbUrl: p.rawUrl,
                }
              : p
          )
        );
        showToast("Restored full flatbed scan glass! 🪟");
      } else {
        const rect = getPrecropRectPx(
          targetPrecrop,
          page.dpi,
          page.width,
          page.height,
          customWidth,
          customHeight
        );
        if (!rect) return;

        let cropped = await cropImage(page.rawUrl, rect);
        if (features.removeBackground) {
          try {
            cropped = await removePageBackground(
              cropped,
              features.bgThreshold,
              features.contrastValue
            );
          } catch {}
        }

        setPages((prev) =>
          prev.map((p) =>
            p.id === pageId
              ? {
                  ...p,
                  precrop: targetPrecrop,
                  cropRect: rect,
                  processedUrl: cropped,
                  thumbUrl: cropped,
                }
              : p
          )
        );
        showToast(`Adjusted crop to ${targetPrecrop}! Full flatbed preserved. ✂️`);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to adjust crop.");
    } finally {
      setIsProcessing(false);
    }
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
    <div
      className="scanner-app-shell"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Main 2-Pane Scanner Layout (Using standard native Windows title bar) */}
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
          onScanAndAskNami={handleScanAndAskNami}
          onOpenScanFile={handleOpenScanFile}
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
          onSwitchPrecrop={handleSwitchPagePrecrop}
          onStartScan={() => handleStartScan(false)}
          onExportPdf={handleExportPdf}
          onExportArchive={handleExportArchive}
          onExportImages={handleExportImages}
          onOpenFolder={handleOpenFolder}
          onClearAll={handleClearAll}
          onAskNami={() => setShowNamiModal(true)}
          onOpenScanFile={handleOpenScanFile}
          isProcessing={isProcessing}
          scannerName={devices.find((d) => d.id === selectedDeviceId)?.name}
          source={source}
        />
      </div>

      {/* Ask Nami Assistant Modal */}
      {showNamiModal && pages[selectedIndex] && (
        <NamiAssistantModal
          page={pages[selectedIndex]}
          onClose={() => setShowNamiModal(false)}
        />
      )}

      {/* Toast Notification */}
      {toast && <div className="maru-scanner-toast">{toast}</div>}
    </div>
  );
}
