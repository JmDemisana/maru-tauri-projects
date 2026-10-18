import React from "react";
import { ScannedPage } from "../types";

interface ScanGalleryProps {
  pages: ScannedPage[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onMovePage: (from: number, to: number) => void;
  onDeletePage: (index: number) => void;
  onRotatePage: (index: number) => void;
  onScanNext: () => void;
  isScanning: boolean;
}

export const ScanGallery: React.FC<ScanGalleryProps> = ({
  pages,
  selectedIndex,
  onSelectIndex,
  onMovePage,
  onDeletePage,
  onRotatePage,
  onScanNext,
  isScanning,
}) => {
  return (
    <div className="scan-gallery-tray">
      <div className="tray-header">
        <span className="tray-title">PAGES</span>
        <span className="tray-count">{pages.length}</span>
      </div>

      <div className="tray-cards-list">
        {pages.map((page, idx) => {
          const isSelected = selectedIndex === idx;
          const thumbSrc = page.thumbUrl || page.processedUrl || page.previewUrl;

          return (
            <div
              key={page.id}
              className={`page-thumb-card ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectIndex(idx)}
            >
              <div className="thumb-header">
                <span className="page-number-pill">#{idx + 1}</span>
                <div className="thumb-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="micro-btn"
                    disabled={idx === 0}
                    onClick={() => onMovePage(idx, idx - 1)}
                    title="Move Page Up"
                  >
                    ▲
                  </button>
                  <button
                    className="micro-btn"
                    disabled={idx === pages.length - 1}
                    onClick={() => onMovePage(idx, idx + 1)}
                    title="Move Page Down"
                  >
                    ▼
                  </button>
                  <button
                    className="micro-btn"
                    onClick={() => onRotatePage(idx)}
                    title="Rotate 90°"
                  >
                    ↻
                  </button>
                  <button
                    className="micro-btn danger"
                    onClick={() => onDeletePage(idx)}
                    title="Delete Page"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="thumb-image-wrap">
                <img
                  src={thumbSrc}
                  alt={`Page ${idx + 1}`}
                  className="thumb-img"
                  style={{
                    transform: `rotate(${page.rotation || 0}deg)`,
                  }}
                />
                {page.processedUrl && <span className="clean-badge">Clean</span>}
                {page.ocrText && <span className="ocr-badge">OCR</span>}
              </div>

              <div className="thumb-footer">
                <span className="thumb-dim">
                  {page.precrop || "Full"} • {page.dpi} DPI
                </span>
              </div>
            </div>
          );
        })}

        {/* Quick Add Page tile */}
        <button
          className="add-page-card"
          onClick={onScanNext}
          disabled={isScanning}
          title="Scan Next Page"
        >
          <span className="add-icon">➕</span>
          <span className="add-text">Scan Next Page</span>
        </button>
      </div>
    </div>
  );
};
