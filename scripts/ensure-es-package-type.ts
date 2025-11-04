#!/usr/bin/env tsx
/**
 * Set dist/es/package.json type to "module" while preserving
 * any existing content. This enables proper ES module resolution for dual
 * CommonJS/ES module packages.
 *
 * Usage from within a package directory:
 *   pnpm tsx ../../scripts/ensure-es-package-type.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface ESPackageJson {
  type: 'module';
  [key: string]: unknown;
}

type Action = 'created' | 'updated' | 'verified' | 'recreated';

// Get the calling package directory (where the script is run from)
const packageDir = process.cwd();
const packageName = path.basename(packageDir);
const esDir = path.join(packageDir, 'dist/es');
const packageJsonPath = path.join(esDir, 'package.json');

if (!fs.existsSync(esDir)) {
  console.log(`❌ ES directory not found for ${packageName}`);
  process.exit(1);
}

let esPackageJson: ESPackageJson = { type: 'module' };
let action: Action = 'created';

// Preserve existing content if package.json exists
if (fs.existsSync(packageJsonPath)) {
  try {
    const existingContent = fs.readFileSync(packageJsonPath, 'utf8');
    esPackageJson = JSON.parse(existingContent);
    action = esPackageJson.type === 'module' ? 'verified' : 'updated';
  } catch (error) {
    // Invalid JSON - will be recreated
    esPackageJson = { type: 'module' };
    action = 'recreated';
  }
}

// Set ES Module type
esPackageJson.type = 'module';

fs.writeFileSync(packageJsonPath, JSON.stringify(esPackageJson, null, 2));
console.log(`✅ ES module package.json ${action} for ${packageName}`);
