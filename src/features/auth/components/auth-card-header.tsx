import type { AuthMode } from "../types";

export function AuthCardHeader({ mode }: { mode: AuthMode }) {
  return <h1 className="font-serif text-4xl tracking-tight">{mode === "login" ? "Welcome back." : "Start your journal."}</h1>;
}
