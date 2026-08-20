import React, { useMemo } from "react";

export interface MonikaSpriteVisualizerProps {
  pose?: string;
  eyes?: string;
  brows?: string;
  mouth?: string;
  modifier?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

// Offline local assets served from public/monika
const MAS_BASE_URL = "/monika";

const LAYER_IMG_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
};

const CHAIR_URL = `${MAS_BASE_URL}/t/chair-def.png`;
const TABLE_URL = `${MAS_BASE_URL}/t/table-def.png`;
const SPACEROOM_URL = "/spaceroom.png";

function resolveEyeFile(c: string, L: boolean): string {
  const p = L ? "face-leaning-def-eyes-" : "face-eyes-";
  switch (c) {
    case "w": return `${p}wide.png`;
    case "s": return `${p}sparkle.png`;
    case "t": return `${p}smug.png`;
    case "h": return `${p}closedhappy.png`;
    case "d": return `${p}closedsad.png`;
    case "k": return `${p}winkleft.png`;
    case "n": return `${p}winkright.png`;
    case "l": return `${p}left.png`;
    case "r": return `${p}right.png`;
    case "f": return `${p}soft.png`;
    case "c": return `${p}crazy.png`;
    case "m": return `${p}smugleft.png`;
    case "g": return `${p}smugright.png`;
    default:  return `${p}normal.png`;
  }
}

function resolveEyebrowFile(c: string, L: boolean): string {
  const p = L ? "face-leaning-def-eyebrows-" : "face-eyebrows-";
  switch (c) {
    case "f": return `${p}furrowed.png`;
    case "k": case "d": return `${p}knit.png`;
    case "s": case "m": return `${p}mid.png`;
    case "t": case "w": return `${p}think.png`;
    default:  return `${p}up.png`;
  }
}

function resolveMouthFile(c: string, L: boolean): string {
  const p = L ? "face-leaning-def-mouth-" : "face-mouth-";
  switch (c) {
    case "b": return `${p}big.png`;
    case "c": return `${p}smirk.png`;
    case "d": return `${p}small.png`;
    case "p": return `${p}pout.png`;
    case "w": return `${p}wide.png`;
    case "u": return `${p}smug.png`;
    case "x": return `${p}angry.png`;
    case "t": return `${p}triangle.png`;
    case "g": return L ? `${p}disgust.png` : `${p}small.png`;
    case "o": return `${p}gasp.png`;
    default:  return `${p}smile.png`;
  }
}

function resolveOverlayFiles(modifier: string, eyes: string, L: boolean): string[] {
  const p = L ? "face-leaning-def-" : "face-";
  const out: string[] = [];
  if (modifier === "blush") out.push(`${p}blush-lines-def.png`);
  if (modifier === "deepblush" || modifier === "shade") {
    out.push(`${p}blush-lines-def.png`);
    out.push(`${p}blush-def.png`);
    if (modifier === "shade") out.push(`${p}blush-shade-def.png`);
  }
  if (modifier === "sweat") out.push(`${p}sweat-def.png`);
  if (modifier === "tears") {
    if (eyes === "h") out.push(`${p}tears-streamingclosedhappy.png`);
    else if (eyes === "d") out.push(`${p}tears-streamingclosedsad.png`);
    else if (eyes === "k") out.push(`${p}tears-streamingwinkleft.png`);
    else out.push(`${p}tears-streaming.png`);
  }
  return out;
}

function resolveArmsLayers(pose: string): { b: string; c: string }[] {
  const B = `${MAS_BASE_URL}/b`;
  const C = `${MAS_BASE_URL}/c/def`;
  switch (pose) {
    case "1": return [{ b: `${B}/arms-steepling-10.png`, c: `${C}/arms-steepling-10.png` }];
    case "2": return [
      { b: `${B}/arms-crossed-5.png`, c: `${C}/arms-crossed-5.png` },
      { b: `${B}/arms-crossed-10.png`, c: `${C}/arms-crossed-10.png` },
    ];
    case "3": return [
      { b: `${B}/arms-left-rest-10.png`,  c: `${C}/arms-left-rest-10.png` },
      { b: `${B}/arms-right-point-0.png`, c: `${C}/arms-right-point-0.png` },
    ];
    case "4": return [
      { b: `${B}/arms-left-down-0.png`,   c: `${C}/arms-left-down-0.png` },
      { b: `${B}/arms-right-point-0.png`, c: `${C}/arms-right-point-0.png` },
    ];
    case "5": return [
      { b: `${B}/arms-leaning-def-left-def-10.png`,  c: `${C}/arms-leaning-def-left-def-10.png` },
      { b: `${B}/arms-leaning-def-right-def-5.png`, c: `${C}/arms-leaning-def-right-def-5.png` },
      { b: `${B}/arms-leaning-def-right-def-10.png`, c: `${C}/arms-leaning-def-right-def-10.png` },
    ];
    case "6": return [
      { b: `${B}/arms-left-down-0.png`,  c: `${C}/arms-left-down-0.png` },
      { b: `${B}/arms-right-down-0.png`, c: `${C}/arms-right-down-0.png` },
    ];
    case "7": return [
      { b: `${B}/arms-left-down-0.png`,       c: `${C}/arms-left-down-0.png` },
      { b: `${B}/arms-right-restpoint-10.png`, c: `${C}/arms-right-restpoint-10.png` },
    ];
    default: return [];
  }
}

export const MonikaSpriteVisualizer = React.memo(function MonikaSpriteVisualizer({
  pose = "1",
  eyes = "e",
  brows = "u",
  mouth = "a",
  modifier = "",
  width = "100%",
  height = "380px",
  className = "",
  style = {},
}: MonikaSpriteVisualizerProps) {
  const isLeaning = pose === "5";

  const layers = useMemo(() => {
    const L = isLeaning;
    const B = `${MAS_BASE_URL}/b`;
    const C = `${MAS_BASE_URL}/c/def`;
    const H = `${MAS_BASE_URL}/h/def`;
    const F = `${MAS_BASE_URL}/f`;
    const A = `${MAS_BASE_URL}/a/ribbon_def`;
    const bodyPfx = L ? "body-leaning-def-" : "body-def-";
    return {
      backHair:     L ? `${H}/def-0.png`                    : `${H}/0.png`,
      ribbon:       L ? `${A}/5.png`                        : `${A}/0.png`,
      bodyBase1:    `${B}/${bodyPfx}1.png`,
      clothesBody1: `${C}/${bodyPfx}1.png`,
      bodyBase0:    `${B}/${bodyPfx}0.png`,
      clothesBody0: `${C}/${bodyPfx}0.png`,
      headBase:     L ? `${B}/body-leaning-def-head.png`    : `${B}/body-def-head.png`,
      nose:         L ? `${F}/face-leaning-def-nose-def.png`: `${F}/face-nose-def.png`,
      eye:          `${F}/${resolveEyeFile(eyes, L)}`,
      brow:         `${F}/${resolveEyebrowFile(brows, L)}`,
      mouthUrl:     `${F}/${resolveMouthFile(mouth, L)}`,
      overlays:     resolveOverlayFiles(modifier, eyes, L).map(f => `${F}/${f}`),
      arms:         resolveArmsLayers(pose),
      frontHair:    L ? `${H}/def-10.png`                   : `${H}/10.png`,
    };
  }, [pose, eyes, brows, mouth, modifier, isLeaning]);

  return (
    <div
      className={`monika-sprite-container ${className}`}
      style={{
        width,
        height,
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        userSelect: "none",
        overflow: "hidden",
        backgroundImage: `url(${SPACEROOM_URL})`,
        backgroundPosition: "center 42%",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        borderRadius: "12px",
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transform: "scale(1.28) translateY(-2%)",
          transformOrigin: "center 38%",
          pointerEvents: "none",
          willChange: "transform",
        }}
      >
        <img src={CHAIR_URL}            alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 1  }} />
        <img src={layers.backHair}      alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 2  }} />
        <img src={layers.ribbon}        alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 3  }} />
        <img src={layers.bodyBase1}     alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 4  }} />
        <img src={layers.clothesBody1}  alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 5  }} />
        <img src={layers.bodyBase0}     alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 6  }} />
        <img src={layers.clothesBody0}  alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 7  }} />
        <img src={layers.headBase}      alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 8  }} />
        <img src={layers.nose}          alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 9  }} />
        <img src={layers.eye}           alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 10 }} />
        <img src={layers.brow}          alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 11 }} />
        <img src={layers.mouthUrl}      alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 12 }} />

        {layers.overlays.map((src, i) => (
          <img key={src} src={src} alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 13 + i }} />
        ))}

        {layers.arms.map((arm, i) => (
          <React.Fragment key={`arm-${i}`}>
            <img src={arm.b} alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 17 + i * 2 }} />
            <img src={arm.c} alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 18 + i * 2 }} />
          </React.Fragment>
        ))}

        <img src={TABLE_URL}            alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 24 }} />
        <img src={layers.frontHair}     alt="" style={{ ...LAYER_IMG_STYLE, zIndex: 26 }} />

        {modifier === "hearts" && (
          <div
            style={{
              position: "absolute",
              top: "20%",
              left: "22%",
              right: "22%",
              bottom: "40%",
              zIndex: 30,
              pointerEvents: "none",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "1.5rem", animation: "bounce 2s infinite" }}>💚</span>
            <span style={{ fontSize: "1.2rem", animation: "bounce 2.5s infinite 0.5s" }}>✨</span>
            <span style={{ fontSize: "1.6rem", animation: "bounce 1.8s infinite 0.2s" }}>💚</span>
          </div>
        )}
      </div>
    </div>
  );
});
