#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const cwd = process.cwd();
const historyPath = path.join(cwd, '.bump-history.json');

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
  const gitignorePath = path.resolve(cwd, '.gitignore');

  // 1. Ensure .gitignore handles history file
  if (fs.existsSync(gitignorePath)) {
    try {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      if (!content.includes('.bump-history.json')) {
        fs.appendFileSync(gitignorePath, '\n.bump-history.json\n');
      }
    } catch (e) {}
  }

  // 2. Ensure package.json shortcuts
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      pkg.scripts = pkg.scripts || {};
      let updated = false;

      const shortcuts = {
        'bump-version': 'bump-version',
        'bump-major': 'bump-version major',
        'bump-minor': 'bump-version minor',
        'bump-patch': 'bump-version patch',
        'bump-undo': 'bump-version undo'
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
function updateJson(filePath, newVersion, silent = false) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const pkg = JSON.parse(content);
  pkg.version = newVersion;
  fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
  if (!silent) console.log(`  ${colors.dim}sync${colors.reset} ${path.relative(cwd, filePath)}`);
}

function updateYaml(filePath, newVersion, isFlutter = false, silent = false) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const regex = isFlutter ? /^version:\s+[\d\.]+\+\d+$/m : /^version:\s+[\d\.]+$/m;
  if (!content.match(regex)) {
     content = content.replace(/^version: .+$/m, `version: ${newVersion}`);
  } else {
     content = content.replace(regex, `version: ${newVersion}`);
  }
  fs.writeFileSync(filePath, content);
  if (!silent) console.log(`  ${colors.dim}sync${colors.reset} ${path.relative(cwd, filePath)}`);
}

function updateToml(filePath, newVersion, silent = false) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const regex = /^version\s*=\s*"[^"]*"/m;
  content = content.replace(regex, `version = "${newVersion}"`);
  fs.writeFileSync(filePath, content);
  if (!silent) console.log(`  ${colors.dim}sync${colors.reset} ${path.relative(cwd, filePath)}`);
}

/**
 * HISTORY MANAGEMENT
 */
function saveToHistory(platform, files) {
  let history = [];
  try {
    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
  } catch (e) {}

  history.unshift({
    timestamp: new Date().toISOString(),
    platform,
    files
  });

  // Keep last 2 undos
  history = history.slice(0, 2);
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

async function performUndo() {
  if (!fs.existsSync(historyPath)) {
    console.error(`${colors.red}error: no history found to undo${colors.reset}`);
    return;
  }

  let history = [];
  try {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
  } catch (e) {
    console.error(`${colors.red}error: history file corrupted${colors.reset}`);
    return;
  }

  if (history.length === 0) {
    console.error(`${colors.red}error: undo history is empty${colors.reset}`);
    return;
  }

  const lastState = history.shift();
  console.log(`\n${colors.cyan}↺${colors.reset} ${colors.bright}Restoring Previous Version...${colors.reset}`);

  for (const [relPath, oldVersion] of Object.entries(lastState.files)) {
    const fullPath = path.join(cwd, relPath);
    if (relPath.endsWith('.json')) updateJson(fullPath, oldVersion);
    else if (relPath.endsWith('.yaml') || relPath.endsWith('.yml')) updateYaml(fullPath, oldVersion, lastState.platform === 'flutter');
    else if (relPath.endsWith('.toml')) updateToml(fullPath, oldVersion);
  }

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  console.log(`\n${colors.green}✔ done${colors.reset}  restored to state from ${new Date(lastState.timestamp).toLocaleTimeString()}\n`);
}

/**
 * MAIN BUMP LOGIC
 */
async function performBump(platform, type) {
  if (type === 'undo') return performUndo();

  let currentVersion = '';
  let buildNumber = '';
  let fileVersionsBefore = {};

  // 1. Snapshot and Detection
  if (platform === 'flutter') {
    const pubspec = fs.readFileSync(path.join(cwd, 'pubspec.yaml'), 'utf8');
    const match = pubspec.match(/^version:\s+(\d+)\.(\d+)\.(\d+)\+(\d+)$/m);
    if (!match) throw new Error('Could not parse Flutter version');
    currentVersion = `${match[1]}.${match[2]}.${match[3]}`;
    buildNumber = match[4];
    fileVersionsBefore['pubspec.yaml'] = `${currentVersion}+${buildNumber}`;
  } else if (platform === 'node') {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    currentVersion = pkg.version;
    fileVersionsBefore['package.json'] = currentVersion;
  } else if (platform === 'rust') {
    const toml = fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf8');
    const match = toml.match(/^version\s*=\s*"([^"]*)"/m);
    currentVersion = match[1];
    fileVersionsBefore['Cargo.toml'] = currentVersion;
  } else if (platform === 'tauri') {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    currentVersion = pkg.version;
    fileVersionsBefore['package.json'] = currentVersion;
    
    try {
      const tConf = JSON.parse(fs.readFileSync(path.join(cwd, 'src-tauri', 'tauri.conf.json'), 'utf8'));
      fileVersionsBefore['src-tauri/tauri.conf.json'] = tConf.version;
    } catch(e) {}
    
    try {
      const cToml = fs.readFileSync(path.join(cwd, 'src-tauri', 'Cargo.toml'), 'utf8');
      const cMatch = cToml.match(/^version\s*=\s*"([^"]*)"/m);
      if (cMatch) fileVersionsBefore['src-tauri/Cargo.toml'] = cMatch[1];
    } catch(e) {}
  }

  // 2. Calculate upgrade
  let [major, minor, patch] = currentVersion.split('.').map(v => parseInt(v, 10));
  const oldVersionDisplay = `${major}.${minor}.${patch}${buildNumber ? '+' + buildNumber : ''}`;

  if (type === 'major') { major++; minor = 0; patch = 0; }
  else if (type === 'minor') { minor++; patch = 0; }
  else if (type === 'patch') { patch++; }

  const newVersionBase = `${major}.${minor}.${patch}`;
  const newVersionFull = buildNumber ? `${newVersionBase}+${buildNumber}` : newVersionBase;

  // 3. Save History
  saveToHistory(platform, fileVersionsBefore);

  // 4. UI: Status Header
  console.log(`\n${colors.cyan}●${colors.reset} ${colors.bright}Platform Detected:${colors.reset} ${colors.magenta}${platform.toUpperCase()}${colors.reset} ${colors.dim}v${oldVersionDisplay}${colors.reset}`);
  console.log(`  ${colors.yellow}📂${colors.reset} ${colors.bright}Updated files:${colors.reset}`);

  // 5. Perform Sync
  if (platform === 'flutter') updateYaml(path.join(cwd, 'pubspec.yaml'), newVersionFull, true);
  else if (platform === 'node') updateJson(path.join(cwd, 'package.json'), newVersionBase);
  else if (platform === 'rust') updateToml(path.join(cwd, 'Cargo.toml'), newVersionBase);
  else if (platform === 'tauri') {
    updateJson(path.join(cwd, 'package.json'), newVersionBase);
    updateJson(path.join(cwd, 'src-tauri', 'tauri.conf.json'), newVersionBase, true);
    updateToml(path.join(cwd, 'src-tauri', 'Cargo.toml'), newVersionBase, true);
    console.log(`  ${colors.dim}sync${colors.reset} src-tauri/tauri.conf.json`);
    console.log(`  ${colors.dim}sync${colors.reset} src-tauri/Cargo.toml`);
  }
  
  // 6. UI: Final Summary
  console.log(`\n${colors.green}✔ done${colors.reset}  ${colors.dim}${oldVersionDisplay} ${colors.reset}🚀 ${colors.bright}${newVersionFull}${colors.reset} ${colors.cyan}(${type})${colors.reset}\n`);
}

/**
 * INTERACTIVE SELECTOR
 */
async function selectMenu(platform) {
  let currentVersion = '';
  let buildNumber = '';
  let hasHistory = fs.existsSync(historyPath);

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
    { label: 'major', type: 'major', preview: `${fmt(major, minor, patch)} → ${fmt(major + 1, 0, 0)}`, color: colors.red }
  ];

  if (hasHistory) {
    options.push({ label: 'undo ', type: 'undo', preview: '(revert last change)', color: colors.cyan });
  }

  options.push({ label: 'exit ', type: 'exit', preview: '', color: colors.dim });

  let selectedIndex = 0;
  let firstRender = true;

  function render() {
    const linesToMoveUp = options.length + 4;
    if (!firstRender) {
      readline.moveCursor(process.stdout, 0, -linesToMoveUp);
    }
    firstRender = false;
    process.stdout.write('\x1B[?25l');

    readline.clearLine(process.stdout, 0);
    process.stdout.write(`\n${colors.bright}bump version${colors.reset} ${colors.dim}v0.1.3${colors.reset}\n`);
    
    readline.clearLine(process.stdout, 0);
    process.stdout.write(`${colors.dim}target:${colors.reset} ${platform} ${colors.dim}(${fmt(major, minor, patch)})${colors.reset}\n\n`);

    options.forEach((opt, i) => {
      const isSelected = i === selectedIndex;
      readline.clearLine(process.stdout, 0);
      const prefix = isSelected ? `${colors.cyan}❯${colors.reset} ` : '  ';
      const label = isSelected ? `${colors.bgBlue}${colors.black} ${opt.label} ${colors.reset}` : opt.color + opt.label + colors.reset;
      const preview = opt.preview ? `  ${colors.dim}${opt.preview}${colors.reset}` : '';
      process.stdout.write(`${prefix}${label}${preview}\n`);
    });
  }

  render();

  return new Promise(resolve => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key) => {
      if (key === '\u0003') { cleanup(); process.exit(0); }
      if (key === '\u001b[A') { selectedIndex = (selectedIndex - 1 + options.length) % options.length; render(); }
      if (key === '\u001b[B') { selectedIndex = (selectedIndex + 1) % options.length; render(); }
      if (key === '\r' || key === '\n') {
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
      process.stdout.write('\x1B[?25h');
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
    else if (executableName.includes('undo')) bumpType = 'undo';
  }

  if (!bumpType || !['major', 'minor', 'patch', 'undo'].includes(bumpType)) {
    bumpType = await selectMenu(platform);
  } else {
     if (bumpType !== 'undo') console.log(`${colors.bright}${colors.blue}>>> BUMP-VERSION v0.1.3${colors.reset}`);
  }

  try {
    await performBump(platform, bumpType);
  } catch (err) {
    console.error(`\n${colors.red}error: ${err.message}${colors.reset}`);
    process.exit(1);
  }
}

run();
