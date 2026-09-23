import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const staticRoot = join(root, "static");
const requireDemo = createRequire(join(staticRoot, "package.json"));
const { build } = requireDemo("esbuild");
const postcss = requireDemo("postcss");
const tailwind = requireDemo("@tailwindcss/postcss");
const output = join(root, "docs");
await mkdir(output, { recursive: true });

await build({
  entryPoints: [join(staticRoot, "app.tsx")],
  outfile: join(output, "app.js"),
  bundle: true,
  minify: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  jsx: "automatic",
  alias: { "@": root },
  nodePaths: [join(staticRoot, "node_modules")],
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "eof",
});

// Keep all original styling. Absolute import paths locate the isolated demo
// dependencies without changing the application's own dependency installation.
const css = (await readFile(join(root, "app", "globals.css"), "utf8"))
  .replace('@import "tailwindcss";', `@import "${requireDemo.resolve("tailwindcss/index.css").replaceAll("\\", "/")}";`)
  .replace('@import "tw-animate-css";', `@import "${join(staticRoot, "node_modules", "tw-animate-css", "dist", "tw-animate.css").replaceAll("\\", "/")}";`);
const processed = await postcss([tailwind({ base: root, optimize: true })]).process(css, {
  from: join(root, "app", "globals.css"),
  to: join(output, "app.css"),
});
await writeFile(join(output, "app.css"), processed.css + "\n" + await readFile(join(staticRoot, "demo.css"), "utf8"));
await Promise.all([
  copyFile(join(root, "public", "relief-team.jpg"), join(output, "relief-team.jpg")),
  copyFile(join(root, "public", "favicon.svg"), join(output, "favicon.svg")),
  writeFile(join(output, ".nojekyll"), ""),
]);
await writeFile(join(output, "index.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Try Relief Bridge: a fictional disaster response coordination demo. Request supplies, match donations and track shipments. Test data stays in your browser.">
  <meta name="theme-color" content="#941e35">
  <title>Relief Bridge — Public test site</title>
  <link rel="icon" href="./favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="./app.css">
  <script type="module" src="./app.js"></script>
</head>
<body class="antialiased">
  <div id="root"></div>
  <noscript>This interactive test site needs JavaScript. It stores fictional records in this browser only.</noscript>
</body>
</html>
`);
console.log(`Public demo built: ${output}`);
