// Browser-safe practice-credit caps. The database spending function enforces the same values.
export const ATTEMPT_CREDIT_CAP = 20;
export const DAILY_CREDIT_CAP = 40;

export type CapKind = "attempt" | "daily";

/** Which cap a spend would break, or null if it fits. */
export function capBlocking(cost: number, attemptSpent: number, todaySpent: number): CapKind | null {
  if (attemptSpent + cost > ATTEMPT_CREDIT_CAP) return "attempt";
  if (todaySpent + cost > DAILY_CREDIT_CAP) return "daily";
  return null;
}

/** Maps a database cap error message to the cap kind. */
export function capFromError(message: string): CapKind | null {
  if (message.includes("ATTEMPT_CAP")) return "attempt";
  if (message.includes("DAILY_CAP")) return "daily";
  return null;
}

export const CAP_MESSAGES: Record<CapKind, string> = {
  attempt: `This attempt has used its ${ATTEMPT_CREDIT_CAP}-credit AI budget. No credits were spent. You can still edit code, run tests and submit.`,
  daily: `Daily AI limit of ${DAILY_CREDIT_CAP} credits reached — resets at midnight UTC. No credits were spent. You can still edit code, run tests and submit.`,
};
