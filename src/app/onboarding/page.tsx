"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap, BriefcaseBusiness, Upload } from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { Track } from "@/lib/types";

export default function Onboarding() {
  const router = useRouter();
  const { profile, refreshProfile } = useStore();
  const [track, setTrack] = useState<Track>(profile.track_type ?? "A");
  const [linkedin, setLinkedin] = useState(profile.linkedin_url ?? "");
  const [cv, setCv] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function finish() {
    if (!supabase) return setError("Supabase não configurado.");
    setBusy(true); setError("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Sua sessão expirou. Entre novamente.");
      let cvUrl = profile.cv_url;
      if (cv) {
        if (cv.type !== "application/pdf" || cv.size > 5 * 1024 * 1024) throw new Error("O currículo deve ser PDF de até 5 MB.");
        const path = `${user.id}/curriculo-${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage.from("curriculos").upload(path, cv, { contentType: "application/pdf" });
        if (uploadError) throw uploadError;
        cvUrl = path;
      }
      const { error: saveError } = await supabase.from("profiles").update({
        track_type: track, linkedin_url: linkedin.trim(), cv_url: cvUrl,
      }).eq("id", user.id);
      if (saveError) throw saveError;
      await refreshProfile();
      router.replace("/");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar o perfil."); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-4xl space-y-7">
    <div><h1 className="text-3xl font-extrabold">Escolha sua jornada</h1><p className="mt-2 text-slate-600">Sua jornada é definida nesta etapa. Para escolher novamente, use “Refazer diagnóstico” em Meu Perfil.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <button type="button" onClick={() => setTrack("A")} aria-pressed={track === "A"} className={`card p-6 text-left transition hover:shadow-md ${track === "A" ? "ring-2 ring-pink-500" : ""}`}>
        <GraduationCap size={30} className="text-pink-500" /><h2 className="mt-4 text-xl font-bold">Primeiros Passos</h2><p className="mt-2 text-sm text-slate-600">Para estudantes, recém-formadas e mulheres iniciando uma carreira no mercado financeiro.</p>
      </button>
      <button type="button" onClick={() => setTrack("B")} aria-pressed={track === "B"} className={`card p-6 text-left transition hover:shadow-md ${track === "B" ? "ring-2 ring-pink-500" : ""}`}>
        <BriefcaseBusiness size={30} className="text-pink-500" /><h2 className="mt-4 text-xl font-bold">Novos Horizontes</h2><p className="mt-2 text-sm text-slate-600">Para transição de carreira, retorno ao mercado e desenvolvimento profissional.</p>
      </button>
    </div>
    <section className="card space-y-4 p-6">
      <div><h2 className="text-lg font-bold">Seu perfil profissional</h2><p className="text-sm text-slate-600">Estas informações são opcionais. Você pode adicionar depois.</p></div>
      <div><label htmlFor="onboard-linkedin" className="label">Link do LinkedIn (opcional)</label><input className="input" id="onboard-linkedin" type="url" placeholder="https://www.linkedin.com/in/..." value={linkedin} onChange={(e) => setLinkedin(e.target.value)} /></div>
      <div><label htmlFor="onboard-cv" className="label">Currículo PDF (opcional, até 5 MB)</label><label htmlFor="onboard-cv" className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-700"><Upload size={18} />{cv ? cv.name : "Selecionar currículo"}</label><input id="onboard-cv" className="sr-only" type="file" accept="application/pdf" onChange={(e) => setCv(e.target.files?.[0] ?? null)} /></div>
    </section>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <button className="btn-primary px-7 py-3" onClick={finish} disabled={busy}>{busy ? "Salvando..." : "Começar minha jornada"} <ArrowRight size={17} /></button>
  </div>;
}
