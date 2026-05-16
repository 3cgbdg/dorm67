/**
 * Optional abstraction hook for multiple LLM vendors (OpenAI vs Anthropic).
 * Taras currently calls `anthropic.ts` directly; this module is a placeholder for future refactors.
 */
export type LlmVendorId = "openai" | "anthropic";
