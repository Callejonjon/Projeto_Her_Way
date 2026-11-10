"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "cadastro" | "recuperar";
export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function google() {
    if (!supabase) return setError("Supabase não configurado.");
    setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, scopes: "openid email profile" },
    });
    if (error) { setBusy(false); setError(error.message); }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return setError("Supabase não configurado.");
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "cadastro") {
        if (name.trim().length < 2 || password.length < 8) {
          setError("Informe seu nome e uma senha com pelo menos 8 caracteres."); return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (data.session) router.replace("/onboarding");
        else setMessage("Confira sua caixa de entrada e confirme seu e-mail para ativar a conta.");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace("/");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/reset`,
        });
        if (error) throw error;
        setMessage("Se existir uma conta com esse e-mail, você receberá instruções para redefinir a senha.");
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível continuar."); }
    finally { setBusy(false); }
  }
  const signup = mode === "cadastro", recovery = mode === "recuperar";
  return <section className="card space-y-5 p-7 sm:p-8">
    <div><h1 className="text-2xl font-extrabold">{signup ? "Crie sua conta" : recovery ? "Recuperar senha" : "Bem-vinda à Her Way"}</h1><p className="mt-2 text-sm text-slate-600">{signup ? "Dê o primeiro passo na sua carreira financeira." : recovery ? "Enviaremos um link de recuperação ao seu e-mail." : "Acesse sua jornada profissional."}</p></div>
    {!recovery && <button type="button" disabled={busy} className="btn-secondary w-full" onClick={google}><span className="font-bold text-[#4285F4]">G</span> Continuar com Google</button>}
    {!recovery && <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />ou com e-mail<span className="h-px flex-1 bg-slate-200" /></div>}
    <form onSubmit={submit} className="space-y-4">
      {signup && <div><label className="label" htmlFor="auth-name">Nome completo</label><input id="auth-name" required className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></div>}
      <div><label className="label" htmlFor="auth-email">E-mail</label><input id="auth-email" required type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      {!recovery && <div><label className="label" htmlFor="auth-password">Senha</label><input id="auth-password" required type="password" minLength={signup ? 8 : 1} className="input" autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></div>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      <button disabled={busy} type="submit" className="btn-primary w-full justify-center">{busy ? "Processando..." : signup ? "Criar conta" : recovery ? "Enviar link" : "Entrar"}</button>
    </form>
    <div className="space-y-2 text-center text-sm">
      {mode === "login" && <><p>Ainda não tem conta? <Link className="font-semibold text-pink-600" href="/cadastro">Cadastre-se</Link></p><Link className="text-slate-600 hover:underline" href="/recuperar-senha">Esqueci minha senha</Link></>}
      {mode !== "login" && <Link className="font-semibold text-pink-600" href="/login">Voltar para o login</Link>}
    </div>
  </section>;
}
