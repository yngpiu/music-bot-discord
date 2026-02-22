/**
 * Returns a pseudo-random but deterministic 0-based index from any numeric string ID
 * Useful for spreading out load across instances (e.g., bot shards or clients)
 */
export function getDeterministicIndexFromId(
  idString: string | undefined | null,
  maxItems: number
): number {
  if (!idString || maxItems <= 0) return 0

  // Discord IDs are up to 19 digits, easily parsed by BigInt
  const id = BigInt(idString)
  return Number(id % BigInt(maxItems))
}
