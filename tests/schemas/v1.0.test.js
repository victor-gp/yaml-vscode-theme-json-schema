import { expect, test } from "vitest";
import Ajv from "ajv"; // JSON Schema draft-07 by default

test("correct schema validates ok", () => {
  const ajv = new Ajv();

  const schema = {
    type: "object",
    properties: {
      foo: { type: "integer" },
      bar: { type: "string" },
    },
    required: ["foo"],
    additionalProperties: false,
  };

  const validate = ajv.compile(schema);

  const data = {
    foo: 1,
    bar: "abc",
  };

  expect(validate(data)).toBe(true);
});

test("incorrect schema validates with error", () => {
  const ajv = new Ajv();

  const schema = {
    type: "object",
    properties: {
      foo: { type: "string" },
      bar: { type: "string" },
    },
    required: ["foo"],
    additionalProperties: false,
  };

  const validate = ajv.compile(schema);

  const data = {
    foo: 1,
    bar: "abc",
  };

  expect(validate(data)).toBe(false);
  expect(validate.errors[0].instancePath).toBe('/foo');
  expect(validate.errors[0].message).toBe('must be string');
});
