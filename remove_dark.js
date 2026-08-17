const fs = require('fs');
const files = ['src/App.jsx', 'src/components/Editor/LayerControlPanel.jsx', 'src/components/Editor/LayerCanvas.jsx'];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');

  // Strip all dark mode classes
  c = c.replace(/dark:bg-[\w\-]+/g, '');
  c = c.replace(/dark:text-[\w\-]+/g, '');
  c = c.replace(/dark:border-[\w\-]+/g, '');
  c = c.replace(/dark:hover:bg-[\w\-]+/g, '');
  c = c.replace(/dark:hover:text-[\w\-]+/g, '');
  c = c.replace(/dark:shadow-[\w\-]+/g, '');
  
  // Clean up extra spaces
  c = c.replace(/ +/g, ' ');
  c = c.replace(/ \"/g, '"');

  fs.writeFileSync(f, c);
});
console.log('Stripped dark classes');
