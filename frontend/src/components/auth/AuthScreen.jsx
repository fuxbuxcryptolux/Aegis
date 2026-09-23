import { useState } from "react";
import { KeyRound, Mail, Shield, UserRound } from "lucide-react";
import { LOGIN, REGISTER } from "@/constants/testIds";
import { exchangeSupabaseSession } from "@/lib/api";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (isRegister && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabaseClient();
      const result = isRegister
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { name, marketing_opt_in: marketingOptIn } } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (!result.data.session) {
        setError("Check your email to verify the account before logging in.");
        return;
      }
      const exchanged = await exchangeSupabaseSession(result.data.session.access_token);
      await supabase.auth.signOut();
      onAuthenticated(exchanged.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#090d16] text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-slate-950/85 p-6 sm:p-8 shadow-[0_0_60px_rgba(6,182,212,0.15)]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-400/10">
            <Shield className="h-8 w-8 text-cyan-300" />
          </div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">Aegis Rogue</h1>
          <p className="mt-2 text-sm text-zinc-400">{isRegister ? "Create your commander account" : "Sign in to save and compete"}</p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-3">
          {isRegister && (
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
              Commander name
              <span className="mt-1 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900 px-3 py-2">
                <UserRound className="h-4 w-4 text-cyan-300" />
                <input required maxLength={24} value={name} onChange={(event) => setName(event.target.value)} data-testid={REGISTER.nameInput} className="w-full bg-transparent text-sm text-white outline-none" />
              </span>
            </label>
          )}
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
            Email
            <span className="mt-1 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900 px-3 py-2">
              <Mail className="h-4 w-4 text-cyan-300" />
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} data-testid={isRegister ? REGISTER.emailInput : LOGIN.emailInput} className="w-full bg-transparent text-sm text-white outline-none" />
            </span>
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
            Password
            <span className="mt-1 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900 px-3 py-2">
              <KeyRound className="h-4 w-4 text-cyan-300" />
              <input required minLength={isRegister ? 8 : 1} type="password" value={password} onChange={(event) => setPassword(event.target.value)} data-testid={isRegister ? REGISTER.passwordInput : LOGIN.passwordInput} className="w-full bg-transparent text-sm text-white outline-none" />
            </span>
          </label>
          {isRegister && (
            <>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                Confirm password
                <input required minLength={8} type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} data-testid={REGISTER.passwordConfirmInput} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
              </label>
              <label className="flex gap-2 text-xs leading-relaxed text-zinc-400">
                <input type="checkbox" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)} className="mt-0.5 accent-cyan-400" />
                I agree to receive Aegis Rogue news and promotional emails. This is optional.
              </label>
            </>
          )}
          {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={busy} data-testid={isRegister ? REGISTER.submitButton : LOGIN.submitButton} className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-display text-sm font-black uppercase tracking-wide text-slate-950 disabled:opacity-50">
            {busy ? "Connecting..." : isRegister ? "Create Account" : "Login"}
          </button>
        </form>
        <button type="button" onClick={() => { setMode(isRegister ? "login" : "register"); setError(""); }} className="mt-4 w-full text-center text-xs text-cyan-300 hover:text-cyan-200">
          {isRegister ? "Already have an account? Login" : "Need an account? Register"}
        </button>
      </section>
    </main>
  );
}
