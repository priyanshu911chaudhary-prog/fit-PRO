import { build } from "esbuild";
import path from "path";

async function run() {
  await build({
    entryPoints: [path.resolve(process.cwd(), "src/workers/index.ts")],
    bundle: true,
    platform: "node",
    target: "node24",
    format: "cjs",
    outfile: path.resolve(process.cwd(), "dist/worker.cjs"),
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      "server-only": path.resolve(process.cwd(), "tests/mocks/server-only.ts"),
    },
    packages: "external",
    sourcemap: true,
  });
  console.log("Worker built successfully to dist/worker.cjs");
}

run().catch((err) => {
  console.error("Worker build error:", err);
  process.exit(1);
});
