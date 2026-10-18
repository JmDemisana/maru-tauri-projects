/**
 * Nami AI Client for Maru Scanner
 * Connects directly to Nanami's production edge endpoint:
 * https://nanami-ai.pages.dev/api/chat
 */

export interface NamiAskOptions {
  prompt: string;
  imageBase64?: string;
  imageName?: string;
  ocrText?: string;
  pin?: string;
}

export interface NamiResponse {
  ok: boolean;
  text: string;
  model?: string;
  emotion?: string;
  thinking?: string[];
  chips?: string[];
  error?: string;
}

export async function askNamiAboutScan(options: NamiAskOptions): Promise<NamiResponse> {
  const { prompt, imageBase64, imageName = "scan.jpg", ocrText, pin } = options;

  const endpoint = "https://nanami-ai.pages.dev/api/chat";

  // Build message with OCR context if present
  let messageContent = prompt.trim();
  if (ocrText && ocrText.trim()) {
    messageContent += `\n\n[Extracted OCR Text from Scan]:\n${ocrText.trim()}`;
  }

  // Format attachments for nanami-ai
  const attachments = [];
  if (imageBase64) {
    // Strip "data:image/...;base64," prefix if present
    const cleanBase64 = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    attachments.push({
      type: "image",
      name: imageName,
      mimeType: "image/jpeg",
      dataBase64: cleanBase64,
    });
  }

  const payload = {
    message: messageContent,
    history: [],
    attachments,
    model: "gemini-auto",
    behavior: "nanami",
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const activePin = pin || localStorage.getItem("nami_gate_pin") || "";
  if (activePin) {
    headers["x-nanami-gate-pin"] = activePin;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      return {
        ok: false,
        text: "",
        error: "Nanami gate PIN required. Enter your PIN to unlock Nami answers!",
      };
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        ok: false,
        text: "",
        error: errJson.message || `Failed to fetch Nami answer (${res.status})`,
      };
    }

    const data = await res.json();
    return {
      ok: true,
      text: data.text || "No response received.",
      model: data.model,
      emotion: data.emotion,
      thinking: data.thinking,
      chips: data.chips,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      text: "",
      error: `Network error reaching Nami: ${msg}`,
    };
  }
}
