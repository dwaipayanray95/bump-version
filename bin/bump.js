#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Target the pubspec.yaml in the current working directory of the user
const cwd = process.cwd();
const pubspecPath = path.resolve(cwd, 'pubspec.yaml');
const packageJsonPath = path.resolve(cwd, 'package.json');

// --- AUTO-CONFIGURATION LOGIC ---
if (fs.existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    pkg.scripts = pkg.scripts || {};
    
    // Check if the script already exists under common names
    if (!pkg.scripts['bump-version'] && !pkg.scripts['bump']) {
      pkg.scripts['bump-version'] = 'bump-version';
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
      console.log('✅ Added "bump-version" script to your package.json');
    }
  } catch (err) {
    // Silently fail on package.json issues to avoid blocking the main task
  }
}
// --------------------------------

if (!fs.existsSync(pubspecPath)) {
  console.error(`ERROR: Could not find pubspec.yaml at ${pubspecPath}`);
  process.exit(1);
}

try {
  const content = fs.readFileSync(pubspecPath, 'utf8');
  // Regex to match 'version: X.Y.Z+W'
  const match = content.match(/^version:\s+(\d+)\.(\d+)\.(\d+)\+(\d+)$/m);

  if (!match) {
    console.error('ERROR: Could not parse version in pubspec.yaml');
    console.error('Expected format: version: major.minor.patch+build');
    process.exit(1);
  }

  const [, major, minor, patch, build] = match;
  
  // According to project rules, we bump the minor version by +1
  const newMinor = parseInt(minor, 10) + 1;
  const newVersion = `${major}.${newMinor}.${patch}+${build}`;

  const updated = content.replace(/^version: .+$/m, `version: ${newVersion}`);
  fs.writeFileSync(pubspecPath, updated);

  console.log(`Version successfully bumped: ${major}.${minor}.${patch}+${build} → ${major}.${newMinor}.${patch}+${build}`);
} catch (err) {
  console.error('ERROR: Failed to update version:', err.message);
  process.exit(1);
}
