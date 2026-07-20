export interface BloodGroupConfig {
  value:       string;
  label:       string;
  category:    'standard' | 'rare' | 'ultra_rare';
  description: string;
}

export const CLINICAL_BLOOD_GROUPS: BloodGroupConfig[] = [
  // Standard ABO & Rh System
  { value: 'O+',  label: 'O Positive (O+)',   category: 'standard',   description: 'Universal red cell donor for positive types' },
  { value: 'O-',  label: 'O Negative (O-)',   category: 'standard',   description: 'Universal red cell donor' },
  { value: 'A+',  label: 'A Positive (A+)',   category: 'standard',   description: 'Common ABO group' },
  { value: 'A-',  label: 'A Negative (A-)',   category: 'standard',   description: 'Rh negative ABO group' },
  { value: 'B+',  label: 'B Positive (B+)',   category: 'standard',   description: 'Common ABO group' },
  { value: 'B-',  label: 'B Negative (B-)',   category: 'standard',   description: 'Rh negative ABO group' },
  { value: 'AB+', label: 'AB Positive (AB+)', category: 'standard',   description: 'Universal plasma donor / recipient' },
  { value: 'AB-', label: 'AB Negative (AB-)', category: 'standard',   description: 'Rare ABO group' },

  // Subgroups & Rare Phenotypes (Real-World Clinical Extension)
  { value: 'A1+',    label: 'A1 Positive (A1+)',    category: 'rare',       description: 'A subgroup phenotype' },
  { value: 'A1-',    label: 'A1 Negative (A1-)',    category: 'rare',       description: 'A subgroup Rh negative phenotype' },
  { value: 'A2+',    label: 'A2 Positive (A2+)',    category: 'rare',       description: 'A2 subgroup phenotype' },
  { value: 'A2-',    label: 'A2 Negative (A2-)',    category: 'rare',       description: 'A2 subgroup Rh negative' },
  { value: 'A1B+',   label: 'A1B Positive (A1B+)',  category: 'rare',       description: 'A1B subgroup phenotype' },
  { value: 'A1B-',   label: 'A1B Negative (A1B-)',  category: 'rare',       description: 'A1B subgroup Rh negative' },

  // Ultra-Rare Life-Saving Phenotypes
  { value: 'Bombay', label: 'Bombay Blood Group (hh / Oh)', category: 'ultra_rare', description: 'Extremely rare phenotype lacking H antigen' },
  { value: 'Rh-null',label: 'Rh-null (Golden Blood)',       category: 'ultra_rare', description: 'Universal donor for all Rh-deficient patients' },
];
