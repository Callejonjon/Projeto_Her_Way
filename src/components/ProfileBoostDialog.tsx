"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Linkedin, Trophy, X } from "lucide-react";
import { useStore } from "@/lib/store";

/** Modal "Complete seu perfil e ganhe +50 XP": conecta o LinkedIn e indica o envio do currículo. */
export default function ProfileBoostDialog() {
  const { profileBoostOpen, setProfileBoostOpen, connectLinkedin, profile } = useStore();
  const [url, setUrl] = useState("");
  const valid = /linkedin\.com\/in\/[\w-]+/i.test(url);
  const close = () => setProfileBoostOpen(false);

  useEffect(() => {
    if (!profileBoostOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setProfileBoostOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profileBoostOpen, setProfileBoostOpen]);

  if (!profileBoostOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="boost-title">
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-md animate-fade-in rounded-3xl bg-white p-6 shadow-2xl">
        <button onClick={close} aria-label="Fechar" className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy-950"><X size={18} /></button>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-solar-400/15"><Trophy className="text-solar-500" /></span>
        <h2 id="boost-title" className="mt-4 text-xl font-extrabold text-navy-950">Complete seu perfil e ganhe <span className="text-pink-500">+50 XP</span></h2>
        <p className="mt-1 text-sm text-slate-500">Seu perfil profissional é privado: empresas parceiras só veem seu progresso de forma anônima.</p>

        <form className="mt-5" onSubmit={(e) => { e.preventDefault(); if (valid) connectLinkedin(url.trim()); }}>
          <label htmlFor="boost-li" className="label flex items-center gap-1.5"><Linkedin size={15} className="text-[#0A66C2]" /> Seu LinkedIn</label>
          <input id="boost-li" type="url" autoFocus className="input" placeholder="https://linkedin.com/in/seu-nome"
            value={url} onChange={(e) => setUrl(e.target.value)} />
          <button type="submit" disabled={!valid} className="btn-primary mt-3 w-full">Conectar e ganhar +50 XP</button>
        </form>

        <Link href="/perfil" onClick={close} className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 p-3 text-sm hover:border-pink-200 hover:bg-pink-50/40">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100"><FileText size={17} className="text-navy-800" /></span>
          <span className="flex-1">
            <span className="block font-semibold text-navy-950">{profile.cv_url ? "Atualizar currículo" : "Enviar currículo"} <span className="font-normal text-slate-400">(opcional)</span></span>
            <span className="text-xs text-slate-500">PDF de até 5 MB, na página Meu Perfil</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
