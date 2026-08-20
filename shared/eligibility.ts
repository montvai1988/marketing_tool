export type EligibilityInput = {
  email: string;
  optedOut: boolean;
};

export type EligibilityDecision =
  | { send: true }
  | { send: false; reason: "opted_out" | "suppressed" | "invalid" };

/**
 * Single source of truth for whether a recipient may be contacted. The router
 * and any future scheduled sender must both route through this function so an
 * opt-out can never be bypassed.
 */
export function decideEligibility(
  input: EligibilityInput,
  suppressed: Set<string>,
): EligibilityDecision {
  const email = input.email.trim().toLowerCase();

  if (!email || !email.includes("@")) return { send: false, reason: "invalid" };
  if (input.optedOut) return { send: false, reason: "opted_out" };
  if (suppressed.has(email)) return { send: false, reason: "suppressed" };

  return { send: true };
}
