/**
 * Nanami AI Desktop — agent protocol.
 * The live site (nanami-ai.pages.dev) does the thinking. This app gives Nami
 * hands: local file + terminal tools, executed only with Senpai's permission.
 */

export const SITE_API_DEFAULT = "https://nanami-ai.pages.dev/api/chat";

export type ToolName =
  | "read_file"
  | "write_file"
  | "replace_in_file"
  | "list_directory"
  | "run_command";

export type PermSetting = "ask" | "allow";

export interface ToolCall {
  name: ToolName;
  args: Record<string, string>;
}

export const TOOL_META: Record<
  ToolName,
  { label: string; blurb: string; needs: string[]; risky: boolean }
> = {
  read_file: {
    label: "Read file",
    blurb: "Peek at a file's contents",
    needs: ["path"],
    risky: false,
  },
  list_directory: {
    label: "List folder",
    blurb: "Peek at a folder's contents",
    needs: ["path"],
    risky: false,
  },
  write_file: {
    label: "Write file",
    blurb: "Create or overwrite a whole file",
    needs: ["path", "content"],
    risky: true,
  },
  replace_in_file: {
    label: "Edit file",
    blurb: "Swap one block of text in a file",
    needs: ["path", "target", "replacement"],
    risky: true,
  },
  run_command: {
    label: "Run command",
    blurb: "Run a terminal command on this PC",
    needs: ["command"],
    risky: true,
  },
};

export const TOOL_ORDER: ToolName[] = [
  "read_file",
  "list_directory",
  "replace_in_file",
  "write_file",
  "run_command",
];

/** Gentle defaults: looking is free, touching needs a yes. */
export const DEFAULT_PERMS: Record<ToolName, PermSetting> = {
  read_file: "allow",
  list_directory: "allow",
  write_file: "ask",
  replace_in_file: "ask",
  run_command: "ask",
};

const TOOL_TAG_RE = /\[TOOL:([a-z_]+)((?:\s+[a-z_]+="(?:[^"\\]|\\.)*")*)\s*\]/;
const ATTR_RE = /([a-z_]+)="((?:[^"\\]|\\.)*)"/g;

function unescapeAttr(s: string): string {
  return s.replace(/\\(.)/g, "$1");
}

/** Pull the first well-formed [TOOL:name attr="..."] call out of model text. */
export function parseToolCall(text: string): ToolCall | null {
  const m = TOOL_TAG_RE.exec(text);
  if (!m) return null;
  const name = m[1] as ToolName;
  const meta = TOOL_META[name];
  if (!meta) return null;
  const args: Record<string, string> = {};
  const attrPart = m[2] || "";
  ATTR_RE.lastIndex = 0;
  let am: RegExpExecArray | null;
  while ((am = ATTR_RE.exec(attrPart)) !== null) {
    args[am[1]] = unescapeAttr(am[2]);
  }
  for (const key of meta.needs) {
    if (!(key in args) || !args[key].trim()) return null;
  }
  return { name, args };
}

/** Hide raw [TOOL:...] tags so chat stays readable. */
export function stripToolTags(text: string): string {
  return text
    .replace(/\[TOOL:[^\]]*\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Keep tool outputs from flooding Nami's context window. */
export function truncateForSite(text: string, max = 3500): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + `\n...[trimmed, showed first ${max} chars]`;
}

const PERM_KEY = "nanami-desktop-perms";

export function loadPerms(): Record<ToolName, PermSetting> {
  try {
    const raw = localStorage.getItem(PERM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const out = { ...DEFAULT_PERMS };
      for (const key of TOOL_ORDER) {
        if (parsed[key] === "ask" || parsed[key] === "allow") {
          out[key] = parsed[key] as PermSetting;
        }
      }
      return out;
    }
  } catch {
    /* fresh start, baka-proof defaults */
  }
  return { ...DEFAULT_PERMS };
}

export function savePerms(perms: Record<ToolName, PermSetting>): void {
  try {
    localStorage.setItem(PERM_KEY, JSON.stringify(perms));
  } catch {
    /* private mode, whatever */
  }
}
