const fs = require('fs');
const path = require('path');

const packageNames = ['shared', 'taco', 'pre', 'taco-auth', 'test-utils'];

const writeMarkerFiles = (packageDir) => {
  const esDir = path.join(packageDir, 'dist', 'es');
  const cjsDir = path.join(packageDir, 'dist', 'cjs');

  if (fs.existsSync(esDir)) {
    fs.writeFileSync(path.join(esDir, 'package.json'), '{"type":"module"}\n');
  }
  if (fs.existsSync(cjsDir)) {
    fs.writeFileSync(path.join(cjsDir, 'package.json'), '{"type":"commonjs"}\n');
  }
};

const targets = process.argv.slice(2);

if (targets.length > 0) {
  for (const target of targets) {
    writeMarkerFiles(path.resolve(process.cwd(), target));
  }
} else {
  for (const packageName of packageNames) {
    writeMarkerFiles(path.join(__dirname, '..', 'packages', packageName));
  }
}

console.log('Dist marker package.json files created.');
