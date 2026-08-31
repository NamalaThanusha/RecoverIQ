export function toMinorUnits(amount: number): number {
  // Convert float amount to integer minor units safely (e.g. 10.50 -> 1050)
  return Math.round(amount * 100);
}
