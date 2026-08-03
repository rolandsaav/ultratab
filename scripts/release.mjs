import { constants } from 'node:fs';
import {
  access,
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, posix, relative, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { deflateRawSync } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const allTargets = ['chrome', 'firefox'];
const CRC_TABLE = new Uint32Array(256);

for (let i = 0; i < CRC_TABLE.length; i += 1) {
  let c = i;
  for (let j = 0; j < 8; j += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

const args = process.argv.slice(2);
let targets = allTargets;
let zip = true;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--target') {
    const target = args[i + 1];
    if (!target) throw new Error('--target needs a value');
    targets = [target];
    i += 1;
  } else if (arg === '--no-zip') {
    zip = false;
  } else {
    throw new Error(`unknown arg: ${arg}`);
  }
}

const packageJson = JSON.parse(
  await readFile(pathFromRoot('package.json'), 'utf8'),
);
const viteBin = pathFromRoot('node_modules/vite/bin/vite.js');

await runNode(viteBin, ['build']);
await runNode(viteBin, ['build', '--config', 'vite.background.config.js']);
await runNode(viteBin, ['build', '--config', 'vite.palette.config.js']);

for (const target of targets) {
  const manifestSource = pathFromRoot(`public/manifest-${target}.json`);
  await ensureFile(manifestSource, `unknown target: ${target}`);

  const outDir = pathFromRoot(`dist-${target}`);
  const outZip = pathFromRoot(`dist-${target}.zip`);

  await rm(outDir, { recursive: true, force: true });
  await rm(outZip, { force: true });
  await cp(pathFromRoot('dist'), outDir, { recursive: true });
  await removeTargetManifests(outDir);
  await writeVersionedManifest(
    manifestSource,
    join(outDir, 'manifest.json'),
    packageJson.version,
  );

  if (zip) await zipDirectory(outDir, outZip);
  console.log(`[release] ${target} -> ${basename(outDir)}/`);
}

async function runNode(script, scriptArgs) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...scriptArgs], {
      cwd: root,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${basename(script)} exited with code ${code}`));
    });
  });
}

function pathFromRoot(path) {
  return join(root, path);
}

async function ensureFile(path, message) {
  try {
    await access(path, constants.F_OK);
  } catch {
    throw new Error(message);
  }
}

async function removeTargetManifests(outDir) {
  const entries = await readdir(outDir);
  await Promise.all(
    entries
      .filter((entry) => /^manifest.*\.json$/.test(entry))
      .map((entry) => rm(join(outDir, entry), { force: true })),
  );
}

async function writeVersionedManifest(source, destination, version) {
  const manifest = JSON.parse(await readFile(source, 'utf8'));
  manifest.version = version;
  await writeFile(destination, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function zipDirectory(sourceDir, destination) {
  const files = await listFiles(sourceDir);
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const data = await readFile(file.absolute);
    const compressed = deflateRawSync(data);
    const crc = crc32(data);
    const name = Buffer.from(file.name, 'utf8');
    const timestamp = dosTimestamp(new Date());

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(timestamp.time, 10);
    local.writeUInt16LE(timestamp.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, name, compressed);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(8, 10);
    header.writeUInt16LE(timestamp.time, 12);
    header.writeUInt16LE(timestamp.date, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(compressed.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt16LE(0, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE(0, 38);
    header.writeUInt32LE(offset, 42);
    central.push(header, name);

    offset += local.length + name.length + compressed.length;
  }

  const centralOffset = offset;
  const centralSize = central.reduce((size, chunk) => size + chunk.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);

  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.concat([...chunks, ...central, eocd]));
}

async function listFiles(rootDir, dir = rootDir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(rootDir, absolute)));
    } else if (entry.isFile()) {
      files.push({
        absolute,
        name: relative(rootDir, absolute).split(sep).join(posix.sep),
      });
    }
  }

  return files.sort((a, b) => a.name.localeCompare(b.name));
}

function dosTimestamp(date) {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}
