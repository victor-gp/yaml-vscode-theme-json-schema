import { readFile, writeFile } from "fs/promises";
import * as path from "path";
import * as url from "node:url";
import * as YAML from "yaml";

const ROOT_DIR = path.join(import.meta.dirname, "..");
const SCHEMAS_DIR = path.join(ROOT_DIR, "schemas", "v1.0");

export default async function main() {
  const srcPath = path.join(SCHEMAS_DIR, "yaml-color-theme-defs.yml");
  const srcRaw = await readFile(srcPath, "utf-8");
  const schemaAST = YAML.parse(srcRaw);
  const destRaw = JSON.stringify(schemaAST, null, 4);
  const destPath = path.join(SCHEMAS_DIR, "yaml-color-theme-defs.json");
  await writeFile(destPath, destRaw);
}

// are we main? is this running as a node script?
if (import.meta.url.startsWith("file:")) {
  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    await main();
  }
}
