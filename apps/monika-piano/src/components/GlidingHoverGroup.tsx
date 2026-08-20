import React, { useState } from "react";
import { motion } from "framer-motion";

export type GlidingHoverItem = {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
};

export type GlidingHoverGroupProps = {
  items: GlidingHoverItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  layoutId?: string;
  variant?: "pill" | "subtle" | "tab" | "card" | "ribbon";
  borderRadius?: string;
  pillColor?: string;
  activePillColor?: string;
  gap?: string;
  className?: string;
  style?: React.CSSProperties;
  itemStyle?: React.CSSProperties;
  enableSpring?: boolean;
};

export const GlidingHoverGroup: React.FC<GlidingHoverGroupProps> = ({
  items,
  activeId,
  onSelect,
  layoutId = "gliding-hover-indicator",
  variant = "pill",
  borderRadius,
  pillColor,
  activePillColor,
  gap = "0.35rem",
  className,
  style,
  itemStyle,
  enableSpring = true,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const activeHoveredId = hoveredId;

  const getBorderRadius = () => {
    if (borderRadius) return borderRadius;
    if (variant === "pill") return "24px";
    if (variant === "tab") return "8px";
    if (variant === "card") return "14px";
    if (variant === "ribbon") return "6px";
    return "10px";
  };

  const getHoverBg = () => {
    if (pillColor) return pillColor;
    if (variant === "card") return "rgba(255, 255, 255, 0.08)";
    if (variant === "ribbon") return "rgba(255, 255, 255, 0.09)";
    return "rgba(255, 255, 255, 0.12)";
  };

  const getActiveBg = () => {
    if (activePillColor) return activePillColor;
    return "var(--theme-accent, #6366f1)";
  };

  const radius = getBorderRadius();
  const hoverBg = getHoverBg();
  const activeBg = getActiveBg();

  return (
    <div
      onMouseLeave={() => setHoveredId(null)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: gap,
        position: "relative",
        overflowX: "auto",
        maxWidth: "100%",
        boxSizing: "border-box",
        ...style,
      }}
      className={`gliding-hover-group ${className || ""}`}
    >
      {items.map((item) => {
        const isHovered = activeHoveredId === item.id;
        const isActive = activeId !== undefined ? activeId === item.id : !!item.isActive;

        return (
          <button
            key={item.id}
            type="button"
            title={item.title}
            disabled={item.disabled}
            onClick={() => {
              if (item.onClick) item.onClick();
              if (onSelect) onSelect(item.id);
            }}
            onMouseEnter={() => setHoveredId(item.id)}
            onFocus={() => setHoveredId(item.id)}
            onBlur={() => setHoveredId(null)}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              padding: variant === "pill" ? "0.4rem 0.85rem" : "0.5rem 0.9rem",
              fontSize: "0.82rem",
              fontWeight: isActive ? 700 : 500,
              color: isActive
                ? "var(--theme-control-active-text, #ffffff)"
                : isHovered
                  ? "var(--theme-text-strong, #ffffff)"
                  : "var(--theme-text-muted, #94a3b8)",
              background: "transparent",
              border: "1px solid transparent",
              borderRadius: radius,
              cursor: item.disabled ? "not-allowed" : "pointer",
              outline: "none",
              whiteSpace: "nowrap",
              userSelect: "none",
              transition: "color 0.18s ease",
              boxSizing: "border-box",
              ...itemStyle,
              ...item.style,
            }}
            className={`gliding-hover-item ${item.className || ""} ${isActive ? "active" : ""}`}
          >
            {/* Active Highlight (Persistent Indicator) */}
            {isActive && (
              <motion.div
                layoutId={`${layoutId}-active`}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: radius,
                  background: activeBg,
                  zIndex: 0,
                  pointerEvents: "none",
                }}
                transition={
                  enableSpring
                    ? { type: "spring", stiffness: 500, damping: 35 }
                    : { duration: 0.15 }
                }
              />
            )}

            {/* Subtle Hover Highlight */}
            {isHovered && !isActive && (
              <motion.div
                layoutId={`${layoutId}-hover`}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: radius,
                  background: hoverBg,
                  zIndex: 0,
                  pointerEvents: "none",
                }}
                transition={
                  enableSpring
                    ? { type: "spring", stiffness: 500, damping: 35 }
                    : { duration: 0.12 }
                }
              />
            )}

            {/* Item Content (Above the indicator) */}
            <span
              style={{
                position: "relative",
                zIndex: 1,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              {item.icon && <span className="gliding-item-icon">{item.icon}</span>}
              <span className="gliding-item-label">{item.label}</span>
              {item.badge !== undefined && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    padding: "1px 6px",
                    borderRadius: "10px",
                    background: isActive ? "rgba(0, 0, 0, 0.25)" : "rgba(255, 255, 255, 0.1)",
                    color: "inherit",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default GlidingHoverGroup;
