import { invoke } from "@tauri-apps/api/core";
import type { LastfmAuth } from "../types";
import { fetchProfileFromSession } from "./lastfmApi";

const USERNAME_KEY = "maudio_username";
const SESSION_KEY = "maudio_session_key";

const isTauriRuntime = () =>
  typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);

export function normalizeLastfmAuth(raw: unknown): LastfmAuth {
  const value = (raw || {}) as Record<string, unknown>;
  const username = typeof value.username === "string" ? value.username.trim() : "";
  const camelSession = typeof value.sessionKey === "string" ? value.sessionKey.trim() : "";
  const snakeSession = typeof value.session_key === "string" ? value.session_key.trim() : "";
  return {
    username,
    sessionKey: camelSession || snakeSession,
  };
}

export function getLocalLastfmAuth(): LastfmAuth {
  return {
    username: localStorage.getItem(USERNAME_KEY)?.trim() || "",
    sessionKey: localStorage.getItem(SESSION_KEY)?.trim() || "",
  };
}

function writeLocalLastfmAuth(auth: LastfmAuth) {
  if (auth.username) {
    localStorage.setItem(USERNAME_KEY, auth.username);
  } else {
    localStorage.removeItem(USERNAME_KEY);
  }

  if (auth.sessionKey) {
    localStorage.setItem(SESSION_KEY, auth.sessionKey);
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export async function saveLastfmAuth(auth: LastfmAuth): Promise<LastfmAuth> {
  const next = normalizeLastfmAuth(auth);
  writeLocalLastfmAuth(next);

  if (isTauriRuntime()) {
    await invoke("save_lastfm_auth", {
      username: next.username,
      sessionKey: next.sessionKey,
    }).catch((err) => {
      console.warn("Could not save Last.fm auth to native settings:", err);
    });
  }

  return next;
}

export async function clearLastfmAuth(): Promise<void> {
  writeLocalLastfmAuth({ username: "", sessionKey: "" });

  if (isTauriRuntime()) {
    await invoke("clear_lastfm_auth").catch((err) => {
      console.warn("Could not clear native Last.fm auth:", err);
    });
  }
}

export async function loadLastfmAuth(): Promise<LastfmAuth> {
  const local = getLocalLastfmAuth();
  let native: LastfmAuth = { username: "", sessionKey: "" };

  if (isTauriRuntime()) {
    try {
      native = normalizeLastfmAuth(await invoke("load_lastfm_auth"));
    } catch (err) {
      console.warn("Could not load native Last.fm auth:", err);
    }
  }

  let merged = normalizeLastfmAuth({
    username: native.username || local.username,
    sessionKey: native.sessionKey || local.sessionKey,
  });

  if (merged.sessionKey && !merged.username) {
    try {
      const profile = await fetchProfileFromSession(merged.sessionKey);
      merged = { ...merged, username: profile.username };
    } catch (err) {
      console.warn("Could not recover Last.fm username from session:", err);
    }
  }

  if (merged.username || merged.sessionKey) {
    await saveLastfmAuth(merged);
  }

  return merged;
}
