import { readFile, writeFile } from 'fs/promises';
import * as path from 'path';
import * as url from 'node:url';

//nice: configure all of this in config.json
const SCHEMAS = [
    'color-theme.json',
    'textmate-colors.json',
    'token-styling.json',
    'workbench-colors.json',
];
const ROOT_DIR = path.join(import.meta.dirname, '..');
const SCHEMAS_DIR = path.join(ROOT_DIR, 'schemas');
const SRC_DIR = path.join(SCHEMAS_DIR, 'v0');
const DEST_DIR = path.join(SCHEMAS_DIR, 'v1.0');

// PRE: the JSON Schemas for the current version of VS Code are already in schemas/v0.
export default async function main() {
    for (const schemaFilename of SCHEMAS) {
        const schemaPath = path.join(SRC_DIR, schemaFilename);
        const schemaRaw = await readFile(schemaPath, 'utf-8');
        const schemaAST = JSON.parse(schemaRaw);

        let newSchemaFilename = schemaFilename;
        let newSchemaAST = adaptIncompatibleBits(schemaAST, schemaFilename);
        if (schemaFilename === 'color-theme.json') {
            newSchemaFilename = 'yaml-color-theme.json';
            newSchemaAST = addMainSchemaAnnotations(newSchemaAST);
        }

        //nice: configure format in config.json
        const newSchemaRaw = JSON.stringify(newSchemaAST, null, 4);
        const newSchemaPath = path.join(DEST_DIR, newSchemaFilename);
        await writeFile(newSchemaPath, newSchemaRaw);
    }
};

// are we main? is this running as a node script?
if (import.meta.url.startsWith('file:')) {
    const modulePath = url.fileURLToPath(import.meta.url);
    if (process.argv[1] === modulePath) {
        await main();
    }
}

function adaptIncompatibleBits(schemaAST, schemaFilename) {
    schemaAST = replaceVscodeUris(schemaAST);
    schemaAST = replaceColorHexTypes(schemaAST, schemaFilename);
    for (const key in schemaAST) {
        if (typeof schemaAST[key] === 'object') {
            schemaAST[key] = adaptIncompatibleBits(schemaAST[key], schemaFilename);
        }
    }
    return schemaAST;
}

// the original schemas come with $ref URIs like "vscode://schemas/workbench-colors",
// replace them for relative paths (no dirname as they're in the same directory)
function replaceVscodeUris(schemaAST) {
    if (schemaAST['$ref'] && schemaAST['$ref'].startsWith('vscode://schemas/')) {
        const relativePath = schemaAST['$ref'].replace('vscode://schemas/', '') + '.json';
        schemaAST['$ref'] = relativePath;
    }
    return schemaAST;
}

//nice: It does make sense to extend tokenColors (syntax) to be nullable too...
//      use cases: annotate alternatives, TBD; annotate default values.
//      Algorithm: if !color && !fontStyle: remove the whole theming rule; if any exists: keep it but remove empty keys
//      Then I should also replaceFontStyleTypes() in adaptIncompatibleBits() to allow null.
// the original schema doesn't allow some YAML themes' patterns:
// - null values: usually placeholders for a color setting
// - !alpha tags with color-hex + alpha channel
// our custom yaml-color-hex schema covers them
function replaceColorHexTypes(schemaAST, schemaFilename) {
    if (schemaAST.type === 'string' && schemaAST.format === 'color-hex') {
        delete schemaAST.type;
        delete schemaAST.format;
        const def = schemaFilename === 'workbench-colors.json' ? 'nullableColor' : 'color';
        schemaAST = {
            '$ref': `yaml-color-theme-defs.json#/properties/${def}`,
            ...schemaAST
        };
    }
    return schemaAST;
}

// prevents the looong absolute path to the schema from showing in the status bar
function addMainSchemaAnnotations(schema) {
    const annotations = {
        title: 'VS Code YAML color theme',
        description: 'VS Code color theme YAML file',
    };
    return { ...annotations, ...schema };
}
