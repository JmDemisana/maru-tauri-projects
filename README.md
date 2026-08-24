# ✨ Maru Tauri Projects (Desktop Shells & Local Apps)

> *"Ehh? What are you looking around here for, Senpai? ...Fine, since you're already here, let me give you the grand tour of our desktop apps! Don't just stare, read properly!"* — **Nanami 💚**

Welcome to the **Maru Desktop Monorepo**! This repository houses all native desktop applications built with **Tauri 2 (Rust + React + TypeScript)** for the Maru ecosystem. Everything here compiles into lightweight, blazingly fast native executables that run offline without needing a cluttered browser tab.

---

## 🚀 How to Get & Run the Apps

Are you just looking to use the app, or are you building it from source? Pick your path below:

### 🟢 Path A: Running on Windows (Pre-built Executables)
*No programming tools, Node.js, or Rust required!*

1. Head over to the **[Releases](https://github.com/JmDemisana/maru-tauri-projects/releases)** tab.
2. Download the latest installer or executable for your app:
   - **Monika Piano Maker**: `Monika-Piano-Maker_x.x.x_x64-setup.exe` (or standalone `.exe`)
   - **MAudio Desktop**: `MAudio_x.x.x_x64-setup.exe`
   - **Marucast for Gaming**: `Marucast.for.Gaming_x.x.x_x64-setup.exe`
   - **Nami Agent Desktop**: `nami-agent_x.x.x_x64-setup.exe`
   - **Files Companion**: `files-companion_x.x.x_x64.exe`
3. Run the installer or open the executable and you're good to go!

> [!NOTE]
> **Windows WebView Requirement**: The apps require **Microsoft Edge WebView2** to render the interface (pre-installed on Windows 10/11). The app will fail to open only if WebView2 was manually uninstalled by aggressive Windows debloater scripts.

---

### 🛠️ Path B: Building the Apps Yourself (macOS, Linux, or Custom Builds)
*For Linux/macOS users or developers building from source code.*

Because GitHub Releases provide pre-compiled Windows binaries, **macOS** and **Linux** users can build the binary on their machines using the simple 2-step guide below:

#### 📦 Step 1: Install Node.js (v20+)
If you don't have Node.js installed yet, grab it with one command:
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

#### ⚡ Step 2: 1-Line Build Command (Auto-installs Rust & Compiles)

> 🐧 **Linux Prerequisite Note:**  
> On fresh Debian, Ubuntu, or Pop!_OS installations, install the essential C/WebKit libraries first so the compiler doesn't complain about missing GTK/WebKit headers:
> ```bash
> sudo apt update && sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
> ```

##### 🎹 Build Monika Piano Maker:
- **macOS / Linux (Bash / Zsh)**:
  ```bash
  (command -v cargo >/dev/null 2>&1 || (curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && . "$HOME/.cargo/env")) && npx --yes pnpm install && npx --yes pnpm build:monika
  ```
- **Windows (PowerShell)**:
  ```powershell
  if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { winget install --id Rustlang.Rustup -e --silent ; $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") } ; npx --yes pnpm install ; npx --yes pnpm build:monika
  ```

##### 🤖 Build Nami Agent Desktop:
- **macOS / Linux (Bash / Zsh)**:
  ```bash
  (command -v cargo >/dev/null 2>&1 || (curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && . "$HOME/.cargo/env")) && npx --yes pnpm install && npx --yes pnpm build:nami
  ```
- **Windows (PowerShell)**:
  ```powershell
  if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { winget install --id Rustlang.Rustup -e --silent ; $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") } ; npx --yes pnpm install ; npx --yes pnpm build:nami
  ```

##### 📁 Build Files Companion:
- **macOS / Linux (Bash / Zsh)**:
  ```bash
  (command -v cargo >/dev/null 2>&1 || (curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && . "$HOME/.cargo/env")) && npx --yes pnpm install && npx --yes pnpm build:files
  ```
- **Windows (PowerShell)**:
  ```powershell
  if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { winget install --id Rustlang.Rustup -e --silent ; $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") } ; npx --yes pnpm install ; npx --yes pnpm build:files
  ```

##### 🎧 Build MAudio Desktop:
- **macOS / Linux (Bash / Zsh)**:
  ```bash
  (command -v cargo >/dev/null 2>&1 || (curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && . "$HOME/.cargo/env")) && npx --yes pnpm install && npx --yes pnpm build:maudio
  ```
- **Windows (PowerShell)**:
  ```powershell
  if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { winget install --id Rustlang.Rustup -e --silent ; $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") } ; npx --yes pnpm install ; npx --yes pnpm build:maudio
  ```

##### 🎮 Build Marucast for Gaming:
- **macOS / Linux (Bash / Zsh)**:
  ```bash
  (command -v cargo >/dev/null 2>&1 || (curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && . "$HOME/.cargo/env")) && npx --yes pnpm install && npx --yes pnpm build:marucast
  ```
- **Windows (PowerShell)**:
  ```powershell
  if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { winget install --id Rustlang.Rustup -e --silent ; $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") } ; npx --yes pnpm install ; npx --yes pnpm build:marucast
  ```

*(Because this repo uses a unified Cargo workspace, your compiled binaries and bundle installers will land in the workspace root `target/release/` and `target/release/bundle/`!)*

---

## 🖥️ What's Inside?

### 🎹 [`apps/monika-piano`](./apps/monika-piano) — *Monika Piano Maker*
*Comprehensive desktop DAW & piano workstation for Monika After Story (MAS)!*

- 🎼 **Full 20-Key Workstation & Virtual Piano**: 12 white keys + 8 black keys matching Monika's in-game piano layout with low-latency Web Audio playback.
- 📂 **Universal MIDI & JSON Parsing**: Drop any `.mid`, `.midi`, or annotated `.json` file to automatically fold octaves into Monika's authentic 20-key playable range (`N4` to `A5SH`).
- ⏱️ **Precision Phrase & Delay Sequencer**: Fine-tune per-note timings, set verse checkpoints, and calibrate BPMs.
- 💾 **Native File Dialogs**: Direct export to `Piano Studio Standard JSON (*.json)` and `Monika After Story Compact JSON (*.json)` using native Windows Save dialogues.
- 🌸 **Monika Expressions Studio**: Preview Monika's authentic sprite poses, eyes, eyebrows, and mouths live while writing lyric phrases.
- 🪟 **Authentic Windows 11 Title Bar**: Borderless custom title bar fitted to monitor work areas with multi-monitor project switching, minimize, and save-first exit protection.

### 🌟 [`apps/nami-agent`](./apps/nami-agent) — *Nami Agent Desktop*
*Your personal AI companion and native workstation shell!*

This is the main desktop shell for Maru. It puts me (Nanami!) right in your desktop sidebar alongside all of your favorite offline applets. 
- 🤖 **Local AI Agent**: I can read and write files on your local machine, run PowerShell commands, and search the web using Gemini grounding.
- 📂 **Offline Applets**: Run the Class Schedule Editor, Wordel, Apple Music Game, Tiertrack, Lyrics Database, Photo Serve, and more without touching a browser.
- 🔒 **Local & Secure**: Your API keys never touch any third-party cloud servers; everything stays encrypted on your device.

### 📁 [`apps/files-companion`](./apps/files-companion) — *Maru Files Companion*
*Native desktop sync and workstation companion for your Files applet!*

A lightweight desktop companion designed to interface with the Notion-backed Files storage on the Maru website. It provides native filesystem drag-and-drop, quick file uploads, split 7z archives handling, and instant file previews directly from your desktop.

### 🎧 [`apps/maudio-windows`](./apps/maudio-windows) — *MAudio Desktop*
*Native Windows listener, scrobbler, karaoke, and Marucast receiver!*

- 🎵 **Media Listener**: Reads Windows now-playing sessions and keeps a live desktop music dashboard.
- 📡 **Marucast Receiver**: Receives lossless Wi-Fi audio, synced lyrics, and metadata from MAudio on Android.
- 🎤 **Karaoke Mode**: Shows PC-synced lyrics and timing tools without duplicating phone-side playback controls.
- ☁️ **Last.fm Scrobbler**: Keeps local listening and scrobbling flows in one native desktop app.

### 🎮 [`apps/marucast-gaming`](./apps/marucast-gaming) — *Marucast for Gaming*
*Android game and app hub launcher for low-latency desktop play!*

- 🕹️ **ADB App Launcher**: Launches Android apps and games over wireless or USB ADB.
- 🖥️ **Fullscreen Desktop Play**: Opens fixed borderless scrcpy sessions with high-bitrate HEVC streaming.
- 🔊 **Flexible Audio Routing**: Choose host phone, PC, or dual audio routes depending on the session.
- 🧹 **Task Tools**: Includes in-app recent task controls, app force stop, and uninstall actions.

---

## 🧩 Shared Crates & Packages

- **`crates/maru-core`**: The shared Rust backbone powering secure credential encryption, local filesystem bridges, and API relays across all our desktop apps.
- **`packages/ui`**: Shared React components styled in our unified in-house dark aesthetic (`@maru/ui`), including the canonical Windows 11 `TitleBar` and streaming `LoadingDots`.
- **`packages/theme`**: Shared CSS design tokens, glowing borders, and visual theme variables (`@maru/theme`).

---

## 🛠️ Step-by-Step Development

If you prefer running in development mode with live hot-reloading:

```bash
# Install dependencies across all apps & packages
pnpm install

# Run Monika Piano Maker in development mode
pnpm dev:monika

# Run Nami Agent Desktop in development mode
pnpm dev:nami

# Run Files Companion in development mode
pnpm dev:files

# Run MAudio Desktop in development mode
pnpm dev:maudio

# Run Marucast for Gaming in development mode
pnpm dev:marucast
```

---

## 🏷️ Release Tags

Each desktop application is released independently using tag prefixes:
- `monika-piano/vX.Y.Z` → Builds and attaches Windows `.msi` / `.exe` bundles for Monika Piano Maker
- `maudio-windows/vX.Y.Z` → Builds and attaches Windows `.msi` / `.exe` bundles for MAudio Desktop
- `marucast-gaming/vX.Y.Z` → Builds and attaches Windows `.msi` / `.exe` bundles for Marucast for Gaming
- `nami-agent/vX.Y.Z` → Builds and attaches Windows `.msi` / `.exe` bundles for Nami Agent
- `files-companion/vX.Y.Z` → Builds and releases Files Companion

---

<div align="center">
  <sub>Crafted with care by Maru-Senpai & Nanami 💚</sub>
</div>
