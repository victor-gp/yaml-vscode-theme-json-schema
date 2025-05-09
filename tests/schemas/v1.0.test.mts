import { expect, test } from "vitest";
import Ajv from "ajv"; // JSON Schema draft-07 by default
import type { Schema } from "ajv";
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
  const schemaFilenames = ['color-theme.json', 'workbench-colors.json', 'textmate-colors.json', 'token-styling.json', 'yaml-color-property.yml'];
  const schemasPathRoot = path.join(__dirname, '..', '..', 'schemas', 'v1.0');
  const schemasUriRoot = "http://example.com/schemas/";
  const schemaTuples = await Promise.all(schemaFilenames.map(async (filename) => {
    const schemaPath = path.join(schemasPathRoot, filename);
    const schemaRaw = await readFile(schemaPath, 'utf8');
    const parseFn: (src: string) => Schema =
      filename.endsWith(".json") ? JSON.parse : parseYaml;
    const schemaAST = parseFn(schemaRaw);
    const schemaURI = schemasUriRoot + filename; //nit: URI.join?
    return [ schemaURI, schemaAST ];
  }));
  const schemas = Object.fromEntries(schemaTuples);

  // patch this because it works on vscode but not on ajv
  delete schemas[schemasUriRoot + 'color-theme.json'].properties.colors.additionalProperties;
  schemas[schemasUriRoot + 'workbench-colors.json'].additionalProperties = false;

  const ajvOptions = {
    // silence "property comment matches pattern xyz" compilation error
    allowMatchingProperties: true,
    // silence 'missing "string" for keyword "pattern"' errors in vscode-owned schemas
    strictTypes: false,
    schemas,
    // verbose: true,
  };
  const ajv = new Ajv(ajvOptions);
  ajv.addVocabulary(["allowComments", "allowTrailingCommas", "defaultSnippets", "deprecationMessage", "patternErrorMessage", ]);
  const hexDigit = "[0-9a-fA-F]";
  const colorHexRegex = new RegExp(`^#(${hexDigit}{3}|${hexDigit}{4}|${hexDigit}{6}|${hexDigit}{8})$`);
  ajv.addFormat("color-hex", colorHexRegex);
  const validate = ajv.getSchema("http://example.com/schemas/color-theme.json");

  const themePath = path.join(__dirname, '..', 'fixtures', 'Lucario-Theme.v2.3.3.yml');
  const themeRaw = await readFile(themePath, 'utf8');
  const themeObj = await parseYaml(themeRaw, schemaOptions);

  const validationResult = validate(themeObj);
  //nice: consider https://www.npmjs.com/package/@segment/ajv-human-errors
  if (validate.errors) console.log(validate.errors);
  expect(validationResult).toBe(true);
});

//todo: test compiling our owned schema with 'strictTypes: true'
//todo: test schemas with additional properties (should fail validation)

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
