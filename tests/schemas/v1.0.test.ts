import { expect, test } from "vitest";
import { ajvTest, addHexColorFormat } from "../utils/ajv.js";
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

ajvTest("v1 schema validates Lucario Theme", async ({ validate }) => {
  const themePath = path.join(__dirname, '..', 'fixtures', 'Lucario-Theme.v2.3.3.yml');
  const themeRaw = await readFile(themePath, 'utf8');
  const themeAST = await parseYaml(themeRaw, schemaOptions);

  const validationResult = validate(themeAST);
  //nice: consider https://www.npmjs.com/package/@segment/ajv-human-errors
  if (validate.errors) console.log(validate.errors);
  expect(validationResult).toBe(true);
});

ajvTest("colors (workbench) properties can be null", async({ validate }) => {
  const themeAST = { colors: { foreground: null } };
  expect(validate(themeAST)).toBe(true);
});

ajvTest("tokenColors properties cannot be null", async({ validate }) => {
  const themeAST = { tokenColors: {
    scope: "comment",
    settings: { foreground: null }
  } };
  expect(validate(themeAST)).toBe(false);

  //nit: errors are really unimformative, and the fault lies on our yaml-defs
  // console.log(validate.errors);
});

ajvTest("semanticTokenColors properties cannot be null", async({ validate }) => {
  const themeAST = { semanticTokenColors: {
    scope: "comment",
    settings: { foreground: null }
  } };
  expect(validate(themeAST)).toBe(false);
});

//todo add !alpha tests, when we have a stricter def for that

ajvTest("tokenColors cannot have properties with random names", async({ validate }) => {
  const themeAST = { colors: { random: "#000" } };
  expect(validate(themeAST)).toBe(false);
  expect(validate.errors[0].instancePath).toBe("/colors");
  expect(validate.errors[0].keyword).toBe("additionalProperties");
  expect(validate.errors[0].message).toBe("must NOT have additional properties");
});

//nit it seems that semanticTokenColors (token-styling.json) are also allowlisted?

test("the defs sub-schema (owned) doesn't error when compiling with AJV strict mode", async() => {
  const schemaFilename = 'yaml-color-theme-defs.yml';
  const schemasPathRoot = path.join(__dirname, '..', '..', 'schemas', 'v1.0');
  const schemaPath = path.join(schemasPathRoot, schemaFilename);
  const schemaRaw = await readFile(schemaPath, 'utf8');
  const schemaAST = parseYaml(schemaRaw);

  const ajvOptions = {
    strict: true,
    // verbose: true,
  };
  const ajv = new Ajv(ajvOptions);
  addHexColorFormat(ajv);

  expect(() => ajv.compile(schemaAST)).not.toThrow();
})
