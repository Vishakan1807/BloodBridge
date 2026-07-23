import * as XLSX from 'xlsx';
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

  // Substring match only if clean search term is at least 4 characters
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

// ── Universal Spreadsheet & CSV Parser using XLSX ─────────────
export async function parseSpreadsheetFile(file: File): Promise<ParsedHospitalImportRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  // Parse into 2D string matrix
  const matrix = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: false, defval: '' });

  const cleanMatrix: string[][] = matrix
    .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell || '').trim()) : []))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (cleanMatrix.length === 0) return [];

  return processMatrixToHospitalRows(cleanMatrix);
}

export function processMatrixToHospitalRows(rawRows: string[][]): ParsedHospitalImportRow[] {
  if (rawRows.length === 0) return [];

  // Determine if Row 0 is Header
  const firstRowLower = rawRows[0].map((c) => c.toLowerCase());
  const hasHeaderKeywords = firstRowLower.some((h) =>
    ['hospital', 'camp', 'name', 'district', 'city', 'location', 'address', 'phone', 'contact'].some((kw) =>
      h.includes(kw),
    ),
  );

  let nameIdx = -1;
  let districtIdx = -1;
  let addressIdx = -1;
  let phoneIdx = -1;

  let dataRows: string[][] = [];

  if (hasHeaderKeywords) {
    nameIdx = firstRowLower.findIndex((h) =>
      ['hospital name', 'camp name', 'name', 'hospital', 'camp', 'facility', 'institution'].includes(h),
    );
    districtIdx = firstRowLower.findIndex((h) =>
      ['district', 'city', 'location', 'district (main)', 'district name', 'state district'].includes(h),
    );
    addressIdx = firstRowLower.findIndex((h) =>
      ['address', 'hospital address', 'camp address', 'street', 'location address'].includes(h),
    );
    phoneIdx = firstRowLower.findIndex((h) =>
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
    dataRows = rawRows.slice(1);
  } else {
    dataRows = rawRows;
  }

  // Fallbacks if not uniquely identified
  if (nameIdx === -1) nameIdx = 0;
  if (districtIdx === -1) districtIdx = 1;
  if (addressIdx === -1) addressIdx = 2;
  if (phoneIdx === -1) phoneIdx = 3;

  return dataRows.map((row) => {
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
