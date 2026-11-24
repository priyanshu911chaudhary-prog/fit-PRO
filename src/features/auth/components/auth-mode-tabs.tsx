import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuthMode } from "../types";

export function AuthModeTabs({ mode, onSwitchMode }: { mode: AuthMode; onSwitchMode: (mode: AuthMode) => void }) {
  return <Tabs value={mode} onValueChange={(value) => onSwitchMode(value === "register" ? "register" : "login")}>
    <TabsList className="w-full" aria-label="Account access">
      <TabsTrigger value="login">Sign in</TabsTrigger>
      <TabsTrigger value="register">Create account</TabsTrigger>
    </TabsList>
  </Tabs>;
}
