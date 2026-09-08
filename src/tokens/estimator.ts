/**
 * Token estimation (Spec §21).
 *
 * Goal is NOT exact model billing; it is a stable, deterministic estimate so
 * users can reason about how much context their configuration occupies.
 *
 * Minimal implementation: `estimatedTokens = characterCount / 4`. A
 * provider-specific tokenizer adapter may replace this later without changing
 * the public contract.
 */

const CHARS_PER_TOKEN = 4;

/** Estimates the number of tokens in `text`. Always >= 0. */
export function estimateTokens(text: string): number {
  return Math.round(text.length / CHARS_PER_TOKEN);
}
