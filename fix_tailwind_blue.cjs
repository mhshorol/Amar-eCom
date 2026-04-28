const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      replaceInDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(/bg-blue-600/g, 'bg-[#0066FF]');
      content = content.replace(/hover:bg-blue-600/g, 'hover:bg-[#0066FF]');
      content = content.replace(/hover:bg-blue-700/g, 'hover:bg-[#0052CC]');
      content = content.replace(/text-blue-600/g, 'text-[#0066FF]');
      content = content.replace(/border-blue-600/g, 'border-[#0066FF]');
      content = content.replace(/ring-blue-600/g, 'ring-[#0066FF]');
      content = content.replace(/shadow-blue-600/g, 'shadow-[#0066FF]');
      fs.writeFileSync(filePath, content);
    }
  }
}

replaceInDir(path.join(process.cwd(), 'src'));
console.log("Updated blue-600 classes");
