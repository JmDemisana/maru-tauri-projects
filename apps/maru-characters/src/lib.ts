import type { Character, ChatMessage, LlamaConfig } from "./types";

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors on potato PC
  }
}

export async function sendChat(
  cfg: LlamaConfig,
  char: Character,
  history: ChatMessage[],
  userText: string
): Promise<string> {
  const base = `http://127.0.0.1:${cfg.port}`;
  const messages = [
    { role: "system", content: char.systemPrompt },
    ...history
      .filter((m) => m.role !== "system")
      .slice(-24)
      .map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userText },
  ];

  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "local",
      messages,
      temperature: char.temperature,
      max_tokens: char.maxTokens,
      stream: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`llama-server ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const content: string | undefined =
    data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text;
  if (!content) throw new Error("empty reply from model");
  return content.trim();
}
