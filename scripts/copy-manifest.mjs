import { copyFile } from 'node:fs/promises';

const target = process.argv[2] ?? 'chrome';
const source = new URL(`../public/manifest-${target}.json`, import.meta.url);
const destination = new URL('../dist/manifest.json', import.meta.url);

await copyFile(source, destination);
