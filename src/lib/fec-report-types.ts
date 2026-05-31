const reportTypeLabels: Record<string, string> = {
  Q1: "April quarterly report",
  Q1S: "April quarterly report",
  Q2: "July quarterly report",
  Q2S: "July quarterly report",
  Q3: "October quarterly report",
  Q3S: "October quarterly report",
  YE: "year-end report",
  YES: "year-end report",
  TER: "termination report",
  "12P": "pre-primary report",
  "12G": "pre-general report",
  "30G": "post-general report",
};

const reportTypeDisplayLabels: Record<string, string> = {
  Q1: "April quarterly",
  Q1S: "April quarterly",
  Q2: "July quarterly",
  Q2S: "July quarterly",
  Q3: "October quarterly",
  Q3S: "October quarterly",
  YE: "Year-end",
  YES: "Year-end",
  TER: "Termination",
  "12P": "Pre-primary",
  "12G": "Pre-general",
  "30G": "Post-general",
};

export function reportTypePhrase(reportType?: string | null) {
  if (!reportType) return "a new report";
  const normalized = reportType.toUpperCase();
  const label = reportTypeLabels[normalized];
  if (!label) return `FEC report type ${normalized}`;
  return `${articleFor(label)} ${label} (FEC type ${normalized})`;
}

export function reportTypeDisplay(reportType?: string | null) {
  if (!reportType) return "Report";
  const normalized = reportType.toUpperCase();
  const label = reportTypeDisplayLabels[normalized];
  if (!label) return `FEC report type ${normalized}`;
  return `${label} (${normalized})`;
}

function articleFor(label: string) {
  return /^[aeiou]/i.test(label) ? "an" : "a";
}
