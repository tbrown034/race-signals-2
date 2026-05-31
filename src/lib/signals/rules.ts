import type { Signal } from "@/src/lib/types";

export function signalRuleLabel(signal: Pick<Signal, "signalType">) {
  if (signal.signalType === "large_independent_expenditure") {
    return "Rule: Schedule E independent expenditure >= $25k; review at $100k.";
  }
  if (signal.signalType === "committee_activity_spike") {
    return "Rule: latest filing receipts >= $50k and at least 2x prior stored filing.";
  }
  if (signal.signalType === "new_filing") {
    return "Rule: current-cycle FEC filing stored; amendments and report periods must be checked.";
  }
  if (signal.signalType === "new_committee") {
    return "Rule: committee record stored; ballot status is not inferred.";
  }
  if (signal.signalType === "large_contribution") {
    return "Rule: legacy large-receipt signal; donor-level storage is disabled in low-cost mode.";
  }
  return "Rule: source-linked FEC record matched to the current stored race slice.";
}
