#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const cwd = process.cwd();
const pubspecPath = path.resolve(cwd, 'pubspec.yaml');
const packageJsonPath = path.resolve(cwd, 'package.json');

/**
 * AUTO-CONFIGURATION LOGIC
 * Ensures the user has all shortcuts in their package.json
 */
if (fs.existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    pkg.scripts = pkg.scripts || {};
    let updated = false;

    const shortcuts = {
      'bump-version': 'bump-version',
      'bump-major': 'bump-major',
      'bump-minor': 'bump-minor',
      'bump-patch': 'bump-patch'
    };

    for (const [name, cmd] of Object.entries(shortcuts)) {
      if (!pkg.scripts[name]) {
        pkg.scripts[name] = cmd;
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log('✅ Updated your package.json with new bump shortcuts.');
    }
  } catch (err) {}
}

/**
 * VERSION BUMP LOGIC
 */
function bump(type) {
  if (!fs.existsSync(pubspecPath)) {
    console.error(`ERROR: Could not find pubspec.yaml at ${pubspecPath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(pubspecPath, 'utf8');
    const match = content.match(/^version:\s+(\d+)\.(\d+)\.(\d+)\+(\d+)$/m);

    if (!match) {
      console.error('ERROR: Could not parse version in pubspec.yaml');
      console.error('Expected format: version: major.minor.patch+build');
      process.exit(1);
    }

    let [fullMatch, major, minor, patch, build] = match;
    major = parseInt(major, 10);
    minor = parseInt(minor, 10);
    patch = parseInt(patch, 10);

    const oldVersion = `${major}.${minor}.${patch}+${build}`;

    if (type === 'major') {
      major++;
      minor = 0;
      patch = 0;
    } else if (type === 'minor') {
      minor++;
      patch = 0;
    } else if (type === 'patch') {
      patch++;
    }

    const newVersion = `${major}.${minor}.${patch}+${build}`;
    const updatedContent = content.replace(/^version: .+$/m, `version: ${newVersion}`);
    
    fs.writeFileSync(pubspecPath, updatedContent);
    console.log(`🚀 Version bumped: ${oldVersion} → ${newVersion} (${type})`);
  } catch (err) {
    console.error('ERROR: Failed to update version:', err.message);
    process.exit(1);
  }
}

/**
 * CLI ENTRY POINT
 */
const args = process.argv.slice(2);
const executableName = path.basename(process.argv[1]);

let commandType = args[0];

// Detect type based on command name (e.g., bump-major)
if (executableName.includes('major')) commandType = 'major';
else if (executableName.includes('minor')) commandType = 'minor';
else if (executableName.includes('patch')) commandType = 'patch';

if (commandType) {
  bump(commandType);
} else {
  // Interactive Mode
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\nSelect bump type:');
  console.log('1. Major');
  console.log('2. Minor');
  console.log('3. Patch');
  console.log('4. Exit');

  rl.question('\nChoice (1-4): ', (answer) => {
    rl.close();
    switch (answer.trim()) {
      case '1': bump('major'); break;
      case '2': bump('minor'); break;
      case '3': bump('patch'); break;
      case '4': console.log('Exiting...'); break;
      default: console.log('Invalid choice.'); process.exit(1);
    }
  });
}
