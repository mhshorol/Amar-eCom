const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src/components');
files.push('./src/services/woocommerceService.ts');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Pattern 1: `await response.json()` -> safe parse
  if (content.includes('await response.json()')) {
    content = content.replace(/await response\.json\(\)/g, "await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')))");
    changed = true;
  }
  if (content.includes('await wooResponse.json()')) {
    content = content.replace(/await wooResponse\.json\(\)/g, "await (wooResponse.headers.get('content-type')?.includes('json') ? wooResponse.json() : Promise.reject(new Error('Invalid non-JSON response from server.')))");
    changed = true;
  }
  if (content.includes('await citiesRes.json()')) {
    content = content.replace(/await citiesRes\.json\(\)/g, "await (citiesRes.headers.get('content-type')?.includes('json') ? citiesRes.json() : Promise.reject(new Error('Invalid non-JSON response.')))");
    changed = true;
  }
  if (content.includes('await zonesRes.json()')) {
    content = content.replace(/await zonesRes\.json\(\)/g, "await (zonesRes.headers.get('content-type')?.includes('json') ? zonesRes.json() : Promise.reject(new Error('Invalid non-JSON response.')))");
    changed = true;
  }
  if (content.includes('await areasRes.json()')) {
    content = content.replace(/await areasRes\.json\(\)/g, "await (areasRes.headers.get('content-type')?.includes('json') ? areasRes.json() : Promise.reject(new Error('Invalid non-JSON response.')))");
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
