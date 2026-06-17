#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const cwd = process.cwd();

// Colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m"
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function showProgressBar(message, duration) {
  const width = 30;
  for (let i = 0; i <= width; i++) {
    const percent = Math.round((i / width) * 100);
    const bar = "█".repeat(i) + "░".repeat(width - i);
    process.stdout.write(`\r${colors.cyan}${message}${colors.reset} [${bar}] ${percent}% `);
    await sleep(duration / width);
  }
  process.stdout.write("\n");
}

function showBanner() {
  console.log(`\n${colors.bright}${colors.blue}╔═══════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║          🚀 BUMP-VERSION UNIVERSAL v0.1.3         ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚═══════════════════════════════════════════════════╝${colors.reset}\n`);
}

/**
 * AUTO-CONFIGURATION LOGIC
 */
async function ensureShortcuts() {
  const packageJsonPath = path.resolve(cwd, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      pkg.scripts = pkg.scripts || {};
      let updated = false;

      const shortcuts = {
        'bump-version': 'bump-version',
        'bump-major': 'bump-version major',
        'bump-minor': 'bump-version minor',
        'bump-patch': 'bump-version patch'
      };

      for (const [name, cmd] of Object.entries(shortcuts)) {
        if (!pkg.scripts[name] || pkg.scripts[name] === name) {
          pkg.scripts[name] = cmd;
          updated = true;
        }
      }

      if (updated) {
        showBanner();
        await showProgressBar("🔍 Initializing project shortcuts...", 800);
        fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
        console.log(`${colors.green}✅ Project successfully configured for auto-versioning.${colors.reset}\n`);
        await sleep(400);
      }
    } catch (err) {}
  }
}

/**
 * DETECTION ENGINE
 */
function detectPlatforms() {
  const platforms = [];
  if (fs.existsSync(path.join(cwd, 'src-tauri', 'tauri.conf.json'))) platforms.push('tauri');
  if (fs.existsSync(path.join(cwd, 'pubspec.yaml'))) platforms.push('flutter');
  if (fs.existsSync(path.join(cwd, 'Cargo.toml')) && !platforms.includes('tauri')) platforms.push('rust');
  if (fs.existsSync(path.join(cwd, 'package.json')) && !platforms.includes('tauri')) platforms.push('node');
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
  console.log(`  ${colors.green}✔${colors.reset} Updated ${path.relative(cwd, filePath)}`);
}

function updateYaml(filePath, newVersion, isFlutter = false) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const regex = isFlutter ? /^version:\s+[\d\.]+\+\d+$/m : /^version:\s+[\d\.]+$/m;
  if (!content.match(regex)) {
     content = content.replace(/^version: .+$/m, `version: ${newVersion}`);
  } else {
     content = content.replace(regex, `version: ${newVersion}`);
  }
  fs.writeFileSync(filePath, content);
  console.log(`  ${colors.green}✔${colors.reset} Updated ${path.relative(cwd, filePath)}`);
}

function updateToml(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const regex = /^version\s*=\s*"[^"]*"/m;
  content = content.replace(regex, `version = "${newVersion}"`);
  fs.writeFileSync(filePath, content);
  console.log(`  ${colors.green}✔${colors.reset} Updated ${path.relative(cwd, filePath)}`);
}

/**
 * MAIN BUMP LOGIC
 */
async function performBump(platform, type) {
  console.log(`${colors.cyan}🔍 Framework Identified: ${colors.bright}${platform.toUpperCase()}${colors.reset}`);
  
  let currentVersion = '';
  let buildNumber = '';

  if (platform === 'flutter') {
    const pubspec = fs.readFileSync(path.join(cwd, 'pubspec.yaml'), 'utf8');
    const match = pubspec.match(/^version:\s+(\d+)\.(\d+)\.(\d+)\+(\d+)$/m);
    if (!match) throw new Error('Could not parse Flutter version');
    currentVersion = `${match[1]}.${match[2]}.${match[3]}`;
    buildNumber = match[4];
  } else if (platform === 'node' || platform === 'tauri') {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    currentVersion = pkg.version;
  } else if (platform === 'rust') {
    const toml = fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf8');
    const match = toml.match(/^version\s*=\s*"([^"]*)"/m);
    currentVersion = match[1];
  }

  let [major, minor, patch] = currentVersion.split('.').map(v => parseInt(v, 10));
  const oldVersionDisplay = `${colors.yellow}${major}.${minor}.${patch}${buildNumber ? '+' + buildNumber : ''}${colors.reset}`;

  if (type === 'major') { major++; minor = 0; patch = 0; }
  else if (type === 'minor') { minor++; patch = 0; }
  else if (type === 'patch') { patch++; }

  const newVersionBase = `${major}.${minor}.${patch}`;
  const newVersionFull = buildNumber ? `${newVersionBase}+${buildNumber}` : newVersionBase;
  const newVersionDisplay = `${colors.green}${newVersionFull}${colors.reset}`;

  console.log(`🚀 ${colors.bright}Bumping ${oldVersionDisplay} → ${newVersionDisplay} ${colors.reset}(${type})\n`);

  if (platform === 'flutter') updateYaml(path.join(cwd, 'pubspec.yaml'), newVersionFull, true);
  else if (platform === 'node') updateJson(path.join(cwd, 'package.json'), newVersionBase);
  else if (platform === 'rust') updateToml(path.join(cwd, 'Cargo.toml'), newVersionBase);
  else if (platform === 'tauri') {
    updateJson(path.join(cwd, 'package.json'), newVersionBase);
    updateJson(path.join(cwd, 'src-tauri', 'tauri.conf.json'), newVersionBase);
    updateToml(path.join(cwd, 'src-tauri', 'Cargo.toml'), newVersionBase);
  }
  
  console.log(`\n${colors.bright}${colors.green}✨ Version synchronization complete!${colors.reset}\n`);
}

/**
 * CLI ENTRY POINT
 */
async function run() {
  await ensureShortcuts();

  const detected = detectPlatforms();
  if (detected.length === 0) {
    console.error(`${colors.red}❌ Error: No supported project files found.${colors.reset}`);
    process.exit(1);
  }

  let platform = detected[0];
  if (detected.length > 1 && !detected.includes('tauri')) {
     const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
     console.log(`\n${colors.yellow}Multiple platforms detected:${colors.reset}`);
     detected.forEach((p, i) => console.log(`  ${i + 1}. ${p.toUpperCase()}`));
     const choice = await new Promise(resolve => rl.question(`\nSelect target platform (1-${detected.length}): `, resolve));
     rl.close();
     platform = detected[parseInt(choice) - 1] || detected[0];
  }

  const args = process.argv.slice(2);
  const executableName = path.basename(process.argv[1]);
  let bumpType = args[0];

  if (!bumpType) {
    if (executableName.includes('major')) bumpType = 'major';
    else if (executableName.includes('minor')) bumpType = 'minor';
    else if (executableName.includes('patch')) bumpType = 'patch';
  }

  if (bumpType && ['major', 'minor', 'patch'].includes(bumpType)) {
    console.log(`${colors.bright}${colors.blue}>>> BUMP-VERSION v0.1.3${colors.reset}`);
  } else {
    showBanner();
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(`${colors.bright}Target: ${colors.cyan}${platform.toUpperCase()}${colors.reset}`);
    console.log(`  ${colors.blue}1.${colors.reset} Major`);
    console.log(`  ${colors.blue}2.${colors.reset} Minor`);
    console.log(`  ${colors.blue}3.${colors.reset} Patch`);
    console.log(`  ${colors.blue}4.${colors.reset} Exit`);
    const answer = await new Promise(resolve => rl.question(`\n${colors.bright}Choice (1-4): ${colors.reset}`, resolve));
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
    console.error(`\n${colors.red}❌ Error: ${err.message}${colors.reset}`);
    process.exit(1);
  }
}

run();
