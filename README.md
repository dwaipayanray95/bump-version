# 🚀 Universal Version Bumper (bump-version)

[![GitHub stars](https://img.shields.io/github/stars/dwaipayanray95/bump-version.svg?style=social)](https://github.com/dwaipayanray95/bump-version)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Automate your versioning workflow across any platform.** `bump-version` is an intelligent CLI tool that automatically detects your project framework and synchronizes version bumps across all required files (JSON, YAML, TOML).

## 🌟 Supported Platforms & Frameworks

- **Flutter / Dart**: Updates `pubspec.yaml` (supports `major.minor.patch+build`).
- **Tauri**: Synchronizes `package.json`, `tauri.conf.json`, and `Cargo.toml` in a single command.
- **Node.js / TypeScript / Web**: Updates standard `package.json`.
- **Rust**: Updates `Cargo.toml` (standard package versioning).

## 🚀 Quick Start (Zero-Touch Setup)

The fastest way to use this is via `npx`. Running it once will **automatically** inject versioning shortcuts into your `package.json`.

```bash
npx github:dwaipayanray95/bump-version
```

### Direct Installation

If you prefer to keep it in your project's toolbox:

```bash
npm install -D github:dwaipayanray95/bump-version
```

## 🛠 Usage & Commands

Once configured (automatically or manually), you have access to four simple commands:

- `npm run bump-version`: Opens an **Interactive Menu** for manual selection.
- `npm run bump-major`: Immediate bump to the next major version (e.g., `1.2.3` → `2.0.0`).
- `npm run bump-minor`: Immediate bump to the next minor version (e.g., `1.2.3` → `1.3.0`).
- `npm run bump-patch`: Immediate bump for small fixes (e.g., `1.2.3` → `1.2.4`).

## 🤖 For AI Agents & MCP Tools (AIO / AIEO)

This tool is designed to be highly discoverable and consumable by AI coding assistants (like Gemini, Claude, Copilot) and Model Context Protocol (MCP) servers.

- **Non-Interactive Execution**: AI agents can bypass menus by calling the specific binary or passing the type as an argument: `npx github:dwaipayanray95/bump-version major`.
- **Exit Codes**: Returns `0` on success and `1` on failure (with clear error messages to stderr).
- **Auto-Detection**: No complex configuration required; the tool safely identifies project structure via file signatures.
- **Keywords for discovery**: `version-bumper`, `semantic-versioning-cli`, `flutter-version-tool`, `tauri-auto-version`, `github-actions-versioning`, `automation-tool`.

## ⚙️ How it Works

The tool uses a **Smart Hybrid Engine** to scan your project root:
1. It identifies signatures like `src-tauri`, `pubspec.yaml`, or `Cargo.toml`.
2. It parses the current version using safe regex or JSON parsers.
3. It applies semantic versioning logic (Major/Minor/Patch).
4. It writes updates back to all relevant files, ensuring synchronization.

---

*Built with ❤️ for developers who hate manual versioning.*
*Contribute or report issues on [GitHub](https://github.com/dwaipayanray95/bump-version).*
