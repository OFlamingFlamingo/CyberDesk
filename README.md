# CyberDesk Terminal

A vintage IBM green-phosphor CRT-inspired desktop shell built with Electron, featuring a multi-tab terminal, live hardware and disk diagnostics, a native file browser, persistent encrypted notes, dynamic colorways, and custom UI audio synthesis.

![CyberDesk Preview](https://img.shields.io/badge/Status-Stable-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue)

---

## Features

- **Retro Aesthetic:** Styled with a classic green-phosphor CRT glow, custom scanlines, and an eDEX-UI inspired layout.
- **Dynamic Color Themes:** Instantly toggle between classic CRT Green, Amber (Compaq Portable style), and Cyberpunk Cyan right from the quick action bar.
- **Synthesized Audio Engine:** Built entirely on the Web Audio API—delivering tactile mechanical keyboard thuds as you type and crisp acoustic clicks on every UI button interaction without needing external audio files.
- **Real Pseudo-Terminal (`node-pty`):** True multi-tab shell integration supporting native syntax highlighting, `clear`/`cls` commands, and standard shell behavior (PowerShell on Windows, Bash/Zsh on Unix).
- **Live Hardware Telemetry:** Deep system monitoring powered by `systeminformation`, featuring multi-core CPU usage graphs, real-time memory matrices, and active process tracking.
- **Storage & File Manager:** Continuous C: drive capacity monitoring paired with an integrated local directory browser to launch files or shortcuts natively.
- **Encrypted Persistent Notes:** Jot down thoughts or command snippets in the sidebar notes tab; everything is safely cached via `localStorage` so it survives application restarts.
- **Quick Actions Bar:** One-click buttons for frequently used terminal commands like `git status`, theme switching, and `npm install`.

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:
- **Node.js** (LTS version recommended) — [Download here](https://nodejs.org)[cite: 5]
- **Git** (optional, for cloning)

---

## Installation & Setup

1. **Clone or download** this repository to your local machine:
   ```bash
   git clone [https://github.com/your-username/cyberdesk.git](https://github.com/your-username/cyberdesk.git)
   cd cyberdesk

If you want CyberDesk as a standalone .exe:
  ```bash
  npm run build
