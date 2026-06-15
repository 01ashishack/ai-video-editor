import AjvModule, { type ErrorObject, type Schema } from "ajv";
import type {
  SchemaValidationError,
  SchemaValidationResult
} from "./validation-types.js";

const Ajv = AjvModule.default;
const ajv = new Ajv({
  allErrors: true,
  strict: false
});

export function validateSchema(
  schema: Schema,
  data: unknown
): SchemaValidationResult {
  try {
    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (valid) {
      return {
        valid: true,
        errors: []
      };
    }

    return {
      valid: false,
      errors: mapAjvErrors(validate.errors ?? [])
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          path: "",
          message:
            error instanceof Error
              ? error.message
              : "Unknown schema validation error",
          keyword: "schema"
        }
      ]
    };
  }
}

function mapAjvErrors(errors: ErrorObject[]): SchemaValidationError[] {
  return errors.map((error) => ({
    path: error.instancePath,
    message: error.message ?? "Invalid value",
    keyword: error.keyword
  }));
}
