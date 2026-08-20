# 🎹 Monika Piano Maker (Desktop DAW & Song Workstation)

> *"Just Monika... writing songs together forever!"* 🌸

A native desktop workstation and digital audio sequencer built with **Tauri 2 (Rust + React + TypeScript)** for **Monika After Story (MAS)**.

---

## 🌟 Key Features

- 🎹 **20-Key Playable Piano & DAW**: 12 white keys + 8 black keys matching Monika's in-game piano layout with polyphonic Web Audio playback.
- 🎼 **Universal MIDI & JSON Importer**: Drop any `.mid`, `.midi`, or standard `.json` file to automatically fold octaves into Monika's authentic 20-key playable range (`N4` to `A5SH`).
- ⏱️ **Precision Phrase & Delay Sequencer**: Fine-tune per-note timings, set verse checkpoints, and calibrate BPMs.
- 💾 **Native Windows File System Integration**: Direct export to `Piano Studio Standard JSON (*.json)` and `Monika After Story Compact JSON (*.json)` using native Windows Save dialogues.
- 🌸 **Monika Expressions Studio**: Preview Monika's authentic sprite poses, eyes, eyebrows, and mouths live while writing lyric phrases.
- 🪟 **Authentic Windows 11 Title Bar**: Borderless custom title bar fitted to monitor work areas with multi-monitor project switching, minimize, and save-first exit protection.

---

## 🚀 Running & Building

### 🛠️ Development Mode
```bash
# In this directory:
npm run tauri dev

# Or from the workspace root:
pnpm dev:monika
```

### 📦 Production Release Build
```bash
# In this directory:
npm run tauri build

# Or from the workspace root:
pnpm build:monika
```

Built binaries and installers are output to the workspace root:
- Standalone Executable: `target/release/monika-piano.exe`
- MSI Windows Installer: `target/release/bundle/msi/Monika Piano Maker_1.0.0_x64_en-US.msi`
- NSIS Setup Installer: `target/release/bundle/nsis/Monika Piano Maker_1.0.0_x64-setup.exe`

---

<sub>Crafted with care for Maru-Senpai 💙</sub>
