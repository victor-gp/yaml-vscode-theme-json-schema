import { expect, test } from "vitest";
import Ajv from "ajv"; // JSON Schema draft-07 by default
import { readFile } from 'fs/promises';
import { isSeq, parse as parseYaml } from 'yaml';
import type { CollectionTag, SchemaOptions, YAMLSeq } from 'yaml';
import * as path from 'path';

// this is equivalent to what the YAML Language Server does when we configure custom tags like this:
//   "yaml.customTags": [ "!alpha sequence" ],
// https://github.com/redhat-developer/yaml-language-server/blob/6c66fdf8/src/languageservice/parser/custom-tag-provider.ts#L54
const alphaTag: CollectionTag = {
  tag: "!alpha",
  collection: "seq",
  resolve(value: YAMLSeq): YAMLSeq {
    if (isSeq(value)) return value;
  },
  // JS -> YAML (not supported), but it's a required method
  identify: () => false,
}
const schemaOptions: SchemaOptions = { customTags: [alphaTag] };

test("actual schema validates ok", async() => {
  const themePath = path.join(__dirname, '..', 'fixtures', 'Lucario-Theme.v2.3.3.yml');
  const themeRaw = await readFile(themePath, 'utf8');
  const themeObj = await parseYaml(themeRaw, schemaOptions);
  console.log(themeObj)
});

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
  expect(validate.errors![0].instancePath).toBe('/foo');
  expect(validate.errors![0].message).toBe('must be string');
});
