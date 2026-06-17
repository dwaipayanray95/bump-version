#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m"
};

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const packageJsonPath = path.join(projectRoot, 'package.json');

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

async function run() {
  console.log(`\n${colors.bright}${colors.blue}╔═══════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║          🚀 BUMP-VERSION INSTALLER v0.1.3         ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚═══════════════════════════════════════════════════╝${colors.reset}\n`);

  await sleep(400);

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

      await showProgressBar("🔍 Analyzing project structure...", 600);

      for (const [name, cmd] of Object.entries(shortcuts)) {
        if (!pkg.scripts[name] || pkg.scripts[name] === name) {
          pkg.scripts[name] = cmd;
          updated = true;
        }
      }

      if (updated) {
        await showProgressBar("🛠️  Injecting CLI shortcuts...", 800);
        fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
        
        console.log(`\n${colors.green}✅ Configuration complete!${colors.reset}`);
        console.log(`${colors.bright}Ready to use:${colors.reset} npm run bump-version\n`);
      } else {
        console.log(`${colors.yellow}ℹ️  All shortcuts are already configured.${colors.reset}\n`);
      }
    } catch (err) {
      // Fail silently to not block npm install
    }
  } else {
    // If not in a project, we're likely being installed globally
    console.log(`${colors.cyan}Global installation detected. Skipping auto-config.${colors.reset}\n`);
  }
}

run();
