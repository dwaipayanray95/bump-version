#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const packageJsonPath = path.join(projectRoot, 'package.json');

// --- Visual Helpers ---
const colors = {
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m"
};

function run() {
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (pkg.scripts) {
        const shortcuts = [
          'bump-version',
          'bump-major',
          'bump-minor',
          'bump-patch'
        ];

        let updated = false;
        shortcuts.forEach(script => {
          if (pkg.scripts[script]) {
            delete pkg.scripts[script];
            updated = true;
          }
        });

        if (updated) {
          fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
          console.log(`${colors.cyan}[bump-version]${colors.reset} ${colors.yellow}Cleaning up package.json shortcuts...${colors.reset}`);
        }
      }
    } catch (err) {
      // Fail silently
    }
  }
}

run();
