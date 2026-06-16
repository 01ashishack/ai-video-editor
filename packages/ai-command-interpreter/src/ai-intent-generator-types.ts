import type { EditingIntent } from "./intent-types.js";
import type { LLMProvider } from "./llm-provider-types.js";

export interface AIIntentGeneratorInput {
  request: string;
  provider: LLMProvider;
}

export type AIIntentGeneratorResult = EditingIntent[];
