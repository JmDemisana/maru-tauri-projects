/**
 * Image processing utilities for Maru Scanner
 * High performance canvas operations for background removal, contrast, rotation, and cropping.
 */

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`));
    img.src = src;
  });
}

/**
 * Remove background color / paper tint / bleed-through:
 * Turns off-white, yellowed, or grayish paper backgrounds pure white (#FFFFFF),
 * making text and drawings jump out with ultra-high contrast and readability.
 */
export async function removePageBackground(
  imageSrc: string,
  threshold = 215,
  contrastBoost = 15
): Promise<string> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get 2d canvas context");

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const len = data.length;

  // Pre-calculate contrast factor
  const factor = (259 * (contrastBoost + 255)) / (255 * (259 - contrastBoost));

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Standard perceptual luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Saturation estimate
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const sat = max === 0 ? 0 : (delta / max) * 100;

    // If luminance is above threshold and it's mostly neutral/paper colored
    if (lum >= threshold && sat < 35) {
      // Whiten background
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    } else if (lum > threshold - 25 && sat < 25) {
      // Soft transition gradient between paper and text
      const t = (lum - (threshold - 25)) / 25;
      data[i] = Math.min(255, Math.round(r + (255 - r) * t));
      data[i + 1] = Math.min(255, Math.round(g + (255 - g) * t));
      data[i + 2] = Math.min(255, Math.round(b + (255 - b) * t));
    } else {
      // Apply slight contrast to dark ink / text to make it razor crisp
      r = Math.min(255, Math.max(0, Math.round(factor * (r - 128) + 128)));
      g = Math.min(255, Math.max(0, Math.round(factor * (g - 128) + 128)));
      b = Math.min(255, Math.max(0, Math.round(factor * (b - 128) + 128)));
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Rotate an image by 90, 180, or 270 degrees
 */
export async function rotateImage(imageSrc: string, degrees: number): Promise<string> {
  const normDeg = ((degrees % 360) + 360) % 360;
  if (normDeg === 0) return imageSrc;

  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  if (normDeg === 90 || normDeg === 270) {
    canvas.width = img.naturalHeight || img.height;
    canvas.height = img.naturalWidth || img.width;
  } else {
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((normDeg * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Crop an image to a specific rectangle
 */
export async function cropImage(
  imageSrc: string,
  rect: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.drawImage(
    img,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Convert canvas to Blob
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

/**
 * Calculate pixel crop rectangle for standard precrop presets given DPI and image bounds
 */
export function getPrecropRectPx(
  precrop: string,
  dpi: number,
  maxWidth: number,
  maxHeight: number,
  customW = 8.5,
  customH = 11.0
): { x: number; y: number; width: number; height: number } | null {
  if (precrop === "Entire") return null;

  let wInches = 8.5;
  let hInches = 11.0;

  switch (precrop) {
    case "Letter":
      wInches = 8.5;
      hInches = 11.0;
      break;
    case "A4":
      wInches = 8.27;
      hInches = 11.69;
      break;
    case "Folio":
      wInches = 8.5;
      hInches = 13.0;
      break;
    case "Legal":
      wInches = 8.5;
      hInches = 14.0;
      break;
    case "HalfLetter":
      wInches = 5.5;
      hInches = 8.5;
      break;
    case "4R":
      wInches = 4.0;
      hInches = 6.0;
      break;
    case "Custom":
      wInches = customW;
      hInches = customH;
      break;
  }

  const targetW = Math.min(maxWidth, Math.round(wInches * dpi));
  const targetH = Math.min(maxHeight, Math.round(hInches * dpi));

  return {
    x: 0,
    y: 0,
    width: targetW,
    height: targetH,
  };
}
