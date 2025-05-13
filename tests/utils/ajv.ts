import { test } from "vitest";
import Ajv from "ajv"; // JSON Schema draft-07 by default
import type { Schema, ValidateFunction } from "ajv";
import { readFile } from 'fs/promises';
import { parse as parseYaml } from 'yaml';
import * as path from 'path';

//todo: move file reading + schema parsing elsewhere?

let schemasMemo;
async function schemas() {
  if (schemasMemo) return schemasMemo;

  const schemaFilenames = ['yaml-color-theme.json', 'workbench-colors.json', 'textmate-colors.json', 'token-styling.json', 'yaml-color-theme-defs.json'];
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
  delete schemas[schemasUriRoot + 'yaml-color-theme.json'].properties.colors.additionalProperties;
  schemas[schemasUriRoot + 'workbench-colors.json'].additionalProperties = false;

  schemasMemo = schemas;
  return schemasMemo;
}

export function addHexColorFormat(ajv: Ajv) {
    const hexDigit = "[0-9a-fA-F]";
    const colorHexRegex = new RegExp(`^#(${hexDigit}{3}|${hexDigit}{4}|${hexDigit}{6}|${hexDigit}{8})$`);
    ajv.addFormat("color-hex", colorHexRegex);
}

// we reuse the validation function because the schemas shouldn't change across tests
let validateMemo: ValidateFunction;
async function validate() {
    if (validateMemo) return validateMemo;

    const ajvOptions = {
      // silence "property comment matches pattern xyz" compilation error
      allowMatchingProperties: true,
      // silence 'missing "string" for keyword "pattern"' logs in vscode-owned schemas
      strictTypes: false,
      schemas: await schemas(),
      // verbose: true,
    };
    const ajv = new Ajv(ajvOptions);
    ajv.addVocabulary(["allowComments", "allowTrailingCommas", "defaultSnippets", "deprecationMessage", "patternErrorMessage", ]);
    addHexColorFormat(ajv);

    validateMemo = ajv.getSchema("http://example.com/schemas/yaml-color-theme.json");
    return validateMemo;
}

type AjvTestContext = { validate: ValidateFunction };

export const ajvTest = test.extend<AjvTestContext>({
  validate: async ({}, use) => {
    const validateFn = await validate();
    await use(validateFn);

    // cleanup after each test
    validateFn.errors = null;
  }
})

export function logErrors(validate: ValidateFunction, ast) {
  validate(ast);
  console.debug(validate.errors);
}
