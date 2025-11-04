#!/usr/bin/env tsx
/**
 * This is needed to support ECMA Script modules.
 * It fixes TypeScript source imports to use .js extensions for proper ES module support
 * Can be called from any package directory with: pnpm tsx ../../scripts/ensure-es-compatible-imports.ts
 */

import * as fs from 'fs';
import * as path from 'path';

function addJsExtensionToImports(dir: string): void {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Recursively process subdirectories
      addJsExtensionToImports(fullPath);
    } else if (file.endsWith('.ts')) {
      // Fix imports in .ts files
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Fix all relative import/export statements to include .js extension
      // Match import/export statements that use `from "..."`, including:
      // - import ... from './path'
      // - export { ... } from './path'
      // - export * as ns from './path'
      // - export * from './path'
      const importExportRegex =
        /((?:import|export)(?:\s+type)?\s*(?:\{\s*[^}]*\}\s*|\*\s*as\s+\w+|\*|\w+)?\s*from\s+['"])([^'"]*?)(['"])/g;

      content = content.replace(
        importExportRegex,
        (match, prefix, importPath, quote) => {
          // The relative modules are: './', '../', '.', or '..'
          const isRelative =
            importPath.startsWith('./') ||
            importPath.startsWith('../') ||
            importPath === '.' ||
            importPath === '..';
          if (!isRelative) {
            // Skip external modules
            return match;
          }

          // Skip if already has extension
          if (importPath.endsWith('.js') || importPath.endsWith('.mjs')) {
            return match;
          }

          // Check if it's a directory with index.ts
          const resolvedPath = path.resolve(path.dirname(fullPath), importPath);
          const indexPath = path.join(resolvedPath, 'index.ts');

          if (
            fs.existsSync(resolvedPath) &&
            fs.statSync(resolvedPath).isDirectory()
          ) {
            if (fs.existsSync(indexPath)) {
              modified = true;
              return `${prefix}${importPath}/index.js${quote}`;
            }
          } else {
            // Check if it's a file without extension
            const filePath = `${resolvedPath}.ts`;
            if (fs.existsSync(filePath)) {
              modified = true;
              return `${prefix}${importPath}.js${quote}`;
            }
          }

          return match;
        },
      );

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(
          `Fixed source imports in: ${path.relative(process.cwd(), fullPath)}`,
        );
      }
    }
  }
}

// Get the calling package directory (where the script is run from)
const packageDir = process.cwd();
const packageName = path.basename(packageDir);
const packageJsonPath = path.join(packageDir, 'package.json');
const srcDir = path.join(packageDir, 'src');
if (!fs.existsSync(packageJsonPath)) {
  console.log(
    `❌ No package.json found in the current directory (${packageDir}). Please run this script from a package directory.`,
  );
  process.exit(1);
}

if (fs.existsSync(srcDir)) {
  console.log(`🔧 Fixing TypeScript source imports for ${packageName}...`);
  addJsExtensionToImports(srcDir);
  console.log(`✅ Source import fix complete for ${packageName}!`);
} else {
  console.log(`❌ Source directory not found for ${packageName}.`);
  process.exit(1);
}
