import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

const zip = new AdmZip();
const rootDir = process.cwd();

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', '.vercel', 'coverage', '.cache']);
const EXCLUDE_FILES = new Set(['.DS_Store', 'waves-project.zip']);

function addDirectory(dirPath, zipPath = '') {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    const relZipPath = zipPath ? `${zipPath}/${item.name}` : item.name;

    if (item.isDirectory()) {
      if (!EXCLUDE_DIRS.has(item.name)) {
        addDirectory(fullPath, relZipPath);
      }
    } else if (item.isFile()) {
      if (!EXCLUDE_FILES.has(item.name)) {
        zip.addLocalFile(fullPath, zipPath);
      }
    }
  }
}

console.log('Packing project into ZIP file...');
addDirectory(rootDir);

const outputPath = path.join(rootDir, 'public', 'waves-project.zip');
zip.writeZip(outputPath);

const stats = fs.statSync(outputPath);
console.log(`Successfully generated public/waves-project.zip (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
