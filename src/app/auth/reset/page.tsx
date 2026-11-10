"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) { setError("A conexão com o Supabase não está configurada."); setChecking(false); return; }
    let active = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const params = new URLSearchParams(window.location.search);
    const redirectedError = params.get("error_description") || hash.get("error_description");
    if (redirectedError) {
      setError(redirectedError.replace(/\+/g, " "));
      setChecking(false);
      return;
    }
    // Supabase processes recovery links on initialization. The event may have
    // fired before this component mounted, so also inspect the stored session.
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
        setChecking(false);
        setError("");
      }
      if (event === "SIGNED_OUT") {
        setReady(false);
      }
    });
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      else if (data.session) setReady(true);
      else setError("Este link expirou ou já foi utilizado. Solicite uma nova recuperação de senha.");
      setChecking(false);
    }).catch(() => {
      if (!active) return;
      setError("Não foi possível validar o link. Solicite outro e tente novamente.");
      setChecking(false);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!supabase || !ready) return setError("Link de recuperação inválido. Solicite outro.");
    if (password.length < 8) return setError("Use uma senha com pelo menos 8 caracteres.");
    if (password !== confirm) return setError("As senhas informadas não são iguais.");
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) { setError(updateError.message); return; }
    setSuccess(true);
    // Invalidate the temporary recovery session; ask user to log in with the new password.
    await supabase.auth.signOut();
  }

  return <section className="card space-y-5 p-7 sm:p-8">
    <div>
      <h1 className="text-2xl font-extrabold">Criar nova senha</h1>
      <p className="mt-2 text-sm text-slate-600">Escolha uma nova senha para acessar sua conta Her Way.</p>
    </div>
    {checking ? <p className="text-sm text-slate-600">Validando o link de recuperação...</p> : success ? (
      <div role="status" className="space-y-4">
        <p className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">Senha alterada com sucesso!</p>
        <button className="btn-primary w-full justify-center" onClick={() => router.replace("/login")}>Entrar com a nova senha</button>
      </div>
    ) : ready ? (
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="new-password">Nova senha</label>
          <input id="new-password" type="password" minLength={8} autoComplete="new-password" required className="input" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div><label className="label" htmlFor="confirm-new-password">Confirmar nova senha</label>
          <input id="confirm-new-password" type="password" minLength={8} autoComplete="new-password" required className="input" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full justify-center">{busy ? "Salvando..." : "Alterar senha"}</button>
      </form>
    ) : <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error || "Não foi possível validar o link."}</p>}
    {!success && <Link href="/recuperar-senha" className="block text-center text-sm font-semibold text-pink-600 hover:underline">Solicitar outro link</Link>}
  </section>;
}
