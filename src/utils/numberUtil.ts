/**
 * @file numberUtil.ts
 * @description Utilities for numerical calculations and deterministic randomization.
 */

/**
 * Returns a deterministic index from a large ID string (e.g., Discord ID) within a given range.
 * @param {string | undefined | null} idString - The string ID to hash.
 * @param {number} maxItems - The range upper limit (exclusive).
 * @returns {number} - A number between 0 and maxItems-1.
 */
export function getDeterministicIndexFromId(
  idString: string | undefined | null,
  maxItems: number
): number {
  if (!idString || maxItems <= 0) return 0

  const id = BigInt(idString)
  return Number(id % BigInt(maxItems))
}
