const fs = require('fs');
const path = require('path');

console.log('\nStarting file copy process...\n');

// Create dist directory structure
const distDir = path.join(__dirname, 'dist', 'nodes', 'CsvNormalizer');
const srcDir = path.join(__dirname, 'nodes', 'CsvNormalizer');

console.log(`Source directory: ${srcDir}`);
console.log(`Destination directory: ${distDir}\n`);

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log('Created dist directory\n');
}

// Files to copy
const filesToCopy = [
  'csvnormalizer.svg',
  'CsvNormalizer.node.json'
];

let successCount = 0;
let failCount = 0;

filesToCopy.forEach(fileName => {
  const srcPath = path.join(srcDir, fileName);
  const destPath = path.join(distDir, fileName);
  
  if (fs.existsSync(srcPath)) {
    try {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${fileName}`);
      successCount++;
    } catch (error) {
      console.error(`Failed to copy ${fileName}: ${error.message}`);
      failCount++;
    }
  } else {
    console.warn(`File not found: ${fileName}`);
    console.warn(`Expected at: ${srcPath}`);
    failCount++;
  }
});

// Verify all files in dist
console.log('\nFiles in dist directory:');
const distFiles = fs.readdirSync(distDir);
distFiles.forEach(file => {
  const filePath = path.join(distDir, file);
  const stats = fs.statSync(filePath);
  const size = stats.isFile() ? `(${stats.size} bytes)` : '(directory)';
  console.log(`  - ${file} ${size}`);
});

console.log(`\nSuccessfully copied: ${successCount} files`);
if (failCount > 0) {
  console.log(`Failed: ${failCount} files`);
}
console.log('\n');