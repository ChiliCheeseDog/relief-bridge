// Packaging portion of the vendored Sites build integration.
// See sites-vite-plugin.LICENSE for the upstream MIT license.
import { access, cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";

export function sites(): Plugin {
  let root = process.cwd();
  let building = false;
  return {
    name: "sites-package",
    configResolved(config) {
      root = config.root;
      building = config.command === "build";
    },
    async closeBundle() {
      if (!building) return;
      const output = resolve(root, "dist", ".openai");
      await mkdir(output, { recursive: true });
      await cp(resolve(root, ".openai", "hosting.json"), resolve(output, "hosting.json"));
      const migrations = resolve(root, "drizzle");
      try {
        await access(migrations);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
        throw error;
      }
      await cp(migrations, resolve(output, "drizzle"), { recursive: true });
    },
  };
}
