import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src/components');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Find <table class="..." > and check if min-w is there.
  // Actually, better to just replace `className="w-full text-left"` and `className="w-full text-left border-collapse"`
  // to ensure they have whitespace-nowrap and min-w-[800px] or something similar.
  const regex = /<table className="([^"]+)"/g;
  content = content.replace(regex, (match, classes) => {
    let newClasses = classes;
    if (!newClasses.includes('min-w-')) {
      newClasses += ' min-w-[800px]';
      changed = true;
    }
    if (!newClasses.includes('whitespace-nowrap') && !newClasses.includes('break-normal')) {
      newClasses += ' whitespace-nowrap';
      changed = true;
    }
    return `<table className="${newClasses}"`;
  });

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated table responsiveness in ${file}`);
  }
});
