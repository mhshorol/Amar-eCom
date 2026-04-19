import fs from 'fs';

let content = fs.readFileSync('src/components/InvoiceTemplates.tsx', 'utf8');

// Replace greys with black
content = content.replace(/text-\[#666666\]/g, 'text-[#000000]');
content = content.replace(/text-\[#444444\]/g, 'text-[#000000]');
content = content.replace(/text-\[#333333\]/g, 'text-[#000000]');
content = content.replace(/text-\[#999999\]/g, 'text-[#000000]');

fs.writeFileSync('src/components/InvoiceTemplates.tsx', content);
console.log('done');
