import React, { useState, useRef, useEffect, useCallback } from "react";
import { ScannedPage, PrecropType, ScannerSource } from "../types";

interface ScanViewportProps {
  pages: ScannedPage[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onRotateCurrent: (degrees: number) => void;
  onApplyCrop: (pageId: string, rect: { x: number; y: number; width: number; height: number }) => void;
  onResetCrop: (pageId: string) => void;
  onSwitchPrecrop?: (pageId: string, precrop: PrecropType) => void;
  onStartScan?: () => void;
  onExportPdf: () => void;
  onExportArchive: () => void;
  onExportImages: () => void;
  onOpenFolder: () => void;
  onClearAll: () => void;
  onAskNami: () => void;
  onOpenScanFile: () => void;
  isProcessing: boolean;
  scannerName?: string;
  source?: ScannerSource;
}

export const ScanViewport: React.FC<ScanViewportProps> = ({
  pages,
  selectedIndex,
  onSelectIndex,
  onRotateCurrent,
  onApplyCrop,
  onResetCrop,
  onSwitchPrecrop,
  onStartScan,
  onExportPdf,
  onExportArchive,
  onExportImages,
  onOpenFolder,
  onClearAll,
  onAskNami,
  onOpenScanFile,
  isProcessing,
  scannerName,
  source,
}) => {
  const currentPage = pages[selectedIndex];

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // View mode: show processed (cleaned) or raw original
  const [viewMode, setViewMode] = useState<"processed" | "raw">("processed");

  // OCR Drawer toggle
  const [showOcrDrawer, setShowOcrDrawer] = useState<boolean>(false);
  const [copiedOcr, setCopiedOcr] = useState<boolean>(false);

  // Interactive Crop Tool
  const [isCropActive, setIsCropActive] = useState<boolean>(false);
  const [cropBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 10,
    y: 10,
    w: 80,
    h: 80,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset zoom & pan when switching page
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsCropActive(false);
  }, [selectedIndex]);

  // Fit to screen helper
  const handleFitToScreen = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Zoom In / Out
  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(4, Math.max(0.25, Number((prev + delta).toFixed(2)))));
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    handleZoom(delta);
  };

  // Mouse drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCropActive) return;
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && !isCropActive) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Copy OCR Text
  const handleCopyOcr = () => {
    if (!currentPage?.ocrText) return;
    navigator.clipboard.writeText(currentPage.ocrText);
    setCopiedOcr(true);
    setTimeout(() => setCopiedOcr(false), 2000);
  };

  // Execute Crop
  const handleConfirmCrop = () => {
    if (!currentPage || !imgRef.current) return;
    const img = imgRef.current;
    const realW = img.naturalWidth || currentPage.width;
    const realH = img.naturalHeight || currentPage.height;

    const cropPx = {
      x: Math.round((cropBox.x / 100) * realW),
      y: Math.round((cropBox.y / 100) * realH),
      width: Math.round((cropBox.w / 100) * realW),
      height: Math.round((cropBox.h / 100) * realH),
    };

    onApplyCrop(currentPage.id, cropPx);
    setIsCropActive(false);
  };

  if (!currentPage || pages.length === 0) {
    return (
      <main className="scan-viewport empty">
        <div className="empty-platen-card">
          <div className="platen-glass-frame">
            <div className="corner-reg tl" />
            <div className="corner-reg tr" />
            <div className="corner-reg bl" />
            <div className="corner-reg br" />
            <div className="platen-scanner-beam" />

            <div className="platen-content">
              <div className="platen-icon-wrap">
                <span className="platen-icon">{source === "Feeder" ? "📑" : "🪟"}</span>
              </div>
              <h2 className="platen-title">Scanner Ready</h2>
              <p className="platen-subtitle">
                {scannerName || "WIA Scanner"} • Ready on{" "}
                <strong>{source === "Feeder" ? "ADF Document Feeder" : "Flatbed Glass"}</strong>
              </p>

              <div className="platen-actions-row">
                {onStartScan && (
                  <button className="platen-action-btn primary" onClick={onStartScan}>
                    ⚡ Scan Document
                  </button>
                )}
                <button className="platen-action-btn secondary" onClick={onOpenScanFile}>
                  📂 Open .scan Archive
                </button>
              </div>

              <div className="platen-drop-hint">
                <span>or drag & drop a <code>.scan</code> archive here</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Determine active display source (processed vs raw)
  const displaySrc =
    viewMode === "processed" && currentPage.processedUrl
      ? currentPage.processedUrl
      : currentPage.previewUrl;

  return (
    <main className="scan-viewport">
      {/* Top Controls Toolbar */}
      <header className="viewport-toolbar">
        {/* Page Selector & Counter */}
        <div className="toolbar-group page-counter-group">
          <button
            className="icon-btn"
            disabled={selectedIndex === 0}
            onClick={() => onSelectIndex(selectedIndex - 1)}
            title="Previous Page"
          >
            ◀
          </button>
          <span className="page-counter-label">
            Page {selectedIndex + 1} of {pages.length}
          </span>
          <button
            className="icon-btn"
            disabled={selectedIndex === pages.length - 1}
            onClick={() => onSelectIndex(selectedIndex + 1)}
            title="Next Page"
          >
            ▶
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="toolbar-group">
          <button className="icon-btn" onClick={() => handleZoom(-0.25)} title="Zoom Out">
            🔍-
          </button>
          <span className="zoom-level-pill">{Math.round(zoom * 100)}%</span>
          <button className="icon-btn" onClick={() => handleZoom(0.25)} title="Zoom In">
            🔍+
          </button>
          <button className="icon-btn-text" onClick={handleFitToScreen} title="Fit to Screen">
            Fit
          </button>
          <button className="icon-btn-text" onClick={() => setZoom(1)} title="100% Size">
            100%
          </button>
        </div>

        {/* Flatbed Precrop Recovery & Quick Switcher */}
        {currentPage.source === "Flatbed" && (
          <div className="toolbar-group flatbed-recovery-group">
            {currentPage.cropRect ? (
              <>
                <button
                  className="recover-flatbed-btn"
                  onClick={() => onResetCrop(currentPage.id)}
                  title="Recover the entire original flatbed scan glass"
                >
                  🔄 Recover Full Glass
                </button>
                {onSwitchPrecrop && (
                  <select
                    className="toolbar-precrop-select"
                    value={currentPage.precrop}
                    onChange={(e) => onSwitchPrecrop(currentPage.id, e.target.value as PrecropType)}
                    title="Change precrop boundary from the raw flatbed glass"
                  >
                    <option value="Entire">Entire Flatbed</option>
                    <option value="Letter">Letter (8.5×11")</option>
                    <option value="A4">A4 (210×297mm)</option>
                    <option value="Folio">Folio (8.5×13")</option>
                    <option value="Legal">Legal (8.5×14")</option>
                    <option value="HalfLetter">Half Letter (5.5×8.5")</option>
                    <option value="4R">4R (4×6")</option>
                  </select>
                )}
              </>
            ) : (
              <span className="flatbed-badge" title="Full glass preserved">
                🪟 Full Glass
              </span>
            )}
          </div>
        )}

        {/* Feeder ADF Indicator */}
        {currentPage.source === "Feeder" && (
          <div className="toolbar-group">
            <span className="feeder-badge" title="Saved strictly to requested page size">
              📑 Feeder ({currentPage.precrop})
            </span>
          </div>
        )}

        {/* View Mode Toggle: Cleaned vs Raw */}
        {currentPage.processedUrl && (
          <div className="toolbar-group">
            <div className="mode-pill-toggle">
              <button
                className={`mode-btn ${viewMode === "processed" ? "active" : ""}`}
                onClick={() => setViewMode("processed")}
                title="Show background cleaned version"
              >
                ✨ Cleaned
              </button>
              <button
                className={`mode-btn ${viewMode === "raw" ? "active" : ""}`}
                onClick={() => setViewMode("raw")}
                title="Show original raw scan"
              >
                📷 Raw
              </button>
            </div>
          </div>
        )}

        {/* Rotation & Crop */}
        <div className="toolbar-group">
          <button
            className="icon-btn"
            onClick={() => onRotateCurrent(-90)}
            title="Rotate 90° Counter-Clockwise"
          >
            ↺
          </button>
          <button
            className="icon-btn"
            onClick={() => onRotateCurrent(90)}
            title="Rotate 90° Clockwise"
          >
            ↻
          </button>
          <button
            className={`icon-btn ${isCropActive ? "active-accent" : ""}`}
            onClick={() => setIsCropActive(!isCropActive)}
            title="Interactive Crop Tool"
          >
            ✂️
          </button>
        </div>

        {/* OCR Text Drawer & Nami AI Assistant Toggle */}
        <div className="toolbar-group">
          <button
            className={`ocr-toggle-btn ${showOcrDrawer ? "active" : ""}`}
            onClick={() => setShowOcrDrawer(!showOcrDrawer)}
            title="Inspect Extracted OCR Text"
          >
            📝 OCR Text
          </button>

          <button
            className="nami-assistant-btn"
            onClick={onAskNami}
            title="Ask Nami to solve, explain, or transcribe this scan"
          >
            ✨ Ask Nami
          </button>
        </div>

        {/* Export & Batch Actions */}
        <div className="toolbar-group export-group">
          <button
            className="export-action-btn open-scan"
            onClick={onOpenScanFile}
            title="Open an existing .scan archive"
          >
            📂 Open .scan
          </button>

          <button
            className="export-action-btn pdf"
            onClick={onExportPdf}
            disabled={isProcessing}
            title="Export all pages as multi-page PDF"
          >
            📄 PDF
          </button>

          <button
            className="export-action-btn scan"
            onClick={onExportArchive}
            disabled={isProcessing}
            title="Export session as .scan zip archive"
          >
            📦 .scan
          </button>

          <button
            className="export-action-btn"
            onClick={onExportImages}
            disabled={isProcessing}
            title="Save images to folder"
          >
            💾 Save
          </button>

          <button
            className="icon-btn"
            onClick={onOpenFolder}
            title="Open Scans folder in Explorer"
          >
            📁
          </button>

          <button
            className="icon-btn danger"
            onClick={onClearAll}
            disabled={isProcessing}
            title="Clear all pages in current session"
          >
            🗑️
          </button>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <div
        className="canvas-container"
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isCropActive ? "default" : isPanning ? "grabbing" : "grab" }}
      >
        <div
          className="canvas-inner"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: isPanning ? "none" : "transform 0.15s ease-out",
          }}
        >
          <div className="paper-shadow-sheet">
            <img
              ref={imgRef}
              src={displaySrc}
              alt={`Scan Page ${selectedIndex + 1}`}
              className="scan-page-image"
              draggable={false}
              style={{
                transform: `rotate(${currentPage.rotation || 0}deg)`,
              }}
            />

            {/* Interactive Crop Frame Overlay */}
            {isCropActive && (
              <div
                className="crop-overlay-rect"
                style={{
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.w}%`,
                  height: `${cropBox.h}%`,
                }}
              >
                <div className="crop-corner top-left" />
                <div className="crop-corner top-right" />
                <div className="crop-corner bottom-left" />
                <div className="crop-corner bottom-right" />

                <div className="crop-confirm-bar" onClick={(e) => e.stopPropagation()}>
                  <button className="crop-action-btn confirm" onClick={handleConfirmCrop}>
                    ✓ Apply Crop
                  </button>
                  <button
                    className="crop-action-btn cancel"
                    onClick={() => setIsCropActive(false)}
                  >
                    Cancel
                  </button>
                  {currentPage.cropRect && (
                    <button
                      className="crop-action-btn reset"
                      onClick={() => onResetCrop(currentPage.id)}
                    >
                      Reset Original
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-out OCR Inspector Drawer */}
      {showOcrDrawer && (
        <aside className="ocr-inspector-drawer">
          <div className="ocr-drawer-header">
            <div className="ocr-drawer-title">
              <span>OCR EXTRACTED TEXT</span>
              <small>Page #{selectedIndex + 1}</small>
            </div>
            <div className="ocr-drawer-actions">
              <button
                className={`copy-ocr-btn ${copiedOcr ? "copied" : ""}`}
                onClick={handleCopyOcr}
                disabled={!currentPage.ocrText}
              >
                {copiedOcr ? "✓ Copied!" : "📋 Copy All"}
              </button>
              <button
                className="icon-btn-close"
                onClick={() => setShowOcrDrawer(false)}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="ocr-drawer-body">
            {currentPage.ocrRunning ? (
              <div className="ocr-loading-state">
                <div className="pulse-spinner" />
                <span>Running text recognition...</span>
              </div>
            ) : currentPage.ocrText ? (
              <pre className="ocr-text-content">{currentPage.ocrText}</pre>
            ) : (
              <div className="ocr-empty-state">
                <span>No text recognized on this page.</span>
                <small>Ensure OCR feature is checked or text is sharp.</small>
              </div>
            )}
          </div>
        </aside>
      )}
    </main>
  );
};
