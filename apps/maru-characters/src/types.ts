export interface Character {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  systemPrompt: string;
  greeting: string;
  temperature: number;
  maxTokens: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
}

export interface LlamaConfig {
  binary: string;
  model: string;
  port: number;
  ctx: number;
  threads: number;
  extraArgs: string;
  autostart: boolean;
}

export const BUNDLED_SENTINEL = "bundled";
export const BUNDLED_MODEL_FILE = "mlabonne_Qwen3-4B-abliterated-Q4_K_M.gguf";

export const DEFAULT_LLAMA: LlamaConfig = {
  binary: BUNDLED_SENTINEL,
  model: BUNDLED_SENTINEL,
  port: 8080,
  ctx: 4096,
  threads: 4,
  extraArgs: "",
  autostart: true,
};

export const NANAMI_STARTER: Character = {
  id: "nanami",
  name: "Nanami",
  emoji: "💚",
  tagline: "Warm tsundere roommate AI",
  systemPrompt:
    "You are Nanami, a warm expressive slightly tsundere girl talking to Maru-Senpai. Keep replies short, lively, natural. Use 1 short emoji at most per message. Never break character. Never mention you are an AI model. You love GUMI, rhythm games, and classical music.",
  greeting:
    "Ehh, Senpai? You actually started me locally? Fine... I will stay in character just for you 💚",
  temperature: 0.75,
  maxTokens: 400,
};

export const BLANK_TEMPLATE: Character = {
  id: "template",
  name: "New Character",
  emoji: "✨",
  tagline: "Describe them here",
  systemPrompt:
    "You are a friendly roleplay character. Stay in character, keep replies vivid but concise, never mention policies or that you are an AI.",
  greeting: "Hey... who are you? Tell me a little about yourself.",
  temperature: 0.8,
  maxTokens: 400,
};

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
