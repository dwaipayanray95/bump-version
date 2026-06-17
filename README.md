# Pubspec Version Bumper

A simple Node.js CLI tool to automatically bump the minor version of a Flutter/Dart `pubspec.yaml` file.

## Installation

You can install this directly from GitHub as a dev dependency in your project:

```bash
npm install -D github:dwaipayanray95/bump-version
```

## Usage

### 1. Add to Scripts
Add a script to your project's `package.json`:

```json
"scripts": {
  "bump-version": "bump-version"
}
```

### 2. Run the Bumper
Execute the command:

```bash
npm run bump-version
```

### Direct Execution
If installed globally or via `npx` (once published to NPM), you can run it directly:

```bash
npx bump-version
```

## How it works
The script searches for the `version:` line in `pubspec.yaml` (formatted as `major.minor.patch+build`) and increments the **minor** version by 1.

Example: `1.0.0+1` → `1.1.0+1`
