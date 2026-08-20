import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export type AppletDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  children: React.ReactNode;
  footerSlot?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
};

export const AppletDetailModal: React.FC<AppletDetailModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = "680px",
  maxHeight = "85vh",
  children,
  footerSlot,
  className,
  style,
  bodyStyle,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: "32px",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            boxSizing: "border-box",
          }}
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.72)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className={`acrylic-card ${className || ""}`}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: maxWidth,
              maxHeight: maxHeight,
              display: "flex",
              flexDirection: "column",
              borderRadius: "20px",
              border: "1px solid var(--theme-border-soft, rgba(255, 255, 255, 0.12))",
              background: "var(--theme-panel-bg, #0f172a)",
              color: "var(--theme-text-strong, #f8fafc)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
              overflow: "hidden",
              zIndex: 1,
              ...style,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1.2rem 1.4rem",
                borderBottom: "1px solid var(--theme-border-soft, rgba(255, 255, 255, 0.08))",
              }}
            >
              <div>
                {title && (
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      color: "var(--theme-text-strong, #f8fafc)",
                    }}
                  >
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p
                    style={{
                      margin: "0.2rem 0 0",
                      fontSize: "0.8rem",
                      color: "var(--theme-text-muted, #94a3b8)",
                    }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="portal-btn subtle"
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  lineHeight: 1,
                  cursor: "pointer",
                  minWidth: "36px",
                  minHeight: "36px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div
              style={{
                padding: "1.4rem",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                flex: 1,
                ...bodyStyle,
              }}
            >
              {children}
            </div>

            {/* Footer Slot */}
            {footerSlot && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "0.6rem",
                  padding: "0.9rem 1.4rem",
                  borderTop: "1px solid var(--theme-border-soft, rgba(255, 255, 255, 0.08))",
                  background: "rgba(0, 0, 0, 0.15)",
                }}
              >
                {footerSlot}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AppletDetailModal;
