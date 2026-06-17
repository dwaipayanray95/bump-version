#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const cwd = process.cwd();

// Colors - Using a more refined palette
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  red: "\x1b[31m"
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
        process.stdout.write(`${colors.dim}configuring shortcuts...${colors.reset}`);
        fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
        await sleep(400);
        process.stdout.write(`\r${colors.green}ready${colors.reset}\n`);
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
  console.log(`  ${colors.dim}update${colors.reset} ${path.relative(cwd, filePath)}`);
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
  console.log(`  ${colors.dim}update${colors.reset} ${path.relative(cwd, filePath)}`);
}

function updateToml(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const regex = /^version\s*=\s*"[^"]*"/m;
  content = content.replace(regex, `version = "${newVersion}"`);
  fs.writeFileSync(filePath, content);
  console.log(`  ${colors.dim}update${colors.reset} ${path.relative(cwd, filePath)}`);
}

/**
 * MAIN BUMP LOGIC
 */
async function performBump(platform, type) {
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

  console.log(`\n${colors.cyan}●${colors.reset} ${colors.bright}${platform.toUpperCase()}${colors.reset}`);
  console.log(`${colors.dim}bumping${colors.reset} ${oldVersionDisplay} → ${newVersionDisplay} ${colors.dim}(${type})${colors.reset}\n`);

  if (platform === 'flutter') updateYaml(path.join(cwd, 'pubspec.yaml'), newVersionFull, true);
  else if (platform === 'node') updateJson(path.join(cwd, 'package.json'), newVersionBase);
  else if (platform === 'rust') updateToml(path.join(cwd, 'Cargo.toml'), newVersionBase);
  else if (platform === 'tauri') {
    updateJson(path.join(cwd, 'package.json'), newVersionBase);
    updateJson(path.join(cwd, 'src-tauri', 'tauri.conf.json'), newVersionBase);
    updateToml(path.join(cwd, 'src-tauri', 'Cargo.toml'), newVersionBase);
  }
  
  console.log(`\n${colors.green}✔ done${colors.reset}\n`);
}

/**
 * CLI ENTRY POINT
 */
async function run() {
  await ensureShortcuts();

  const detected = detectPlatforms();
  if (detected.length === 0) {
    console.error(`${colors.red}error: no supported project found${colors.reset}`);
    process.exit(1);
  }

  let platform = detected[0];
  if (detected.length > 1 && !detected.includes('tauri')) {
     const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
     console.log(`\n${colors.cyan}platforms detected:${colors.reset}`);
     detected.forEach((p, i) => console.log(`  ${colors.dim}${i + 1}.${colors.reset} ${p}`));
     const choice = await new Promise(resolve => rl.question(`\n${colors.bright}select (1-${detected.length}): ${colors.reset}`, resolve));
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
    // direct mode
  } else {
    // interactive mode
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(`\n${colors.bright}bump version${colors.reset} ${colors.dim}v0.1.3${colors.reset}`);
    console.log(`${colors.dim}target:${colors.reset} ${platform}`);
    console.log(`\n  ${colors.cyan}1.${colors.reset} major`);
    console.log(`  ${colors.cyan}2.${colors.reset} minor`);
    console.log(`  ${colors.cyan}3.${colors.reset} patch`);
    console.log(`  ${colors.dim}4. exit${colors.reset}`);
    const answer = await new Promise(resolve => rl.question(`\n${colors.bright}› ${colors.reset}`, resolve));
    rl.close();
    
    switch (answer.trim()) {
      case '1': bumpType = 'major'; break;
      case '2': bumpType = 'minor'; break;
      case '3': bumpType = 'patch'; break;
      default: return;
    }
  }

  try {
    await performBump(platform, bumpType);
  } catch (err) {
    console.error(`\n${colors.red}error: ${err.message}${colors.reset}`);
    process.exit(1);
  }
}

run();
