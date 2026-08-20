import React from "react";

export type AppletToolbarProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  searchSlot?: React.ReactNode;
  filterSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  viewModesSlot?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
};

export const AppletToolbar: React.FC<AppletToolbarProps> = ({
  title,
  subtitle,
  searchSlot,
  filterSlot,
  actionsSlot,
  viewModesSlot,
  children,
  style,
  className,
}) => {
  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        marginBottom: "1.25rem",
        paddingBottom: "1rem",
        borderBottom: "1px solid var(--theme-border-soft, rgba(255, 255, 255, 0.08))",
        ...style,
      }}
      className={className}
    >
      {(title || subtitle || actionsSlot) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            {title && (
              typeof title === "string" ? (
                <h1
                  style={{
                    margin: 0,
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "var(--theme-text-strong, #f8fafc)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {title}
                </h1>
              ) : (
                <div style={{ display: "flex", alignItems: "center" }}>{title}</div>
              )
            )}
            {subtitle && (
              <div
                style={{
                  fontSize: "0.82rem",
                  color: "var(--theme-text-muted, #94a3b8)",
                  fontWeight: 500,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>

          {actionsSlot && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              {actionsSlot}
            </div>
          )}
        </div>
      )}

      {(searchSlot || filterSlot || viewModesSlot || children) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              flex: 1,
              minWidth: "240px",
              flexWrap: "wrap",
            }}
          >
            {searchSlot && <div style={{ flex: 1, minWidth: "180px" }}>{searchSlot}</div>}
            {filterSlot && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  overflowX: "auto",
                  maxWidth: "100%",
                  paddingBottom: "2px",
                }}
              >
                {filterSlot}
              </div>
            )}
          </div>

          {(viewModesSlot || children) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              {viewModesSlot}
              {children}
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default AppletToolbar;
