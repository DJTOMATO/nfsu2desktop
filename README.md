<p align="center">
  <img src="icon.png" alt="Underground 2 Revived" width="120" height="120">
</p>

<h1 align="center">NFSU2 Desktop</h1>

<p align="center">
  <b>Unofficial</b> standalone desktop client for <a href="https://nfsu2.xyz/">Underground 2 Revived</a> (Need for Speed: Underground 2).<br>
  <b>English</b> · <a href="README.es.md">Español</a>
</p>

<p align="center">
  <a href="https://github.com/DJTOMATO/nfsu2desktop/releases"><b>Download Latest Installer (Releases)</b></a> ·
  <a href="https://nfsu2.xyz/">Website</a> ·
  <a href="https://github.com/DJTOMATO/nfsu2desktop/issues">Report an Issue</a> ·
  <a href="https://ko-fi.com/lenabot"><b>Donate on Ko-fi</b></a>
</p>

> [!IMPORTANT]
> **Unofficial Client:** This project is an independent community project and is **not affiliated with, endorsed, maintained, or supported by** the creators or operators of [nfsu2.xyz](https://nfsu2.xyz/) or Electronic Arts.

---

## Why a desktop client?

[Underground 2 Revived](https://nfsu2.xyz/) is a web port of the classic 2004 racing game *Need for Speed: Underground 2*, running directly in modern browsers via static recompilation (`NFSU2Recomp`), WebAssembly, and WebGPU. While it runs inside standard web browsers, standard browser tabs introduce several pain points during gameplay and online multiplayer:

- **Alt-tabbing throttles background tabs:** Regular browsers throttle timers and renderers when minimized or occluded. Tabbing out to check Discord, change music, or look at a map can desync or drop your online Free Roam and race sessions.
- **Integrated vs. discrete GPU:** Laptops frequently default web browsers to low-power integrated graphics rather than your dedicated NVIDIA or AMD GPU.
- **Screen sleep on controller or wheel:** Driving with a gamepad or racing wheel without touching keyboard or mouse can trigger Windows screen timeout mid-race.
- **F12 screenshot conflicts:** Browsers typically intercept `F12` for developer tools, conflicting with the game's native `F12` screenshot feature.

This desktop client wraps `nfsu2.xyz` in a clean, high-performance Electron environment with dedicated GPU flags, zero background throttling, and controller wake-lock enabled out of the box.

## Download & Install

Grab the latest installer `Underground 2 Revived Setup.exe` from the [**Releases page**](https://github.com/DJTOMATO/nfsu2desktop/releases).

## What's configured under the hood

- **Forced Dedicated GPU Acceleration:** Launches with `force_high_performance_gpu`, `ignore-gpu-blocklist`, `enable-unsafe-webgpu`, `enable-gpu-rasterization`, `enable-zero-copy`, and `enable-oop-rasterization` so Dawn/WebGPU utilizes your dedicated graphics card with zero-copy frame presentation.
- **No Background Throttling:** Background throttling is completely disabled (`disable-renderer-backgrounding`, `disable-background-timer-throttling`, `disable-backgrounding-occluded-windows`, `backgroundThrottling: false`), allowing you to alt-tab freely without disconnecting from multiplayer lobbies or online Free Roam.
- **Full WebAssembly Performance:** Full support for WebAssembly JSPI (`WebAssembly.Suspending`), `try_table` exception handling, tail calls, and SIMD.
- **1 GB Local Disk Cache:** Pre-allocated disk cache keeps streamed game assets and binaries cached locally for fast repeat launches.
- **Persistent Profiles & Cloud Vault:** Your saved profiles, settings, and cloud vault credentials remain persisted in your client profile.
- **Display Sleep Blocker:** Prevents Windows display sleep while the client is open, ensuring uninterrupted sessions on gamepads and wheels.
- **Native Shortcut Handling:** Preserves `F12` for in-game screenshots and moves DevTools to `Ctrl + Shift + I`.

## System Requirements / Specs

| Component | Minimum | Recommended (60 - 120 FPS Widescreen) |
| :--- | :--- | :--- |
| **OS** | Windows 10 (64-bit, 1909+) | Windows 10 / 11 (64-bit) |
| **CPU** | 4-core x86_64 processor | Modern 6+ core CPU (Ryzen 5 / Core i5 or better) |
| **GPU** | DirectX 12 / Vulkan capable GPU with WebGPU support | Dedicated NVIDIA (GTX 1060 / RTX series) or AMD (RX 580 / RX 6000+) |
| **RAM** | 4 GB | 8 GB+ |
| **Storage** | ~300 MB for the client + up to 1 GB cache | SSD with 1.5 GB free space |
| **Network** | Broadband connection (streams game assets) | Stable broadband for online Free Roam & races |

## Shortcuts

| Key | Action |
| :--- | :--- |
| `F11` / `Alt + Enter` | Toggle fullscreen |
| `F5` / `Ctrl + R` | Reload page |
| `Ctrl + Shift + I` | Toggle DevTools |
| `F12` | In-game screenshot (handled by the game) |
| `Enter` | Play / Start (on boot screen) |
| `Esc` / `Start` | Pause / Garage menu (in-game) |

## Building from Source

You need [Node.js](https://nodejs.org/) (v20+ recommended) and npm installed.

```bash
git clone https://github.com/DJTOMATO/nfsu2desktop.git
cd nfsu2desktop
npm install
```

To run the client in development mode:

```bash
npm start
```

To package for your platform (outputs to `dist/`):

```bash
# Windows x64 (NSIS Installer + Portable ZIP)
npm run build:win

# Windows ARM64
npm run build:win:arm64

# Linux (AppImage + .deb)
npm run build:linux

# macOS (.dmg + .zip)
npm run build:mac
```

## Support & Donations

If you find this client useful and want to support its ongoing development and maintenance, consider buying a coffee! Any support is greatly appreciated:

<p align="center">
  <a href="https://ko-fi.com/lenabot">
    <img src="https://img.shields.io/badge/Ko--fi-Support%20on%20Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white" alt="Support on Ko-fi">
  </a>
</p>

You can donate directly at [**ko-fi.com/lenabot**](https://ko-fi.com/lenabot). For more information, check out [SPONSORS.md](SPONSORS.md).

## Disclaimer

This is an **unofficial community desktop wrapper** for [nfsu2.xyz](https://nfsu2.xyz/). It is an independent project and is **not affiliated with, maintained, authorized, or endorsed by** the creators or operators of [nfsu2.xyz](https://nfsu2.xyz/) nor Electronic Arts. *Need for Speed* and *Need for Speed: Underground 2* are trademarks of Electronic Arts Inc. No game files, ROMs, or copyrighted assets are hosted or distributed in this repository.

