import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = new URL('../dist/', import.meta.url);
const requiredMarkers = ['ɵfac', 'ɵprov'];
const serviceDir = new URL('./services/', distDir);

const files = (await readdir(serviceDir)).filter(
  file => file.endsWith('.service.js') && !file.endsWith('.service.js.map')
);

if (files.length === 0) {
  throw new Error('No compiled service files found in dist/services.');
}

for (const file of files) {
  const fileUrl = new URL(file, serviceDir);
  const contents = await readFile(fileUrl, 'utf8');
  const missingMarkers = requiredMarkers.filter(marker => !contents.includes(marker));

  if (missingMarkers.length > 0) {
    throw new Error(
      `Compiled Angular metadata missing from ${path.posix.join('dist/services', file)}: ${missingMarkers.join(', ')}`
    );
  }
}

console.log(`Verified Angular metadata in ${files.length} compiled service files.`);
