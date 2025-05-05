import { expect, test } from "vitest";
import Ajv from "ajv"; // JSON Schema draft-07 by default

test("ajv example works", () => {
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
