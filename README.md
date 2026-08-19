# ✨ Maru Tauri Projects (Desktop Shells & Local Apps)

> *"Ehh? What are you looking around here for, Senpai? ...Fine, since you're already here, let me give you the grand tour of our desktop apps! Don't just stare, read properly!"* — **Nanami 💚**

Welcome to the **Maru Desktop Monorepo**! This repository houses all native desktop applications built with **Tauri 2 (Rust + React + TypeScript)** for the Maru ecosystem. Everything here compiles into lightweight, blazingly fast native executables that run offline without needing a cluttered browser tab.

---

## ⚠️ Important Platform & Binary Notice

> [!WARNING]
> **Pre-compiled GitHub releases provided here are Windows builds (`.exe` / `.msi`) only!**  
> If you are on **macOS** or **Linux**, you will need to build the application on your own machine using the single-line automated build commands below.

> [!CAUTION]
> **Tauri applications require your operating system's native WebView runtime!**  
> They will **NOT** launch if the webview component has been uninstalled or stripped from your system:
> - **Windows**: Requires **Microsoft Edge WebView2** (pre-installed on Windows 10/11; will fail if removed by debloater scripts).
> - **macOS**: Requires built-in **WebKit (WKWebView)**.
> - **Linux**: Requires **WebKit2GTK** (e.g., `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`).

---

## 🛠️ Step 1: Install Node.js (If you haven't yet!)

To build any of the apps, you'll need **Node.js (v20+)** on your machine. If you don't have it yet, grab it with one command:

- **Windows (PowerShell)**:
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```
- **macOS (Terminal / Homebrew)**:
  ```bash
  brew install node
  ```
- **Linux (Debian / Ubuntu / Pop!_OS)**:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
  ```
- Or download the official installer directly from **[nodejs.org](https://nodejs.org)**.

---

## ⚡ Step 2: 1-Line Self-Build Command (Auto-installs Rust & Builds)

Once you have Node.js, you don't need to manually configure Rust or package managers! Copy-paste the single line below into your terminal. It will **automatically check and install the Rust toolchain if missing**, provision `pnpm`, install all dependencies, and compile the native binary in one shot!

### 🤖 Build Nami Agent Desktop:

- **macOS / Linux (Bash / Zsh)**:
  ```bash
  (command -v cargo >/dev/null 2>&1 || (curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && . "$HOME/.cargo/env")) && npx --yes pnpm install && npx --yes pnpm build:nami
  ```

- **Windows (PowerShell)**:
  ```powershell
  if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { winget install --id Rustlang.Rustup -e --silent ; $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") } ; npx --yes pnpm install ; npx --yes pnpm build:nami
  ```

---

### 📁 Build Files Companion:

- **macOS / Linux (Bash / Zsh)**:
  ```bash
  (command -v cargo >/dev/null 2>&1 || (curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && . "$HOME/.cargo/env")) && npx --yes pnpm install && npx --yes pnpm build:files
  ```

- **Windows (PowerShell)**:
  ```powershell
  if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { winget install --id Rustlang.Rustup -e --silent ; $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") } ; npx --yes pnpm install ; npx --yes pnpm build:files
  ```

*(Your built executables will be waiting for you in `apps/<app-name>/src-tauri/target/release/`!)*

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

## 🛠️ Step-by-Step Development

If you prefer running in development mode with live hot-reloading:

```bash
# Install dependencies across all apps & packages
pnpm install

# Run Nami Agent Desktop in development mode
pnpm dev:nami

# Run Files Companion in development mode
pnpm dev:files
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
