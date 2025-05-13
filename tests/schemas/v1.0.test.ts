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
const parseYamlTheme = (themeRaw) => parseYaml(themeRaw, schemaOptions);

ajvTest("v1 schema validates Lucario Theme", async ({ validate }) => {
  const themePath = path.join(__dirname, '..', 'fixtures', 'Lucario-Theme.v2.3.3.yml');
  const themeRaw = await readFile(themePath, 'utf8');
  const themeAST = parseYamlTheme(themeRaw);

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

//nit it seems that semanticTokenColors (token-styling.json) are also allowlisted?
ajvTest("tokenColors cannot have properties with random names", async({ validate }) => {
  const themeAST = { colors: { random: "#000" } };
  expect(validate(themeAST)).toBe(false);
  expect(validate.errors[0].instancePath).toBe("/colors");
  expect(validate.errors[0].keyword).toBe("additionalProperties");
  expect(validate.errors[0].message).toBe("must NOT have additional properties");
});

ajvTest("semanticTokenColors properties cannot be null", async({ validate }) => {
  const themeAST = { semanticTokenColors: {
    scope: "comment",
    settings: { foreground: null }
  } };
  expect(validate(themeAST)).toBe(false);
});

//todo I should test against the yaml-defs schema only, leave the whole schema for integration
// I'm filtering !alpha tests but I'm taking a 1.5s hit of full schema compilation...
// perhaps with an outer mock schema that defines properties for the few exported definitions

ajvTest("'!alpha [#rrggbb, aa]' only accepts two items", async({ validate }) => {
  let themeRaw = `colors:
    foreground: !alpha ["#ffffff", cc]`;
  let themeAST = parseYamlTheme(themeRaw);
  expect(validate(themeAST)).toBe(true);

  themeRaw = `colors:
    foreground: !alpha ["#ffffff"]`;
  themeAST = parseYamlTheme(themeRaw);
  expect(validate(themeAST)).toBe(false);
  //nice: add error msg, for the next expect too

  themeRaw = `colors:
    foreground: !alpha ["#ffffff", cc, cc]`;
  themeAST = parseYamlTheme(themeRaw);
  expect(validate(themeAST)).toBe(false);
});

ajvTest("'!alpha [#rrggbb, aa]' can have 'aa' of type string", async({ validate }) => {
  const themeRaw = `colors:
    foreground: !alpha ["#ffffff", cc]`;
  const themeAST = parseYamlTheme(themeRaw);
  expect(validate(themeAST)).toBe(true);
});

ajvTest("'!alpha [#rrggbb, aa]' enforces 'aa' string length of 2", async({ validate }) => {
  let themeRaw = `colors:
    foreground: !alpha ["#ffffff", c]`;
  let themeAST = parseYamlTheme(themeRaw);
  //nice'r Expect the validation errors instead. / But we need a proper error msg because we have multi-expect...
  let errorMsg =  "'a' in '!alpha [#rrggbb, a]' should fail validation because it's length < 2";
  expect(validate(themeAST), errorMsg).toBe(false);

  themeRaw = `colors:
    foreground: !alpha ["#ffffff", ccc]`;
  themeAST = parseYamlTheme(themeRaw);
  errorMsg =  "'aaa' in '!alpha [#rrggbb, aaa]' should fail validation because it's length > 2";
  expect(validate(themeAST), errorMsg).toBe(false);
});

ajvTest("'!alpha [#rrggbb, aa]' can have 'aa' of type integer", async({ validate }) => {
  const themeRaw = `colors:
    foreground: !alpha ["#ffffff", 99]`;
  const themeAST = parseYamlTheme(themeRaw);
  expect(validate(themeAST)).toBe(true);
});

ajvTest("'!alpha [#rrggbb, aa]' with integer 'aa' must be two digits", async({ validate }) => {
  let themeRaw = `colors:
    foreground: !alpha ["#ffffff", 9]`;
  let themeAST = parseYamlTheme(themeRaw);
  //nice'r Expect the validation errors instead. / But we need a proper error msg because we have multi-expect...
  let errorMsg =  "9 in '!alpha [#rrggbb, 9]' should fail validation because it's < 10";
  expect(validate(themeAST), errorMsg).toBe(false);

  themeRaw = `colors:
    foreground: !alpha ["#ffffff", 100]`;
  themeAST = parseYamlTheme(themeRaw);
  errorMsg =  "100 in '!alpha [#rrggbb, 100]' should fail validation because it's > 99";
  expect(validate(themeAST), errorMsg).toBe(false);

  themeRaw = `colors:
    foreground: !alpha ["#ffffff", 00]`;
  themeAST = parseYamlTheme(themeRaw);
  errorMsg =  "00 in '!alpha [#rrggbb, 00]' should fail validation because it's < 10";
  expect(validate(themeAST), errorMsg).toBe(false);
});

ajvTest("'!alpha [#rgb, a]' only accepts two items", async({ validate }) => {
  let themeRaw = `colors:
    foreground: !alpha ["#fff", c]`;
  let themeAST = parseYamlTheme(themeRaw);
  expect(validate(themeAST)).toBe(true);

  themeRaw = `colors:
    foreground: !alpha ["#fff"]`;
  themeAST = parseYamlTheme(themeRaw);
  expect(validate(themeAST)).toBe(false);
  //nice: add error msg, for the next expect too

  themeRaw = `colors:
    foreground: !alpha ["#fff", c, c]`;
  themeAST = parseYamlTheme(themeRaw);
  expect(validate(themeAST)).toBe(false);
});

ajvTest("'!alpha [#rgb, a]' can have 'a' of type string", async({ validate }) => {
  let themeRaw = `colors:
    foreground: !alpha ["#fff", c]`;
  let themeAST = parseYamlTheme(themeRaw);
  expect(validate(themeAST)).toBe(true);

  themeRaw = `colors:
    foreground: !alpha ["#fff", cc]`;
  themeAST = parseYamlTheme(themeRaw);
  //nice'r Expect the validation errors instead. / But we need a proper error msg because we have multi-expect...
  let errorMsg =  "'aa' in '!alpha [#rgb, aa]' should fail validation because it's length 2";
  expect(validate(themeAST), errorMsg).toBe(false);
});

ajvTest("'!alpha [#rgb, a]' can have 'a' of type integer", async({ validate }) => {
  let themeRaw = `colors:
    foreground: !alpha ["#fff", 0]`;
  let themeAST = parseYamlTheme(themeRaw);
  expect(validate(themeAST)).toBe(true);

  themeRaw = `colors:
    foreground: !alpha ["#fff", 10]`;
  themeAST = parseYamlTheme(themeRaw);
  //nice'r Expect the validation errors instead. / But we need a proper error msg because we have multi-expect...
  let errorMsg =  "10 in '!alpha [#rgb, 10]' should fail validation because it's not single digit";
  expect(validate(themeAST), errorMsg).toBe(false);
});

test("the defs sub-schema (owned) doesn't error when compiling with AJV strict mode", async() => {
  const schemaFilename = 'yaml-color-theme-defs.json';
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
