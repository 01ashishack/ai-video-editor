export interface SchemaValidationError {
  path: string;
  message: string;
  keyword?: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
}
