"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
export default function Reset() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    if (!supabase) { setError("Supabase não configurado."); setBusy(false); return; }
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message); else router.replace("/login");
  }
  return <form onSubmit={submit} className="card space-y-4 p-8"><h1 className="text-xl font-bold">Definir nova senha</h1><label className="label" htmlFor="new-password">Nova senha</label><input id="new-password" type="password" minLength={8} required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<button type="submit" disabled={busy} className="btn-primary w-full justify-center">Salvar nova senha</button></form>;
}
