const committeeTypeLabels: Record<string, string> = {
  C: "Communication cost committee",
  D: "Delegate committee",
  E: "Electioneering communication committee",
  H: "House campaign committee",
  I: "Independent expenditure-only committee",
  N: "PAC - nonqualified",
  O: "Independent expenditure committee",
  P: "Presidential campaign committee",
  Q: "PAC - qualified",
  S: "Senate campaign committee",
  U: "Single-candidate independent expenditure committee",
  V: "Hybrid PAC",
  W: "National party committee",
  X: "Non-party, nonqualified committee",
  Y: "Party committee",
  Z: "National party nonfederal account",
};

const designationLabels: Record<string, string> = {
  A: "Authorized by a candidate",
  B: "Lobbyist/registrant PAC",
  D: "Delegate committee",
  J: "Joint fundraising committee",
  P: "Principal campaign committee",
  U: "Unauthorized committee",
};

export function committeeTypeLabel(code?: string | null) {
  if (!code) return "Not reported by FEC";
  const normalized = code.trim().toUpperCase();
  return committeeTypeLabels[normalized] ?? `FEC type ${normalized}`;
}

export function committeeDesignationLabel(code?: string | null) {
  if (!code) return "Not reported by FEC";
  const normalized = code.trim().toUpperCase();
  return designationLabels[normalized] ?? `FEC designation ${normalized}`;
}

export function committeeContext({
  candidateId,
  designation,
  discoveredVia,
}: {
  candidateId?: string | null;
  designation?: string | null;
  discoveredVia?: string | null;
}) {
  if (candidateId) return "Candidate-linked committee";
  if (discoveredVia === "schedule_e") return "Discovered through Schedule E outside-spending records";
  if (designation?.toUpperCase() === "U") return "Unauthorized committee; no direct candidate linkage in this database";
  return "No direct candidate linkage in this database";
}
