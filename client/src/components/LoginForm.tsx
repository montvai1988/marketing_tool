import { useState } from "react";
import { BadgeCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError(null);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ username, password }) });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "A belépés nem sikerült.");
      window.location.assign("/");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "A belépés nem sikerült."); }
    finally { setSubmitting(false); }
  }
  return <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
    <div className="space-y-2"><Label htmlFor="login-username">Felhasználónév</Label><Input id="login-username" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required /></div>
    <div className="space-y-2"><Label htmlFor="login-password">Jelszó</Label><Input id="login-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></div>
    {error ? <p className="text-sm text-destructive">{error}</p> : null}
    <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeCheck className="mr-2 h-4 w-4" />}Bejelentkezés</Button>
  </form>;
}
