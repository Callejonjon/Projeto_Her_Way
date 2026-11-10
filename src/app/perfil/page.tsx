"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Award, BookOpenCheck, Briefcase, Camera, FileText, Flag, GraduationCap, HeartHandshake, Linkedin, Pencil, RotateCcw, Save, Star, Target, Trophy, Upload,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { AREAS } from "@/lib/mock-data";
import { LEVEL_NAMES, levelProgress } from "@/lib/engine";
import * as repo from "@/lib/repo";
import { PageHeader, ProgressBar, TrackBadge } from "@/components/ui";
import type { Area } from "@/lib/types";

export default function Perfil() {
  const { profile, updateProfile, connectLinkedin, journey, progress, mentorRequests, appliedJobs, resetDemo } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ bio: profile.bio, linkedin_url: profile.linkedin_url });
  const [cvMsg, setCvMsg] = useState<string | null>(null);
  const lp = levelProgress(profile.xp);

  const medals = [
    { icon: Flag, title: "Primeiro Passo", desc: "Concluiu o diagnóstico", on: journey.stagesDone[1] },
    { icon: BookOpenCheck, title: "Primeiro Módulo", desc: "Aprovada em um quiz", on: journey.passed.size >= 1 },
    { icon: Star, title: "Nota Máxima", desc: "100% em um quiz", on: progress.some((p) => p.quiz_score === 100) },
    { icon: GraduationCap, title: "Formação Básica", desc: "Concluiu a Etapa 2", on: journey.stagesDone[2] },
    { icon: HeartHandshake, title: "Conexão Feita", desc: "Solicitou mentoria", on: mentorRequests.length > 0 },
    { icon: Target, title: "Pronta p/ o Mercado", desc: "Concluiu a Etapa 4", on: journey.stagesDone[4] },
    { icon: Briefcase, title: "Primeira Candidatura", desc: "Candidatou-se a uma vaga", on: appliedJobs.length > 0 },
    { icon: Trophy, title: "Ciclo Completo", desc: "Concluiu as 5 etapas", on: journey.stagesDone[5] },
  ];

  function onAvatar(file?: File) {
    if (!file || !file.type.startsWith("image/") || file.size > 1024 * 1024) return;
    const r = new FileReader();
    r.onload = () => updateProfile({ avatar_url: String(r.result) });
    r.readAsDataURL(file);
  }

  async function onCv(file?: File) {
    if (!file) return;
    if (file.type !== "application/pdf" || file.size > 5 * 1024 * 1024) return setCvMsg("Envie um PDF de até 5 MB.");
    const path = await repo.uploadCv(file);
    updateProfile({ cv_url: path });
    setCvMsg("Currículo atualizado! ✅");
  }

  // Primeira vez que o LinkedIn é informado conta como "completar o perfil" (+50 XP)
  function saveDraft() {
    const li = draft.linkedin_url.trim();
    if (li && !profile.linkedin_url) {
      connectLinkedin(li);
      updateProfile({ bio: draft.bio });
    } else updateProfile(draft);
  }

  const toggleInterest = (a: Area) =>
    updateProfile({ interests: profile.interests.includes(a) ? profile.interests.filter((x) => x !== a) : [...profile.interests, a] });

  return (
    <>
      <PageHeader eyebrow="Meu Perfil" title="Sua vitrine profissional" />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Cartão de perfil */}
        <section className="card overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-navy-950 via-navy-800 to-pink-500" />
          <div className="px-6 pb-6">
            <div className="-mt-12 flex items-end justify-between">
              <label className="group relative cursor-pointer" aria-label="Alterar foto">
                {profile.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={profile.avatar_url} alt="" className="h-24 w-24 rounded-full border-4 border-white object-cover" />
                  : <span className="grid h-24 w-24 place-items-center rounded-full border-4 border-white bg-pink-500 text-3xl font-bold text-white">{profile.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span>}
                <span className="absolute inset-0 grid place-items-center rounded-full bg-navy-950/50 opacity-0 transition group-hover:opacity-100"><Camera className="text-white" /></span>
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => onAvatar(e.target.files?.[0])} />
              </label>
              <button className="btn-secondary" onClick={() => (editing ? (saveDraft(), setEditing(false)) : setEditing(true))}>
                {editing ? <><Save size={16} /> Salvar</> : <><Pencil size={16} /> Editar</>}
              </button>
            </div>
            <h2 className="mt-3 text-xl font-extrabold">{profile.name}</h2>
            <p className="text-sm text-slate-500">{profile.email}</p>
            <div className="mt-2"><TrackBadge track={profile.track_type} /></div>

            {editing ? (
              <div className="mt-4 space-y-3">
                <div><label className="label" htmlFor="pbio">Minibiografia</label><textarea id="pbio" rows={3} className="input" value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} /></div>
                <div><label className="label" htmlFor="pli">LinkedIn</label><input id="pli" className="input" value={draft.linkedin_url} onChange={(e) => setDraft({ ...draft, linkedin_url: e.target.value })} /></div>
              </div>
            ) : (
              <>
                <p className="mt-4 text-sm text-slate-700">{profile.bio || "Adicione uma minibiografia."}</p>
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:underline"><Linkedin size={16} /> LinkedIn</a>
                )}
              </>
            )}

            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <span className="flex min-w-0 items-center gap-2 text-sm"><FileText size={18} className="shrink-0 text-pink-500" /><span className="truncate">{profile.cv_url ? profile.cv_url.split("/").pop() : "Nenhum currículo enviado"}</span></span>
              <label className="btn-primary cursor-pointer !px-3 !py-2 text-xs"><Upload size={14} /> Atualizar CV
                <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => onCv(e.target.files?.[0])} />
              </label>
            </div>
            {cvMsg && <p className="mt-2 text-xs text-slate-600" aria-live="polite">{cvMsg}</p>}

            <h3 className="mt-6 text-sm font-bold">Áreas de interesse</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {AREAS.map((a) => (
                <button key={a} onClick={() => toggleInterest(a)} aria-pressed={profile.interests.includes(a)}
                  className={`chip border ${profile.interests.includes(a) ? "border-pink-500 bg-pink-500 text-white" : "border-slate-200 text-slate-600 hover:border-pink-300"}`}>{a}</button>
              ))}
            </div>
          </div>
        </section>

        <div className="space-y-6">
          {/* Nível */}
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Nível atual</h2>
              <span className="text-sm text-slate-500">{profile.xp} XP</span>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {LEVEL_NAMES.map((n, i) => (
                <div key={n} className="text-center">
                  <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${i < lp.level ? "bg-solar-400 shadow-md shadow-solar-500/30" : "bg-slate-100"}`}>
                    <Star size={22} className={i < lp.level ? "fill-white text-white" : "text-slate-300"} />
                  </div>
                  <p className={`mt-1 text-[11px] font-medium ${i + 1 === lp.level ? "text-pink-600" : "text-slate-500"}`}>Nv {i + 1}<span className="hidden sm:inline"> · {n}</span></p>
                </div>
              ))}
            </div>
            <ProgressBar value={lp.pct} label="Progresso para o próximo nível" className="mt-5" />
            <p className="mt-2 text-xs text-slate-500">{lp.isMax ? "Você atingiu o nível máximo: Protagonista! 🎉" : `Faltam ${lp.next - profile.xp} XP para o nível ${lp.level + 1}.`}</p>
          </section>

          {/* Medalhas */}
          <section className="card p-6">
            <h2 className="flex items-center gap-2 font-bold"><Award size={18} className="text-solar-500" /> Medalhas ({medals.filter((m) => m.on).length}/{medals.length})</h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {medals.map((m) => (
                <li key={m.title} className={`rounded-2xl p-3 text-center ${m.on ? "bg-solar-400/15" : "bg-slate-50 opacity-60 grayscale"}`} aria-label={`${m.title}: ${m.on ? "conquistada" : "bloqueada"}`}>
                  <span className={`mx-auto grid h-11 w-11 place-items-center rounded-full ${m.on ? "bg-gradient-to-br from-solar-400 to-solar-500 text-white" : "bg-slate-200 text-slate-400"}`}><m.icon size={20} /></span>
                  <p className="mt-2 text-xs font-bold">{m.title}</p>
                  <p className="text-[11px] text-slate-500">{m.desc}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="card flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">Quer testar o fluxo do zero (outra trilha)?</p>
            <div className="flex gap-2">
              <Link href="/onboarding" className="btn-secondary">Refazer diagnóstico</Link>
              <button className="btn-secondary" onClick={resetDemo}><RotateCcw size={16} /> Resetar demo</button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
