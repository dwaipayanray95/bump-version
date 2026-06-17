#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const cwd = process.cwd();

// Colors - Refined palette
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  bgBlue: "\x1b[44m",
  black: "\x1b[30m"
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
        process.stdout.write(`${colors.dim}configuring shortcuts... ${colors.reset}`);
        fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
        await sleep(400);
        process.stdout.write(`${colors.green}ready${colors.reset}\n`);
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
  console.log(`  ${colors.dim}sync${colors.reset} ${path.relative(cwd, filePath)}`);
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
  console.log(`  ${colors.dim}sync${colors.reset} ${path.relative(cwd, filePath)}`);
}

function updateToml(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const regex = /^version\s*=\s*"[^"]*"/m;
  content = content.replace(regex, `version = "${newVersion}"`);
  fs.writeFileSync(filePath, content);
  console.log(`  ${colors.dim}sync${colors.reset} ${path.relative(cwd, filePath)}`);
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
  const oldVersionDisplay = `${major}.${minor}.${patch}${buildNumber ? '+' + buildNumber : ''}`;

  if (type === 'major') { major++; minor = 0; patch = 0; }
  else if (type === 'minor') { minor++; patch = 0; }
  else if (type === 'patch') { patch++; }

  const newVersionBase = `${major}.${minor}.${patch}`;
  const newVersionFull = buildNumber ? `${newVersionBase}+${buildNumber}` : newVersionBase;

  console.log(`\n${colors.cyan}●${colors.reset} ${colors.bright}Platform Detected:${colors.reset} ${colors.magenta}${platform.toUpperCase()}${colors.reset} ${colors.dim}v${oldVersionDisplay}${colors.reset}`);
  console.log(`  ${colors.yellow}📂${colors.reset} ${colors.bright}Updated files:${colors.reset}`);

  if (platform === 'flutter') updateYaml(path.join(cwd, 'pubspec.yaml'), newVersionFull, true);
  else if (platform === 'node') updateJson(path.join(cwd, 'package.json'), newVersionBase);
  else if (platform === 'rust') updateToml(path.join(cwd, 'Cargo.toml'), newVersionBase);
  else if (platform === 'tauri') {
    updateJson(path.join(cwd, 'package.json'), newVersionBase);
    updateJson(path.join(cwd, 'src-tauri', 'tauri.conf.json'), newVersionBase);
    updateToml(path.join(cwd, 'src-tauri', 'Cargo.toml'), newVersionBase);
  }
  
  console.log(`\n${colors.green}✔${colors.reset} ${colors.bright}done${colors.reset}  ${colors.dim}${oldVersionDisplay} ${colors.reset}🚀 ${colors.bright}${newVersionFull}${colors.reset} ${colors.cyan}(${type})${colors.reset}\n`);
}

/**
 * INTERACTIVE SELECTOR
 */
async function selectMenu(platform) {
  let currentVersion = '';
  let buildNumber = '';

  try {
    if (platform === 'flutter') {
      const pubspec = fs.readFileSync(path.join(cwd, 'pubspec.yaml'), 'utf8');
      const match = pubspec.match(/^version:\s+(\d+)\.(\d+)\.(\d+)\+(\d+)$/m);
      if (match) { currentVersion = `${match[1]}.${match[2]}.${match[3]}`; buildNumber = match[4]; }
    } else if (platform === 'node' || platform === 'tauri') {
      const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
      currentVersion = pkg.version;
    } else if (platform === 'rust') {
      const toml = fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf8');
      const match = toml.match(/^version\s*=\s*"([^"]*)"/m);
      if (match) currentVersion = match[1];
    }
  } catch (e) {}

  let [major, minor, patch] = (currentVersion || '0.0.0').split('.').map(v => parseInt(v, 10));
  const fmt = (ma, mi, pa) => `${ma}.${mi}.${pa}${buildNumber ? '+' + buildNumber : ''}`;

  const options = [
    { label: 'patch', type: 'patch', preview: `${fmt(major, minor, patch)} → ${fmt(major, minor, patch + 1)}`, color: colors.green },
    { label: 'minor', type: 'minor', preview: `${fmt(major, minor, patch)} → ${fmt(major, minor + 1, 0)}`, color: colors.yellow },
    { label: 'major', type: 'major', preview: `${fmt(major, minor, patch)} → ${fmt(major + 1, 0, 0)}`, color: colors.red },
    { label: 'exit', type: 'exit', preview: '', color: colors.dim }
  ];

  let selectedIndex = 0;

  function render() {
    process.stdout.write('\x1B[?25l'); // Hide cursor
    process.stdout.write('\r\x1B[K'); // Clear line
    // Move cursor up to redraw the menu
    if (selectedIndex >= 0) {
      process.stdout.write(`\x1B[${options.length + 3}A`);
    }

    console.log(`\n${colors.bright}bump version${colors.reset} ${colors.dim}v0.1.3${colors.reset}`);
    console.log(`${colors.dim}target:${colors.reset} ${platform} ${colors.dim}(${fmt(major, minor, patch)})${colors.reset}\n`);

    options.forEach((opt, i) => {
      const isSelected = i === selectedIndex;
      const prefix = isSelected ? `${colors.cyan}❯${colors.reset} ` : '  ';
      const label = isSelected ? `${colors.bgBlue}${colors.black} ${opt.label} ${colors.reset}` : opt.color + opt.label + colors.reset;
      const preview = opt.preview ? `  ${colors.dim}${opt.preview}${colors.reset}` : '';
      
      process.stdout.write('\x1B[K'); // Clear line
      console.log(`${prefix}${label}${preview}`);
    });
  }

  render();

  return new Promise(resolve => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key) => {
      if (key === '\u0003') { // Ctrl+C
        cleanup();
        process.exit(0);
      }
      if (key === '\u001b[A') { // Up arrow
        selectedIndex = (selectedIndex - 1 + options.length) % options.length;
        render();
      }
      if (key === '\u001b[B') { // Down arrow
        selectedIndex = (selectedIndex + 1) % options.length;
        render();
      }
      if (key === '\r' || key === '\n') { // Enter
        cleanup();
        const selected = options[selectedIndex].type;
        if (selected === 'exit') process.exit(0);
        resolve(selected);
      }
    };

    function cleanup() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      process.stdout.write('\x1B[?25h'); // Show cursor
    }

    process.stdin.on('data', onData);
  });
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

  if (!bumpType || !['major', 'minor', 'patch'].includes(bumpType)) {
    bumpType = await selectMenu(platform);
  } else {
     console.log(`${colors.bright}${colors.blue}>>> BUMP-VERSION v0.1.3${colors.reset}`);
  }

  try {
    await performBump(platform, bumpType);
  } catch (err) {
    console.error(`\n${colors.red}error: ${err.message}${colors.reset}`);
    process.exit(1);
  }
}

run();
