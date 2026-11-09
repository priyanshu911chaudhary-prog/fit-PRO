import { build, Plugin } from "esbuild";
import path from "path";

const emptyServerOnlyPlugin: Plugin = {
  name: "empty-server-only",
  setup(buildCtx) {
    buildCtx.onResolve({ filter: /^server-only$/ }, (args) => ({
      path: args.path,
      namespace: "empty-server-only-ns",
    }));
    buildCtx.onLoad({ filter: /.*/, namespace: "empty-server-only-ns" }, () => ({
      contents: "module.exports = {};",
      loader: "js",
    }));
  },
};

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
    },
    plugins: [emptyServerOnlyPlugin],
    packages: "external",
    sourcemap: true,
  });
  console.log("Worker built successfully to dist/worker.cjs");
}

run().catch((err) => {
  console.error("Worker build error:", err);
  process.exit(1);
});
