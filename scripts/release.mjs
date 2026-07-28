#!/usr/bin/env node
// Builds the extension once, then assembles a clean per-browser folder for each
// target: dist-chrome/ and dist-firefox/, each containing exactly one manifest.json
// (synced to package.json's version). Optionally zips each for store upload.
//
//   node scripts/release.mjs                 # build + zip both targets
//   node scripts/release.mjs --target chrome # one target only
//   node scripts/release.mjs --no-zip        # skip the zips

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, cpSync, existsSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const staging = resolve(root, 'dist');

/** Source manifest per target, relative to public/. */
const TARGETS = {
  chrome: 'manifest-chrome.json',
  firefox: 'manifest-firefox.json',
};

/** dist/ files that must never land in a release folder — every target gets a
 * single manifest.json instead, written below. */
const MANIFEST_FILES = new Set([
  'manifest.json',
  'manifest-chrome.json',
  'manifest-firefox.json',
]);

function parseArgs(argv) {
  const args = { target: null, zip: true };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--no-zip') {
      args.zip = false;
    } else if (argv[i] === '--target') {
      args.target = argv[++i];
    }
  }
  if (args.target && !(args.target in TARGETS)) {
    throw new Error(
      `Unknown target "${args.target}" — expected one of: ${Object.keys(TARGETS).join(', ')}`,
    );
  }
  return args;
}

function run(command) {
  execSync(command, { cwd: root, stdio: 'inherit' });
}

/** Content build empties dist/ and copies public/; the background build appends. */
function build() {
  run('npx vite build');
  run('npx vite build --config vite.background.config.js');
}

/** Write the target's manifest with its version pinned to package.json. */
function writeManifest(outDir, source, version) {
  const manifest = JSON.parse(
    readFileSync(resolve(root, 'public', source), 'utf8'),
  );
  manifest.version = version;
  writeFileSync(
    resolve(outDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
}

function assemble(target, version, zip) {
  const outDir = resolve(root, `dist-${target}`);
  rmSync(outDir, { recursive: true, force: true });
  cpSync(staging, outDir, {
    recursive: true,
    filter: (src) => !MANIFEST_FILES.has(basename(src)),
  });
  writeManifest(outDir, TARGETS[target], version);

  if (zip) {
    const archive = resolve(root, `dist-${target}.zip`);
    rmSync(archive, { force: true });
    try {
      // Zip the folder's contents so manifest.json sits at the archive root.
      execSync(`zip -r -FS "${archive}" .`, { cwd: outDir, stdio: 'inherit' });
    } catch {
      console.warn(
        `\n[release] Could not create ${basename(archive)} — is the "zip" CLI installed? Folder is still ready at dist-${target}/.`,
      );
    }
  }

  console.log(`[release] ${target} → dist-${target}/${zip ? ` (+ dist-${target}.zip)` : ''}`);
}

const args = parseArgs(process.argv.slice(2));
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

build();
if (!existsSync(staging)) {
  throw new Error('Build produced no dist/ — aborting.');
}

const targets = args.target ? [args.target] : Object.keys(TARGETS);
for (const target of targets) {
  assemble(target, version, args.zip);
}
