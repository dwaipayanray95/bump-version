# Pubspec Version Bumper

A simple Node.js CLI tool to automatically bump the minor version of a Flutter/Dart `pubspec.yaml` file.

## Installation

You can install this directly from GitHub as a dev dependency in your project:

```bash
npm install -D github:dwaipayanray95/bump-version
```

## Quick Start (No Setup Required)

The easiest way to use this is to run it once via `npx`. It will **automatically** configure your project by adding the `bump-version` script to your `package.json`.

```bash
npx github:dwaipayanray95/bump-version
```

After running this once, you can simply use:
```bash
npm run bump-version
```

## Alternative: Installation

If you prefer to install it as a dev dependency:

```bash
npm install -D github:dwaipayanray95/bump-version
```

The first time you run it, it will still offer to add the shortcut to your `package.json` for you.

## How it works
The script searches for the `version:` line in `pubspec.yaml` (formatted as `major.minor.patch+build`) and increments the **minor** version by 1.

Example: `1.0.0+1` → `1.1.0+1`
