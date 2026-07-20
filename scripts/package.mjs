import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");

if (!fs.existsSync(distDir)) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}

const { name, version } = JSON.parse(
  fs.readFileSync(path.join(rootDir, "package.json"), "utf8")
);
const outFile = path.join(rootDir, `${name}-${version}.zip`);

fs.rmSync(outFile, { force: true });
execFileSync("zip", ["-r", "-X", outFile, "."], { cwd: distDir, stdio: "inherit" });

console.log(`Package written: ${path.relative(rootDir, outFile)}`);
