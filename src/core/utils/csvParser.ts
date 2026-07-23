import { INDIAN_CITIES } from '@/core/constants/indianCities';

export interface ParsedHospitalImportRow {
  name: string;
  district: string;
  address: string;
  phone: string;
  status: 'valid' | 'warning' | 'error';
  statusMessage?: string;
}

// ── Normalize District String to Tamil Nadu 38 Districts ─────
export function normalizeDistrict(rawDistrict: string): { district: string; isExact: boolean } {
  if (!rawDistrict || !rawDistrict.trim()) {
    return { district: '', isExact: false };
  }

  const trimmed = rawDistrict.trim();
  const clean = trimmed
    .toLowerCase()
    .replace(/\s+(district|dt|dist)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

  if (!clean) {
    return { district: '', isExact: false };
  }

  // Exact match search
  for (const city of INDIAN_CITIES) {
    const cityClean = city.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cityClean === clean) {
      return { district: city, isExact: true };
    }
  }

  // Alias mapping for common Tamil Nadu short names
  const aliasMap: Record<string, string> = {
    trichy: 'Tiruchirappalli',
    tiruchirapalli: 'Tiruchirappalli',
    kovai: 'Coimbatore',
    tuti: 'Thoothukudi',
    tuticorin: 'Thoothukudi',
    kanchi: 'Kancheepuram',
    kanchipuram: 'Kancheepuram',
    tanjore: 'Thanjavur',
    ramnad: 'Ramanathapuram',
    nagercoil: 'Kanyakumari',
    ooty: 'Nilgiris',
    nilgiri: 'Nilgiris',
    tiruvarur: 'Tiruvarur',
    thiruvarur: 'Tiruvarur',
    tirunelveli: 'Tirunelveli',
    nellai: 'Tirunelveli',
  };

  if (aliasMap[clean]) {
    return { district: aliasMap[clean], isExact: true };
  }

  // Fuzzy match only if clean search term is at least 4 characters
  if (clean.length >= 4) {
    for (const city of INDIAN_CITIES) {
      const cityClean = city.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cityClean.length >= 4 && (cityClean.includes(clean) || clean.includes(cityClean))) {
        return { district: city, isExact: false };
      }
    }
  }

  return { district: trimmed, isExact: false };
}

// ── Robust CSV Delimiter Parser ──────────────────────────────
export function parseCSVRaw(csvContent: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === '\t' || char === ';') && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some((col) => col.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((col) => col.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

// ── Parse Hospital Bulk Import CSV ────────────────────────────
export function parseHospitalCSV(csvText: string): ParsedHospitalImportRow[] {
  const rawRows = parseCSVRaw(csvText);
  if (rawRows.length <= 1) return [];

  const headers = rawRows[0].map((h) => h.toLowerCase().trim());
  const dataRows = rawRows.slice(1);

  // Column Index Detection
  let nameIdx = headers.findIndex((h) =>
    ['hospital name', 'camp name', 'name', 'hospital', 'camp', 'facility', 'institution'].includes(h),
  );
  let districtIdx = headers.findIndex((h) =>
    ['district', 'city', 'location', 'district (main)', 'district name', 'state district'].includes(h),
  );
  let addressIdx = headers.findIndex((h) =>
    ['address', 'hospital address', 'camp address', 'street', 'location address'].includes(h),
  );
  let phoneIdx = headers.findIndex((h) =>
    [
      'contact number',
      'contact',
      'phone',
      'phone number',
      'mobile',
      'landline',
      'contact no',
    ].includes(h),
  );

  // Default standard fallback index order: [Name, District, Address, Phone]
  if (nameIdx === -1) nameIdx = 0;
  if (districtIdx === -1) districtIdx = 1;
  if (addressIdx === -1) addressIdx = 2;
  if (phoneIdx === -1) phoneIdx = 3;

  return dataRows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => {
      const rawName = row[nameIdx] || '';
      const rawDist = row[districtIdx] || '';
      const rawAddr = row[addressIdx] || '';
      const rawPhone = row[phoneIdx] || '';

      const name = rawName.trim();
      const address = rawAddr.trim();
      const phone = rawPhone.trim();
      const { district, isExact } = normalizeDistrict(rawDist);

      let status: 'valid' | 'warning' | 'error' = 'valid';
      let statusMessage = 'Ready for import';

      if (!name) {
        status = 'error';
        statusMessage = 'Name is missing';
      } else if (!district) {
        status = 'error';
        statusMessage = 'District is missing';
      } else if (!isExact && !(INDIAN_CITIES as readonly string[]).includes(district)) {
        status = 'warning';
        statusMessage = `District "${rawDist}" mapped to best match. Please verify.`;
      }

      return {
        name,
        district,
        address,
        phone,
        status,
        statusMessage,
      };
    });
}

// ── Download Sample CSV Template Helper ───────────────────────
export function downloadHospitalCSVTemplate(): void {
  const csvHeaders = 'Hospital Name,District,Address,Contact Number\n';
  const csvRows = [
    'Apollo Specialty Hospital,Chennai,Greams Road Thousand Lights,044-28290000',
    'Govt Rajaji Hospital,Madurai,Panagal Road Goripalayam,0452-2532535',
    'PSG Super Speciality Hospital,Coimbatore,Peelamedu Avinashi Road,0422-2570170',
    'Kauvery Hospital,Tiruchirappalli,No 1 KC Road Tennur,0431-4077777',
    'Thanjavur Medical College Hospital,Thanjavur,Medical College Road,04362-240024',
  ].join('\n');

  const blob = new Blob([csvHeaders + csvRows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'Hospital_Bulk_Import_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
