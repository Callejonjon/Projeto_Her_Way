"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
export default function Callback() {
  const router = useRouter();
  const [error, setError] = useState("");
  useEffect(() => {
    if (!supabase) { setError("Supabase não configurado."); return; }
    let cancelled = false;
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const recovery = search.get("type") === "recovery" || hash.get("type") === "recovery" || search.get("next") === "/auth/reset";
    const callbackError = search.get("error_description") || hash.get("error_description");
    if (callbackError) { setError(callbackError.replace(/\+/g, " ")); return; }
    async function finish() {
      // Supabase JS processes OAuth/confirmation fragments on startup.
      const { data, error } = await supabase!.auth.getSession();
      if (cancelled) return;
      if (error) setError(error.message);
      else if (data.session) {
        if (recovery) router.replace("/auth/reset");
        else router.replace("/");
      }
      else setError("Não foi possível confirmar a sessão. Tente entrar novamente.");
    }
    void finish();
    return () => { cancelled = true; };
  }, [router]);
  return <section className="card p-8 text-center"><h1 className="text-xl font-bold">Confirmando seu acesso...</h1><p className="mt-3 text-sm text-slate-600">{error || "Estamos validando sua sessão."}</p>{error && <a className="mt-4 inline-block text-pink-600" href="/login">Voltar ao login</a>}</section>;
}
