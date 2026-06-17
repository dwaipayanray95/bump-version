#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const cwd = process.cwd();

/**
 * AUTO-CONFIGURATION LOGIC
 */
function ensureShortcuts() {
  const packageJsonPath = path.resolve(cwd, 'package.json');
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
}

/**
 * DETECTION ENGINE
 */
function detectPlatforms() {
  const platforms = [];
  
  // Tauri detection
  if (fs.existsSync(path.join(cwd, 'src-tauri', 'tauri.conf.json'))) {
    platforms.push('tauri');
  } 
  
  // Flutter detection
  if (fs.existsSync(path.join(cwd, 'pubspec.yaml'))) {
    platforms.push('flutter');
  }

  // Rust (standard) detection
  if (fs.existsSync(path.join(cwd, 'Cargo.toml')) && !platforms.includes('tauri')) {
    platforms.push('rust');
  }

  // Node detection (if not already Tauri)
  if (fs.existsSync(path.join(cwd, 'package.json')) && !platforms.includes('tauri')) {
    platforms.push('node');
  }

  return platforms;
}

/**
 * FILE UPDATERS
 */
function updateJson(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const pkg = JSON.parse(content);
  pkg.version = newVersion;
  fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  - Updated ${path.relative(cwd, filePath)}`);
}

function updateYaml(filePath, newVersion, isFlutter = false) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Flutter/Pubspec specific regex for version: X.Y.Z+W
  const regex = isFlutter 
    ? /^version:\s+[\d\.]+\+\d+$/m 
    : /^version:\s+[\d\.]+$/m;
    
  const replacement = isFlutter ? `version: ${newVersion}` : `version: ${newVersion}`;
  
  if (!content.match(regex)) {
     // fallback to simpler match if complex one fails
     content = content.replace(/^version: .+$/m, `version: ${newVersion}`);
  } else {
     content = content.replace(regex, replacement);
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`  - Updated ${path.relative(cwd, filePath)}`);
}

function updateToml(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Match version = "X.Y.Z" under [package]
  const regex = /^version\s*=\s*"[^"]*"/m;
  content = content.replace(regex, `version = "${newVersion}"`);
  
  fs.writeFileSync(filePath, content);
  console.log(`  - Updated ${path.relative(cwd, filePath)}`);
}

/**
 * MAIN BUMP LOGIC
 */
async function performBump(platform, type) {
  console.log(`🔍 Platform detected: ${platform.toUpperCase()}`);
  
  let currentVersion = '';
  let buildNumber = '';

  // 1. Get current version based on platform
  if (platform === 'flutter') {
    const pubspec = fs.readFileSync(path.join(cwd, 'pubspec.yaml'), 'utf8');
    const match = pubspec.match(/^version:\s+(\d+)\.(\d+)\.(\d+)\+(\d+)$/m);
    if (!match) throw new Error('Could not parse Flutter version format (major.minor.patch+build)');
    currentVersion = `${match[1]}.${match[2]}.${match[3]}`;
    buildNumber = match[4];
  } else if (platform === 'node' || platform === 'tauri') {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    currentVersion = pkg.version;
  } else if (platform === 'rust') {
    const toml = fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf8');
    const match = toml.match(/^version\s*=\s*"([^"]*)"/m);
    if (!match) throw new Error('Could not parse Rust version in Cargo.toml');
    currentVersion = match[1];
  }

  // 2. Calculate new version
  let [major, minor, patch] = currentVersion.split('.').map(v => parseInt(v, 10));
  const oldVersionDisplay = `${major}.${minor}.${patch}${buildNumber ? '+' + buildNumber : ''}`;

  if (type === 'major') { major++; minor = 0; patch = 0; }
  else if (type === 'minor') { minor++; patch = 0; }
  else if (type === 'patch') { patch++; }

  const newVersionBase = `${major}.${minor}.${patch}`;
  const newVersionFull = buildNumber ? `${newVersionBase}+${buildNumber}` : newVersionBase;

  console.log(`🚀 Bumping ${oldVersionDisplay} → ${newVersionFull} (${type})`);

  // 3. Apply updates
  if (platform === 'flutter') {
    updateYaml(path.join(cwd, 'pubspec.yaml'), newVersionFull, true);
  } else if (platform === 'node') {
    updateJson(path.join(cwd, 'package.json'), newVersionBase);
  } else if (platform === 'rust') {
    updateToml(path.join(cwd, 'Cargo.toml'), newVersionBase);
  } else if (platform === 'tauri') {
    updateJson(path.join(cwd, 'package.json'), newVersionBase);
    updateJson(path.join(cwd, 'src-tauri', 'tauri.conf.json'), newVersionBase);
    updateToml(path.join(cwd, 'src-tauri', 'Cargo.toml'), newVersionBase);
  }
}

/**
 * CLI ENTRY POINT
 */
async function run() {
  ensureShortcuts();

  const detected = detectPlatforms();
  if (detected.length === 0) {
    console.error('❌ Error: No supported project files found (package.json, pubspec.yaml, or Cargo.toml).');
    process.exit(1);
  }

  // If multiple platforms detected (and not Tauri), ask the user
  let platform = detected[0];
  if (detected.length > 1 && !detected.includes('tauri')) {
     const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
     console.log('\nMultiple platforms detected:');
     detected.forEach((p, i) => console.log(`${i + 1}. ${p.toUpperCase()}`));
     const choice = await new Promise(resolve => rl.question('\nWhich platform should I bump? ', resolve));
     rl.close();
     platform = detected[parseInt(choice) - 1] || detected[0];
  }

  const args = process.argv.slice(2);
  const executableName = path.basename(process.argv[1]);
  let bumpType = args[0];

  if (executableName.includes('major')) bumpType = 'major';
  else if (executableName.includes('minor')) bumpType = 'minor';
  else if (executableName.includes('patch')) bumpType = 'patch';

  if (!bumpType) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(`\nSelected Platform: ${platform.toUpperCase()}`);
    console.log('1. Major');
    console.log('2. Minor');
    console.log('3. Patch');
    console.log('4. Exit');
    const answer = await new Promise(resolve => rl.question('\nChoice (1-4): ', resolve));
    rl.close();
    
    switch (answer.trim()) {
      case '1': bumpType = 'major'; break;
      case '2': bumpType = 'minor'; break;
      case '3': bumpType = 'patch'; break;
      default: console.log('Exiting...'); return;
    }
  }

  try {
    await performBump(platform, bumpType);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

run();
