import * as esbuild from "esbuild";
import CleanCSS from "clean-css";
import { minify as minifyHtml } from "html-minifier-terser";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");

const OVERLAY_SCRIPT_DEV =
  '<script type="module" src="../../src/overlay.js"></script>';
const OVERLAY_SCRIPT_DIST = '<script src="../../overlay.js"></script>';

function manifestForDist(manifest) {
  return {
    ...manifest,
    background: {
      scripts: ["background.js"],
      persistent: false,
    },
  };
}

function overlayHtmlForDist(html) {
  return html.replace(OVERLAY_SCRIPT_DEV, OVERLAY_SCRIPT_DIST);
}

const esbuildOptions = {
  bundle: true,
  platform: "browser",
  target: "firefox115",
  format: "iife",
  minify: true,
  logLevel: "info",
};

const htmlMinifyOptions = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeOptionalTags: false,
  minifyCSS: true,
  minifyJS: false,
};

async function emptyDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

async function minifyStylesheet(inputPath, outputPath) {
  const source = await fs.readFile(inputPath, "utf8");
  const { styles, errors } = new CleanCSS({ level: 2 }).minify(source);
  if (errors.length) {
    throw new Error(`CSS minify failed for ${inputPath}: ${errors.join(", ")}`);
  }
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, styles);
}

async function minifyHtmlFile(inputPath, outputPath, { transform } = {}) {
  const source = await fs.readFile(inputPath, "utf8");
  let output = await minifyHtml(source, htmlMinifyOptions);
  if (transform) output = transform(output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, output);
}

async function copyDirectory(inputDir, outputDir) {
  await fs.cp(inputDir, outputDir, { recursive: true });
}

await emptyDir(distDir);

await Promise.all([
  esbuild.build({
    ...esbuildOptions,
    entryPoints: [path.join(rootDir, "src/background.js")],
    outfile: path.join(distDir, "background.js"),
  }),
  esbuild.build({
    ...esbuildOptions,
    entryPoints: [path.join(rootDir, "src/overlay.js")],
    outfile: path.join(distDir, "overlay.js"),
  }),
  minifyStylesheet(
    path.join(rootDir, "assets/css/overlay.css"),
    path.join(distDir, "assets/css/overlay.css")
  ),
  minifyHtmlFile(
    path.join(rootDir, "assets/html/overlay.html"),
    path.join(distDir, "assets/html/overlay.html"),
    { transform: overlayHtmlForDist }
  ),
  minifyHtmlFile(
    path.join(rootDir, "assets/html/options.html"),
    path.join(distDir, "assets/html/options.html")
  ),
  copyDirectory(
    path.join(rootDir, "assets/icons"),
    path.join(distDir, "assets/icons")
  ),
]);

const manifest = manifestForDist(
  JSON.parse(await fs.readFile(path.join(rootDir, "manifest.json"), "utf8"))
);
await fs.writeFile(
  path.join(distDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log("Build complete: dist/");
