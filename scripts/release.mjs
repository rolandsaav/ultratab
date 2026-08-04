import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const targetArg = args.indexOf('--target');
const targets =
  targetArg === -1 ? ['chrome', 'firefox'] : [required(args[targetArg + 1])];
const shouldZip = !args.includes('--no-zip');
const version = JSON.parse(await readFile('package.json', 'utf8')).version;

run('bun', ['x', 'vite', 'build']);
run('bun', ['x', 'vite', 'build', '--config', 'vite.background.config.js']);
run('bun', ['x', 'vite', 'build', '--config', 'vite.palette.config.js']);

for (const target of targets) {
  const out = `dist-${target}`;
  const manifestPath = `public/manifest-${target}.json`;
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  await rm(out, { recursive: true, force: true });
  await rm(`${out}.zip`, { force: true });
  await cp('dist', out, { recursive: true });
  await Promise.all([
    rm(`${out}/manifest.json`, { force: true }),
    rm(`${out}/manifest-chrome.json`, { force: true }),
    rm(`${out}/manifest-firefox.json`, { force: true }),
  ]);
  await writeFile(
    `${out}/manifest.json`,
    `${JSON.stringify({ ...manifest, version }, null, 2)}\n`,
  );

  if (shouldZip) {
    run('bun', [
      'x',
      'web-ext',
      'build',
      '--source-dir',
      out,
      '--artifacts-dir',
      '.',
      '--filename',
      `${out}.zip`,
      '--overwrite-dest',
    ]);
  }

  console.log(`[release] ${target} -> ${out}/`);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    env: { ...process.env, NO_UPDATE_NOTIFIER: '1' },
  });
  if (result.status) process.exit(result.status);
  if (result.error) throw result.error;
}

function required(value) {
  if (value) return value;
  throw new Error('--target needs a value');
}
