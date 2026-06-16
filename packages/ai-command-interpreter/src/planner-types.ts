import type {
  EditingIntentPayloadByType,
  EditingIntentType
} from "./intent-types.js";

export const PLANNED_COMMAND_SCHEMA_VERSION = "0.1";

export type PlannedCommandSchemaVersion =
  typeof PLANNED_COMMAND_SCHEMA_VERSION;

export type PlannedCommandType = EditingIntentType;

export type PlannedCommandByType = {
  [TType in PlannedCommandType]: {
    schemaVersion: PlannedCommandSchemaVersion;
    type: TType;
    payload: Readonly<EditingIntentPayloadByType[TType]>;
  };
};

export type PlannedCommand =
  PlannedCommandByType[keyof PlannedCommandByType];
