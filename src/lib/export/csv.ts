export function csvCell(value: string | number | null) {
  if (value === null) return "";
  if (typeof value === "number") return String(value);
  const text = neutralizeSpreadsheetFormula(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function neutralizeSpreadsheetFormula(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}
