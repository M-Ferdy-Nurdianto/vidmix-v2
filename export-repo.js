const fs = require('fs');
const path = require('path');

const EXCLUDE_DIRS = ['node_modules', 'dist', 'dist-electron', '.git', '.gemini', 'public', 'assets'];
const INCLUDE_EXTS = ['.js', '.jsx', '.css', '.html', '.json', '.md'];

let fileContents = '';
let treeOutput = 'Directory Structure:\n';

function generateTree(dir, prefix = '') {
  const files = fs.readdirSync(dir);
  const filtered = files.filter(f => !EXCLUDE_DIRS.includes(f));
  
  filtered.forEach((name, index) => {
    const filePath = path.join(dir, name);
    const isLast = index === filtered.length - 1;
    const stat = fs.statSync(filePath);
    
    treeOutput += `${prefix}${isLast ? '└── ' : '├── '}${name}\n`;
    
    if (stat.isDirectory()) {
      generateTree(filePath, prefix + (isLast ? '    ' : '│   '));
    }
  });
}

function processFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const name of files) {
    if (EXCLUDE_DIRS.includes(name)) continue;
    const filePath = path.join(dir, name);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile()) {
      const ext = path.extname(name).toLowerCase();
      // Skip very large or irrelevant files
      if (INCLUDE_EXTS.includes(ext) && !name.includes('package-lock') && name !== 'repo-context.txt') {
        fileContents += `\n\n================================================\n`;
        fileContents += `FILE: ${path.relative(__dirname, filePath).replace(/\\/g, '/')}\n`;
        fileContents += `================================================\n\n`;
        try {
          fileContents += fs.readFileSync(filePath, 'utf8');
        } catch (e) {
          fileContents += `[Error reading file]\n`;
        }
      }
    } else if (stat.isDirectory()) {
      processFiles(filePath);
    }
  }
}

console.log('Generating repo structure...');
generateTree(__dirname);

console.log('Reading source code files...');
processFiles(__dirname);

const finalOutput = `This is an export of the Vidmix v2 repository context for AI Assistant analysis.\n\n${treeOutput}\n\n--- SOURCE CODE ---\n${fileContents}`;

fs.writeFileSync('repo-context.txt', finalOutput, 'utf8');
console.log('✅ Done! File "repo-context.txt" has been created.');
console.log('You can now upload "repo-context.txt" to Claude or ChatGPT to give them the full context of this project.');
