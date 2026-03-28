#!/usr/bin/env node
// Post-build script: add .js extensions to relative imports in ESM output
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

function processDir(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      processDir(full);
    } else if (entry.endsWith('.js')) {
      let src = readFileSync(full, 'utf8');
      // Add .js to relative imports/exports that lack an extension
      const fixed = src.replace(/(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g, (match, p1, p2, p3) => {
        if (/\.[a-z]+$/.test(p2)) return match; // already has extension
        return `${p1}${p2}.js${p3}`;
      });
      if (fixed !== src) writeFileSync(full, fixed, 'utf8');
    }
  }
}

processDir(distDir);
console.log('Added .js extensions to relative imports in dist/');
