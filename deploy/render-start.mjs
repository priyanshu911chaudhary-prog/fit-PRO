// Render Free shares one instance between the HTTP server and the queue worker.
import { spawn } from "node:child_process";

const env = {
  ...process.env,
  HOSTNAME: "0.0.0.0",
  APP_URL: process.env.APP_URL || process.env.RENDER_EXTERNAL_URL,
};
const children = new Set();
let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => {
    for (const child of children) child.kill("SIGKILL");
  }, 12000).unref();
}

for (const entry of ["dist/worker.cjs", "server.js"]) {
  const child = spawn(process.execPath, [entry], { env, stdio: "inherit" });
  children.add(child);
  child.on("error", (error) => {
    console.error(entry, error.message);
    stop(1);
  });
  child.on("exit", () => {
    children.delete(child);
    if (!stopping) {
      console.error(entry, "exited unexpectedly");
      stop(1);
    }
  });
}
process.on("SIGTERM", () => stop(0));
process.on("SIGINT", () => stop(0));
