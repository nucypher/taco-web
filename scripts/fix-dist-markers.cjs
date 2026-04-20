const fs = require('fs');
const path = require('path');

const packages = ['shared', 'taco', 'pre', 'taco-auth', 'test-utils'];

for (const pkg of packages) {
  const esDir = path.join(__dirname, '..', 'packages', pkg, 'dist', 'es');
  const cjsDir = path.join(__dirname, '..', 'packages', pkg, 'dist', 'cjs');

  if (fs.existsSync(esDir)) {
    fs.writeFileSync(path.join(esDir, 'package.json'), '{"type":"module"}\n');
  }
  if (fs.existsSync(cjsDir)) {
    fs.writeFileSync(path.join(cjsDir, 'package.json'), '{"type":"commonjs"}\n');
  }
}

console.log('Dist marker package.json files created.');
