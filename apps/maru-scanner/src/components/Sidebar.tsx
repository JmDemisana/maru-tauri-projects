import React from "react";
import {
  ScannerDevice,
  ScannerSource,
  PrecropType,
  ColorMode,
  DpiValue,
  FeaturesState,
  SaveFormat,
  SaveSettings,
} from "../types";

interface SidebarProps {
  devices: ScannerDevice[];
  selectedDeviceId: string | null;
  onSelectDevice: (id: string) => void;
  onRefreshDevices: () => void;
  isLoadingDevices: boolean;

  source: ScannerSource;
  onChangeSource: (source: ScannerSource) => void;

  precrop: PrecropType;
  onChangePrecrop: (precrop: PrecropType) => void;
  customWidth: number;
  customHeight: number;
  onChangeCustomWidth: (w: number) => void;
  onChangeCustomHeight: (h: number) => void;

  dpi: DpiValue;
  onChangeDpi: (dpi: DpiValue) => void;

  colorMode: ColorMode;
  onChangeColorMode: (mode: ColorMode) => void;

  features: FeaturesState;
  onToggleFeature: <K extends keyof FeaturesState>(key: K, value: FeaturesState[K]) => void;

  saveSettings: SaveSettings;
  onChangeSaveSettings: <K extends keyof SaveSettings>(key: K, value: SaveSettings[K]) => void;
  onChooseDirectory: () => void;
  onOpenDirectory: () => void;

  isScanning: boolean;
  scanProgressText: string;
  onStartScan: (append: boolean) => void;
  onScanAndAskNami: () => void;
  onOpenScanFile: () => void;
  hasScans: boolean;
  pageCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onRefreshDevices,
  isLoadingDevices,
  source,
  onChangeSource,
  precrop,
  onChangePrecrop,
  customWidth,
  customHeight,
  onChangeCustomWidth,
  onChangeCustomHeight,
  dpi,
  onChangeDpi,
  colorMode,
  onChangeColorMode,
  features,
  onToggleFeature,
  saveSettings,
  onChangeSaveSettings,
  onChooseDirectory,
  onOpenDirectory,
  isScanning,
  scanProgressText,
  onStartScan,
  onScanAndAskNami,
  onOpenScanFile,
  hasScans,
  pageCount,
}) => {
  const currentDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0];

  const handleSourceChange = (newSource: ScannerSource) => {
    onChangeSource(newSource);
    // Entire flatbed is NOT available on feeder! Auto-switch to standard Letter
    if (newSource === "Feeder" && precrop === "Entire") {
      onChangePrecrop("Letter");
    }
  };

  const handlePrecropChange = (p: PrecropType) => {
    if ((p === "Folio" || p === "Legal") && source === "Flatbed") {
      // Prompt/switch to Feeder if device supports it since Folio & Legal extend past flatbed glass
      if (currentDevice?.hasFeeder) {
        onChangeSource("Feeder");
      }
    }
    onChangePrecrop(p);
  };

  return (
    <aside className="scanner-sidebar">
      {/* 1. Scanner & Device Source */}
      <section className="sidebar-section">
        <div className="section-header">
          <span className="section-title">SCANNER</span>
          <span className="section-hint">
            {currentDevice?.hasFeeder ? "Flatbed + Feeder" : "Flatbed"}
          </span>
          <button
            className="icon-btn-subtle"
            onClick={onRefreshDevices}
            disabled={isLoadingDevices || isScanning}
            title="Refresh scanner devices"
          >
            {isLoadingDevices ? "⏳" : "🔄"}
          </button>
        </div>

        {/* Device Picker */}
        <div className="control-group">
          <select
            className="sidebar-select"
            value={selectedDeviceId || ""}
            onChange={(e) => onSelectDevice(e.target.value)}
            disabled={isScanning || devices.length === 0}
          >
            {devices.length === 0 ? (
              <option value="">No WIA scanner detected</option>
            ) : (
              devices.map((d, idx) => (
                <option key={d.id || idx} value={d.id || d.name}>
                  {d.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Source Toggle: Flatbed vs Feeder */}
        <div className="segmented-toggle">
          <button
            className={`toggle-option ${source === "Flatbed" ? "active" : ""}`}
            onClick={() => handleSourceChange("Flatbed")}
            disabled={isScanning}
          >
            <span>🪟 Flatbed</span>
          </button>
          <button
            className={`toggle-option ${source === "Feeder" ? "active" : ""}`}
            onClick={() => handleSourceChange("Feeder")}
            disabled={isScanning || (currentDevice && !currentDevice.hasFeeder)}
            title={currentDevice && !currentDevice.hasFeeder ? "This scanner does not have an ADF feeder" : "Document Feeder"}
          >
            <span>📑 Feeder (ADF)</span>
          </button>
        </div>
      </section>

      {/* 2. Precrop Selection */}
      <section className="sidebar-section">
        <div className="section-header">
          <span className="section-title">PRECROP</span>
          <span className="section-hint">
            {source === "Flatbed" ? "Non-destructive" : "Saved page size"}
          </span>
        </div>

        <div className="pill-grid">
          {/* Entire Flatbed is ONLY available on Flatbed, NEVER on Feeder */}
          {source === "Flatbed" && (
            <button
              className={`choice-pill ${precrop === "Entire" ? "active" : ""}`}
              onClick={() => handlePrecropChange("Entire")}
              disabled={isScanning}
              title="Scan and display the entire flatbed glass"
            >
              Entire Flatbed
            </button>
          )}

          <button
            className={`choice-pill ${precrop === "Letter" ? "active" : ""}`}
            onClick={() => handlePrecropChange("Letter")}
            disabled={isScanning}
          >
            Letter (8.5×11")
          </button>

          <button
            className={`choice-pill ${precrop === "A4" ? "active" : ""}`}
            onClick={() => handlePrecropChange("A4")}
            disabled={isScanning}
          >
            A4 (210×297mm)
          </button>

          <button
            className={`choice-pill folio-pill ${precrop === "Folio" ? "active" : ""}`}
            onClick={() => handlePrecropChange("Folio")}
            disabled={isScanning}
            title="Folio (8.5×13 inches) - Long bond paper"
          >
            <span>Folio (8.5×13")</span>
            {source === "Flatbed" && <span className="pill-sub-tag">Feeder rec.</span>}
          </button>

          <button
            className={`choice-pill folio-pill ${precrop === "Legal" ? "active" : ""}`}
            onClick={() => handlePrecropChange("Legal")}
            disabled={isScanning}
            title="Legal (8.5×14 inches) - US Legal"
          >
            <span>Legal (8.5×14")</span>
            {source === "Flatbed" && <span className="pill-sub-tag">Feeder rec.</span>}
          </button>

          <button
            className={`choice-pill ${precrop === "HalfLetter" ? "active" : ""}`}
            onClick={() => handlePrecropChange("HalfLetter")}
            disabled={isScanning}
          >
            Half Letter (5.5×8.5")
          </button>

          <button
            className={`choice-pill ${precrop === "4R" ? "active" : ""}`}
            onClick={() => handlePrecropChange("4R")}
            disabled={isScanning}
            title="4R Photo Print (4×6 inches)"
          >
            4R (4×6" Photo)
          </button>

          <button
            className={`choice-pill ${precrop === "Custom" ? "active" : ""}`}
            onClick={() => handlePrecropChange("Custom")}
            disabled={isScanning}
          >
            Custom
          </button>
        </div>

        {precrop === "Custom" && (
          <div className="custom-crop-inputs">
            <div className="input-with-label">
              <span>W:</span>
              <input
                type="number"
                step="0.1"
                min="1"
                max="14"
                value={customWidth}
                onChange={(e) => onChangeCustomWidth(Number(e.target.value))}
                disabled={isScanning}
              />
              <span className="unit">in</span>
            </div>
            <div className="input-with-label">
              <span>H:</span>
              <input
                type="number"
                step="0.1"
                min="1"
                max="24"
                value={customHeight}
                onChange={(e) => onChangeCustomHeight(Number(e.target.value))}
                disabled={isScanning}
              />
              <span className="unit">in</span>
            </div>
          </div>
        )}

        {source === "Flatbed" && (
          <div className="precrop-note-badge">
            <span className="note-icon">✨</span>
            <span>Entire glass is saved to disk. Precrop can be restored or re-adjusted later!</span>
          </div>
        )}

        {source === "Feeder" && (
          <div className="precrop-note-badge feeder-note">
            <span className="note-icon">📑</span>
            <span>Feeder saves exact page size so multi-page batches stay clean.</span>
          </div>
        )}
      </section>

      {/* 3. DPI Resolution */}
      <section className="sidebar-section">
        <div className="section-header">
          <span className="section-title">RESOLUTION (DPI)</span>
          <span className="section-badge">{dpi} DPI</span>
        </div>

        <div className="pill-row">
          {([100, 150, 200, 300, 600] as DpiValue[]).map((val) => (
            <button
              key={val}
              className={`choice-pill-compact ${dpi === val ? "active" : ""}`}
              onClick={() => onChangeDpi(val)}
              disabled={isScanning}
            >
              {val}
              {val === 300 && <span className="rec-dot" title="Recommended" />}
            </button>
          ))}
        </div>
      </section>

      {/* 4. Color Mode */}
      <section className="sidebar-section">
        <div className="section-header">
          <span className="section-title">COLOR MODE</span>
        </div>

        <div className="segmented-toggle three-way">
          <button
            className={`toggle-option ${colorMode === "Color" ? "active" : ""}`}
            onClick={() => onChangeColorMode("Color")}
            disabled={isScanning}
          >
            🌈 Color
          </button>
          <button
            className={`toggle-option ${colorMode === "Gray" ? "active" : ""}`}
            onClick={() => onChangeColorMode("Gray")}
            disabled={isScanning}
          >
            ⚪ Grayscale
          </button>
          <button
            className={`toggle-option ${colorMode === "Text" ? "active" : ""}`}
            onClick={() => onChangeColorMode("Text")}
            disabled={isScanning}
          >
            ⬛ Text (B&W)
          </button>
        </div>
      </section>

      {/* 5. Features */}
      <section className="sidebar-section">
        <div className="section-header">
          <span className="section-title">FEATURES</span>
          <span className="section-hint">Enhancements</span>
        </div>

        {/* Remove background color */}
        <div className="feature-row">
          <label className="feature-label">
            <input
              type="checkbox"
              checked={features.removeBackground}
              onChange={(e) => onToggleFeature("removeBackground", e.target.checked)}
            />
            <span className="feature-text">
              <strong>Remove Background Color</strong>
              <small>Whiten paper background & remove bleed-through</small>
            </span>
          </label>
        </div>

        {features.removeBackground && (
          <div className="slider-control">
            <div className="slider-label-row">
              <span>Whitening Threshold</span>
              <span>{features.bgThreshold}</span>
            </div>
            <input
              type="range"
              min="170"
              max="245"
              value={features.bgThreshold}
              onChange={(e) => onToggleFeature("bgThreshold", Number(e.target.value))}
              className="maru-range-slider"
            />
          </div>
        )}

        {/* OCR Text Extraction */}
        <div className="feature-row">
          <label className="feature-label">
            <input
              type="checkbox"
              checked={features.ocrEnabled}
              onChange={(e) => onToggleFeature("ocrEnabled", e.target.checked)}
            />
            <span className="feature-text">
              <strong>OCR (Text Recognition)</strong>
              <small>Extract editable text & copy directly to clipboard</small>
            </span>
          </label>
        </div>

        {/* Auto Contrast boost */}
        <div className="feature-row">
          <label className="feature-label">
            <input
              type="checkbox"
              checked={features.autoContrast}
              onChange={(e) => onToggleFeature("autoContrast", e.target.checked)}
            />
            <span className="feature-text">
              <strong>Auto Contrast / Sharpness</strong>
              <small>Crisp up pencil and faded ink strokes</small>
            </span>
          </label>
        </div>
      </section>

      {/* 6. Save As & Output Location */}
      <section className="sidebar-section">
        <div className="section-header">
          <span className="section-title">SAVE AS</span>
        </div>

        {/* Format Selector Pills */}
        <div className="pill-grid">
          {(["PNG", "JPEG", "PDF", "SCAN"] as SaveFormat[]).map((fmt) => (
            <button
              key={fmt}
              className={`choice-pill ${saveSettings.format === fmt ? "active" : ""}`}
              onClick={() => onChangeSaveSettings("format", fmt)}
              disabled={isScanning}
            >
              {fmt === "SCAN" ? (
                <span className="scan-pill-inner">
                  📦 .scan <small>(Maru Zip)</small>
                </span>
              ) : (
                `.${fmt.toLowerCase()}`
              )}
            </button>
          ))}
        </div>

        {saveSettings.format === "JPEG" && (
          <div className="slider-control">
            <div className="slider-label-row">
              <span>JPEG Quality</span>
              <span>{saveSettings.jpegQuality}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={saveSettings.jpegQuality}
              onChange={(e) => onChangeSaveSettings("jpegQuality", Number(e.target.value))}
              className="maru-range-slider"
            />
          </div>
        )}

        {/* File Name Prefix */}
        <div className="control-group">
          <label className="control-label">File Prefix</label>
          <input
            type="text"
            className="sidebar-input"
            value={saveSettings.fileNamePrefix}
            onChange={(e) => onChangeSaveSettings("fileNamePrefix", e.target.value)}
            placeholder="Scan"
            disabled={isScanning}
          />
        </div>

        {/* Save Location Folder */}
        <div className="control-group">
          <div className="folder-label-row">
            <label className="control-label">Save Location</label>
            <button
              className="text-action-link"
              onClick={onOpenDirectory}
              title="Open folder in Explorer"
            >
              Open ↗
            </button>
          </div>
          <div className="folder-input-row">
            <input
              type="text"
              className="sidebar-input folder-path-input"
              value={saveSettings.outputDirectory}
              onChange={(e) => onChangeSaveSettings("outputDirectory", e.target.value)}
              placeholder="C:\Users\...\Pictures\MaruScans"
              readOnly
            />
            <button
              className="browse-btn"
              onClick={onChooseDirectory}
              disabled={isScanning}
              title="Browse folder"
            >
              📁
            </button>
          </div>
        </div>
      </section>

      {/* Action Scan Buttons */}
      <div className="sidebar-footer">
        {isScanning ? (
          <div className="scanning-banner">
            <div className="pulse-spinner" />
            <div className="scanning-text">
              <strong>Scanning...</strong>
              <span>{scanProgressText || "Communicating with scanner..."}</span>
            </div>
          </div>
        ) : (
          <div className="scan-actions-stack">
            <button
              className="primary-scan-btn"
              onClick={() => onStartScan(false)}
              disabled={isScanning || devices.length === 0}
            >
              <span className="btn-icon">⚡</span>
              <span>Scan Document</span>
            </button>

            <button
              className="nami-scan-btn"
              onClick={onScanAndAskNami}
              disabled={isScanning || devices.length === 0}
              title="Scan and immediately ask Nami for answers or worksheet help"
            >
              <span className="btn-icon">✨</span>
              <span>Scan & Ask Nami</span>
            </button>

            {hasScans && (
              <button
                className="secondary-scan-btn"
                onClick={() => onStartScan(true)}
                disabled={isScanning}
                title="Append another page to this session"
              >
                <span>➕ Scan Next Page</span>
                <span className="page-badge-counter">#{pageCount + 1}</span>
              </button>
            )}

            <button
              className="open-archive-sidebar-btn"
              onClick={onOpenScanFile}
              disabled={isScanning}
              title="Open and load an existing .scan archive"
            >
              <span>📂 Open .scan Archive</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
