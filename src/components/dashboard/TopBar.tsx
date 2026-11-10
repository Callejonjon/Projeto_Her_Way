"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Bell, BarChart3, Briefcase, CalendarDays, ChevronDown, Star, User } from "lucide-react";
import { useStore } from "@/lib/store";
import { levelProgress } from "@/lib/engine";
import GiroMercado from "@/components/GiroMercado";
import { Avatar } from "./shared";

/** Fecha um popover ao clicar fora ou pressionar Esc. */
function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [ref, open, close]);
}

function Notifications() {
  const { jobs, profile } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  const lp = levelProgress(profile.xp);

  const items = [
    jobs[0] && { icon: Briefcase, text: `Nova vaga: ${jobs[0].title} · ${jobs[0].company}`, href: "/vagas" },
    { icon: CalendarDays, text: "Inscrições abertas para o próximo bate-papo com mentoras", href: "/mentoria" },
    !lp.isMax && { icon: Star, text: `Faltam ${lp.next - profile.xp} XP para o nível ${lp.level + 1}`, href: "/cursos" },
  ].filter(Boolean) as { icon: typeof Bell; text: string; href: string }[];

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label={`Notificações (${items.length} novas)`} aria-expanded={open}
        className="relative grid h-11 w-11 place-items-center rounded-xl text-navy-950 transition hover:bg-white hover:shadow-sm">
        <Bell size={22} strokeWidth={1.8} />
        <span className="absolute right-2.5 top-2 h-2.5 w-2.5 rounded-full border-2 border-base bg-pink-500" aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 animate-fade-in rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">Notificações</p>
          {items.map(({ icon: Icon, text, href }) => (
            <Link key={text} href={href} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-pink-50">
              <Icon size={16} className="mt-0.5 shrink-0 text-pink-500" /> {text}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { profile, setView } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  const lp = levelProgress(profile.xp);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
        className="flex items-center gap-3 rounded-2xl py-1.5 pl-1.5 pr-2 text-left transition hover:bg-white hover:shadow-sm">
        <Avatar src={profile.avatar_url} name={profile.name} className="h-11 w-11" />
        <span className="hidden sm:block">
          <span className="block text-sm font-bold text-navy-950">Olá, {profile.name.split(" ")[0]}!</span>
          <span className="block text-xs text-slate-500">Nível {lp.level} • {profile.xp} XP</span>
        </span>
        <ChevronDown size={18} className={`text-navy-950 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-56 animate-fade-in rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <Link role="menuitem" href="/perfil" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-pink-50">
            <User size={16} className="text-pink-500" /> Meu perfil
          </Link>
          <button role="menuitem" onClick={() => { setView("admin"); router.push("/admin"); }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-pink-50">
            <BarChart3 size={16} className="text-pink-500" /> Painel Admin
          </button>
        </div>
      )}
    </div>
  );
}

/** Barra superior do Dashboard: Giro de Mercado + notificações + menu da usuária. */
export default function TopBar() {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:gap-5">
      <GiroMercado />
      <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-3">
        <Notifications />
        <UserMenu />
      </div>
    </div>
  );
}
