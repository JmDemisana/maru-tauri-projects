# ✨ Maru Tauri Projects (Desktop Shells & Local Apps)

> *"Ehh? What are you looking around here for, Senpai? ...Fine, since you're already here, let me give you the grand tour of our desktop apps! Don't just stare, read properly!"* — **Nanami 💚**

Welcome to the **Maru Desktop Monorepo**! This repository houses all the native desktop applications built with **Tauri 2 (Rust + React + TypeScript)** for the Maru ecosystem. Everything here compiles into lightweight, blazingly fast native executables that run offline without needing a cluttered browser tab.

---

## 🖥️ What's Inside?

### 🌟 [`apps/nami-agent`](./apps/nami-agent) — *Nami Agent Desktop*
*Your personal AI companion and native workstation shell!*

This is the main desktop shell for Maru. It puts me (Nanami!) right in your desktop sidebar alongside all of your favorite offline applets. 
- 🤖 **Local AI Agent**: I can read and write files on your local machine, run PowerShell commands, and search the web using Gemini grounding.
- 📂 **Offline Applets**: Run the Class Schedule Editor, Wordel, Apple Music Game, Tiertrack, Lyrics Database, Photo Serve, and more without touching a browser.
- 🔒 **Local & Secure**: Your API keys never touch any third-party cloud servers; everything stays encrypted on your device.

### 📁 [`apps/files-companion`](./apps/files-companion) — *Maru Files Companion*
*Native desktop sync and workstation companion for your Files applet!*

A lightweight desktop companion designed to interface with the Notion-backed Files storage on the Maru website. It provides native filesystem drag-and-drop, quick file uploads, split 7z archives handling, and instant file previews directly from your desktop.

---

## 🧩 Shared Crates & Packages

- **`crates/maru-core`**: The shared Rust backbone powering secure credential encryption, local filesystem bridges, and API relays across all our desktop apps.
- **`packages/ui`**: Shared React components styled in our unified in-house dark aesthetic (`@maru/ui`).
- **`packages/theme`**: Shared CSS design tokens, glowing borders, and visual theme variables (`@maru/theme`).

---

## 🛠️ Development & Building

You'll need **Node.js 20+**, **Rust toolchain (`rustup`)**, and **pnpm** installed.

```bash
# Install dependencies across all apps & packages
pnpm install

# Run Nami Agent Desktop in development mode
pnpm dev:nami

# Run Files Companion in development mode
pnpm dev:files

# Build production binaries
pnpm build:nami
pnpm build:files
```

---

## 🏷️ Release Tags

Each desktop application is released independently using tag prefixes:
- `nami-agent/vX.Y.Z` → Builds and attaches Windows `.msi` / `.exe` bundles for Nami Agent
- `files-companion/vX.Y.Z` → Builds and releases Files Companion

---

<div align="center">
  <sub>Crafted with care by Maru-Senpai & Nanami 💚</sub>
</div>
