import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export function loadPrompt(name: string): string {
  return readFileSync(join(here, `${name}.md`), "utf-8");
}
