const BUSINESS_SUFFIXES = [
  "LLC",
  "INC",
  "INCORPORATED",
  "CO",
  "COMPANY",
  "CORP",
  "CORPORATION",
  "LP",
  "LTD",
  "PLLC",
];

const SALUTATIONS = ["MR", "MRS", "MS", "MISS", "DR"];

export function normalizeDonorName(raw: string) {
  return normalizeEntity(raw, { dropSalutations: true });
}

export function normalizeEmployer(raw: string) {
  return normalizeEntity(raw, { dropSalutations: false });
}

function normalizeEntity(raw: string, options: { dropSalutations: boolean }) {
  let value = raw
    .toUpperCase()
    .replaceAll("&", " AND ")
    .replace(/[.,;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (options.dropSalutations) {
    const pattern = new RegExp(`^(${SALUTATIONS.join("|")})\\.?\\s+`);
    value = value.replace(pattern, "");
  }

  for (const suffix of BUSINESS_SUFFIXES) {
    value = value.replace(new RegExp(`\\s+${suffix}\\.?$`), "");
  }

  return value.replace(/[.,;:]+$/g, "").replace(/\s+/g, " ").trim();
}
