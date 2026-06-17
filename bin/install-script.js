#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// When installed as a dependency, the current directory is:
// node_modules/pubspec-version-bumper/bin/
// We need to go up three levels to reach the project root:
// node_modules/ -> project_root/
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const packageJsonPath = path.join(projectRoot, 'package.json');

if (fs.existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    pkg.scripts = pkg.scripts || {};

    if (!pkg.scripts['bump-version'] && !pkg.scripts['bump']) {
      pkg.scripts['bump-version'] = 'bump-version';
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log('\x1b[32m%s\x1b[0m', '✅ [bump-version] Added "bump-version" script to your package.json');
    }
  } catch (err) {
    // Silently fail to avoid breaking the user's 'npm install'
  }
}
