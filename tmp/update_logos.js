const fs = require('fs');
const filepath = 'src/components/Logistics.tsx';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(
  /<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-inner flex items-center justify-center text-white font-bold text-2xl ring-4 ring-blue-50">S<\/div>/g,
  `<div className="w-14 h-14 rounded-xl bg-white shadow-inner border border-gray-100 flex items-center justify-center ring-4 ring-gray-50 overflow-hidden shrink-0">
                    <img src="/logos/steadfast.jpg" alt="Steadfast Courier" className="w-full h-full object-contain p-0.5" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://ui-avatars.com/api/?name=Steadfast&background=0052CC&color=fff&size=128' }} />
                  </div>`
);

content = content.replace(
  /<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 shadow-inner flex items-center justify-center text-white font-bold text-2xl ring-4 ring-orange-50">P<\/div>/g,
  `<div className="w-14 h-14 rounded-xl bg-white shadow-inner border border-gray-100 flex items-center justify-center ring-4 ring-gray-50 overflow-hidden shrink-0">
                    <img src="/logos/pathao.jpg" alt="Pathao Courier" className="w-full h-full object-contain p-0.5" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://ui-avatars.com/api/?name=Pathao&background=FF5A00&color=fff&size=128' }} />
                  </div>`
);

content = content.replace(
  /<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 shadow-inner flex items-center justify-center text-white font-bold text-2xl ring-4 ring-red-50">R<\/div>/g,
  `<div className="w-14 h-14 rounded-xl bg-white shadow-inner border border-gray-100 flex items-center justify-center ring-4 ring-gray-50 overflow-hidden shrink-0">
                    <img src="/logos/redx.png" alt="RedX" className="w-full h-full object-contain p-0.5" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://ui-avatars.com/api/?name=RedX&background=E50914&color=fff&size=128' }} />
                  </div>`
);

content = content.replace(
  /<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-inner flex items-center justify-center text-white font-bold text-2xl ring-4 ring-yellow-50">C<\/div>/g,
  `<div className="w-14 h-14 rounded-xl bg-white shadow-inner border border-gray-100 flex items-center justify-center ring-4 ring-gray-50 overflow-hidden shrink-0">
                    <img src="/logos/carrybee.png" alt="Carrybee" className="w-full h-full object-contain p-0.5" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://ui-avatars.com/api/?name=Carrybee&background=FFB300&color=fff&size=128' }} />
                  </div>`
);

content = content.replace(
  /<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-inner flex items-center justify-center text-white font-bold text-2xl ring-4 ring-indigo-50">P<\/div>/g,
  `<div className="w-14 h-14 rounded-xl bg-white shadow-inner border border-gray-100 flex items-center justify-center ring-4 ring-gray-50 overflow-hidden shrink-0">
                    <img src="/logos/paperfly.jpg" alt="Paperfly" className="w-full h-full object-contain p-0.5" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://ui-avatars.com/api/?name=Paperfly&background=3F51B5&color=fff&size=128' }} />
                  </div>`
);

fs.writeFileSync(filepath, content);
console.log('Logos updated successfully');
