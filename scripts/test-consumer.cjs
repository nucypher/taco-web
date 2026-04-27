const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const mode = process.argv[2];

if (mode !== 'esm' && mode !== 'cjs') {
  console.error('Usage: node scripts/test-consumer.cjs <esm|cjs>');
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, '..');
const packageNames = ['shared', 'taco-auth', 'taco'];
const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), `taco-web-${mode}-consumer-`),
);
const fixtureDir = path.join(tempRoot, 'fixture');

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed with exit code ${result.status}`,
    );
  }

  return result.stdout;
};

const packPackage = (packageName) => {
  const packageDir = path.join(repoRoot, 'packages', packageName);
  const output = run('pnpm', ['pack'], packageDir);
  const tarballName = output
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.endsWith('.tgz'))
    .at(-1);

  if (!tarballName) {
    throw new Error(`Could not determine tarball name for ${packageName}`);
  }

  const sourceTarball = path.join(packageDir, tarballName);
  const targetTarball = path.join(tempRoot, tarballName);
  fs.renameSync(sourceTarball, targetTarball);
  return targetTarball;
};

const writeFixtureFiles = (tarballs) => {
  fs.mkdirSync(fixtureDir, { recursive: true });

  const packageJson = {
    name: `consumer-smoke-${mode}`,
    private: true,
    type: mode === 'esm' ? 'module' : 'commonjs',
    dependencies: {
      '@nucypher/taco': `file:${tarballs.taco}`,
    },
    pnpm: {
      overrides: {
        '@nucypher/shared': `file:${tarballs.shared}`,
        '@nucypher/taco-auth': `file:${tarballs['taco-auth']}`,
      },
    },
  };

  fs.writeFileSync(
    path.join(fixtureDir, 'package.json'),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );

  const entryFileName = mode === 'esm' ? 'index.js' : 'index.cjs';
  const entryContent =
    mode === 'esm'
      ? [
          "import { conditions, decrypt, encrypt } from '@nucypher/taco';",
          '',
          "if (typeof encrypt !== 'function') throw new Error('encrypt export missing');",
          "if (typeof decrypt !== 'function') throw new Error('decrypt export missing');",
          "if (typeof conditions !== 'object') throw new Error('conditions export missing');",
          '',
          "console.log('ESM consumer smoke test passed');",
          '',
        ].join('\n')
      : [
          "const { conditions, decrypt, encrypt } = require('@nucypher/taco');",
          '',
          "if (typeof encrypt !== 'function') throw new Error('encrypt export missing');",
          "if (typeof decrypt !== 'function') throw new Error('decrypt export missing');",
          "if (typeof conditions !== 'object') throw new Error('conditions export missing');",
          '',
          "console.log('CJS consumer smoke test passed');",
          '',
        ].join('\n');

  fs.writeFileSync(path.join(fixtureDir, entryFileName), entryContent);
  return entryFileName;
};

try {
  if (!process.env.RUNNING_IN_CI) {
    // only run the build step locally since CI will have already built the packages
    run('pnpm', ['build'], repoRoot);
  }

  const tarballs = Object.fromEntries(
    packageNames.map((packageName) => [packageName, packPackage(packageName)]),
  );
  const entryFileName = writeFixtureFiles(tarballs);

  run('pnpm', ['install'], fixtureDir);
  run('node', [entryFileName], fixtureDir);

  fs.rmSync(tempRoot, { recursive: true, force: true });
} catch (error) {
  console.error(`Consumer smoke test failed. Temporary files kept at: ${tempRoot}`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}