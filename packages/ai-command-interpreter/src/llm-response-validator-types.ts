export interface ValidatedLLMResponse {
  valid: boolean;
  errors: readonly string[];
  content: unknown;
}
