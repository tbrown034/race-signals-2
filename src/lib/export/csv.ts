export function csvCell(value: string | number | null) {
  if (value === null) return "";
  const text = neutralizeSpreadsheetFormula(String(value));
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function neutralizeSpreadsheetFormula(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}
