// Major Indian cities for city selection dropdown
export const INDIAN_CITIES = [
  'Ahmedabad',
  'Bengaluru',
  'Bhopal',
  'Chandigarh',
  'Chennai',
  'Coimbatore',
  'Delhi',
  'Hyderabad',
  'Jaipur',
  'Kochi',
  'Kolkata',
  'Lucknow',
  'Mumbai',
  'Pune',
  'Surat',
] as const;

export type IndianCity = typeof INDIAN_CITIES[number];

export const CITY_OPTIONS = INDIAN_CITIES.map((city) => ({
  value: city,
  label: city,
}));
