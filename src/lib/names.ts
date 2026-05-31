const removableTokens = new Set(["MR", "MRS", "MS", "DR"]);

export function displayCandidateName(name?: string | null) {
  if (!name) return name;
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const parts = trimmed.includes(",")
    ? [...trimmed.split(",").slice(1).join(" ").split(/\s+/), trimmed.split(",")[0]]
    : trimmed.split(/\s+/);
  return parts
    .map((part) => part.trim())
    .filter((part) => part && !removableTokens.has(part.replaceAll(".", "").toUpperCase()))
    .map(titleNamePart)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleNamePart(part: string) {
  if (part.startsWith("(") && part.endsWith(")")) return part;
  return part
    .split("-")
    .map((piece) => piece ? piece[0].toUpperCase() + piece.slice(1).toLowerCase() : piece)
    .join("-");
}
