const fs = require('fs');
const path = require('path');

const files = [
  'src/components/Layout.tsx',
  'src/components/Suppliers.tsx',
  'src/components/NewProduct.tsx',
  'src/components/Tasks.tsx',
  'src/components/WooCommerceOrders.tsx',
  'src/components/Orders.tsx',
  'src/components/Settings.tsx',
  'src/components/Logistics.tsx',
  'src/components/POS.tsx',
  'src/components/Team.tsx',
  'src/components/OrderDetailsModal.tsx',
  'src/index.css',
  'src/App.tsx'
];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/#00AEEF/gi, '#0066FF');
    content = content.replace(/#0052FF/gi, '#0066FF');
    content = content.replace(/#3B82F6/gi, '#0066FF');
    content = content.replace(/#0095cc/gi, '#0052CC');
    content = content.replace(/#0092c9/gi, '#0052CC');
    content = content.replace(/#0096ce/gi, '#0052CC');
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
