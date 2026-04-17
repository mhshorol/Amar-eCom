const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  try {
    const rawDivisions = await fetchJSON('https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/divisions/divisions.json');
    const rawDistricts = await fetchJSON('https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/districts/districts.json');
    const rawUpazilas = await fetchJSON('https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/upazilas/upazilas.json');
    
    const divisions = rawDivisions[2].data.map(d => ({
        id: d.id,
        nameEn: d.name,
        nameBn: d.bn_name,
        type: 'division'
    }));

    const districts = rawDistricts[2].data.map(d => ({
        id: d.id,
        nameEn: d.name,
        nameBn: d.bn_name,
        type: 'district',
        divisionId: d.division_id
    }));

    const upazilas = rawUpazilas[2].data.map(u => ({
        id: u.id,
        nameEn: u.name,
        nameBn: u.bn_name,
        type: 'upazila',
        districtId: u.district_id,
        divisionId: districts.find(d => d.id === u.district_id)?.divisionId || ''
    }));

    const tsContent = `export interface LocationNode {
  id: string;
  nameEn: string;
  nameBn: string;
  type: 'division' | 'district' | 'upazila' | 'area';
  divisionId?: string;
  districtId?: string;
  upazilaId?: string;
}

export const divisions: LocationNode[] = ${JSON.stringify(divisions, null, 2)};

export const districts: LocationNode[] = ${JSON.stringify(districts, null, 2)};

export const upazilas: LocationNode[] = ${JSON.stringify(upazilas, null, 2)};

export const allLocations: LocationNode[] = [
  ...divisions,
  ...districts,
  ...upazilas
];
`;

    fs.writeFileSync(path.join(__dirname, 'src/data/bangladesh-locations.ts'), tsContent, 'utf-8');
    console.log("Successfully generated src/data/bangladesh-locations.ts");

  } catch (e) {
    console.error("Error:", e.message);
  }
}
run();
