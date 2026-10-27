export type JsonPrimitive = boolean | null | number | string;

export type JsonValue = IJsonObject | JsonPrimitive | JsonValue[];

export interface IJsonObject {
  [key: string]: JsonValue | undefined;
}
