import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const LOG_DIR = join(process.cwd(), "logs");
const LOG_FILE = join(LOG_DIR, "app.log");

function ensureLogFile() {
  try {
    if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
    if (!existsSync(LOG_FILE)) appendFileSync(LOG_FILE, "");
  } catch {
    // logging must never crash the app
  }
}

function write(level: string, msg: string, extra?: unknown) {
  ensureLogFile();
  const line =
    `${new Date().toISOString()} [${level}] ${msg}` +
    (extra !== undefined ? ` ${JSON.stringify(extra).slice(0, 2000)}` : "") +
    "\n";
  try {
    appendFileSync(LOG_FILE, line);
  } catch {
    /* ignore */
  }
  if (process.env.NODE_ENV !== "test") {
    if (level === "ERROR") console.error(line.trim());
    else console.log(line.trim());
  }
}

export const logger = {
  info: (msg: string, extra?: unknown) => write("INFO", msg, extra),
  warn: (msg: string, extra?: unknown) => write("WARN", msg, extra),
  error: (msg: string, extra?: unknown) => write("ERROR", msg, extra),
};

export function handleError(context: string, err: unknown) {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  logger.error(`${context}: ${message}`);
}

/** Resolve a path relative to server/ even when cwd differs. */
export function serverRoot(...parts: string[]) {
  // src/utils/logger.ts -> server/
  return join(dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1"), "..", "..", ...parts);
}
