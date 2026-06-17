# Pubspec Version Bumper

A simple Node.js CLI tool to automatically bump the minor version of a Flutter/Dart `pubspec.yaml` file.

## 🚀 Zero-Touch Installation

Install this as a dev dependency, and it will **automatically** add the `bump-version` script to your `package.json`:

```bash
npm install -D github:dwaipayanray95/bump-version
```

That's it! You can now immediately run:
```bash
npm run bump-version
```

---

## ⚡ Quick Run (No Installation)

If you don't want to install it permanently, you can run it once via `npx`. It will still offer to configure your project for you:

```bash
npx github:dwaipayanray95/bump-version
```

## How it works
The script searches for the `version:` line in `pubspec.yaml` (formatted as `major.minor.patch+build`) and increments the **minor** version by 1.

Example: `1.0.0+1` → `1.1.0+1`
