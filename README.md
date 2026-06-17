# Pubspec Version Bumper

A simple Node.js CLI tool to automatically bump the version of a Flutter/Dart `pubspec.yaml` file.

## 🚀 Zero-Touch Installation

Install this as a dev dependency, and it will **automatically** add the bump scripts to your `package.json`:

```bash
npm install -D github:dwaipayanray95/bump-version
```

That's it! You can now use any of these commands:
- `npm run bump-version` (Interactive Menu)
- `npm run bump-major`
- `npm run bump-minor`
- `npm run bump-patch`

---

## ⚡ Quick Run (No Installation)

Run it once via `npx` for an interactive menu. It will also offer to configure your project for you:

```bash
npx github:dwaipayanray95/bump-version
```

## 🛠 Features

- **Interactive Mode**: Run `bump-version` without arguments to see a selection menu.
- **Direct Commands**: Use `bump-major`, `bump-minor`, or `bump-patch` for quick updates.
- **Smart Logic**:
  - **Major**: `1.2.3+1` → `2.0.0+1`
  - **Minor**: `1.2.3+1` → `1.3.0+1`
  - **Patch**: `1.2.3+1` → `1.2.4+1`

## How it works
The script searches for the `version:` line in `pubspec.yaml` (formatted as `major.minor.patch+build`) and increments the selected segment.
