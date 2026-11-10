"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeftRight, BarChart3, BookOpen, Briefcase, ChevronRight, FileText, Home, Linkedin, Map, Menu, ShieldCheck, Sparkles, Star, User, Users, X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { LEVEL_NAMES, levelProgress } from "@/lib/engine";
import Brand from "./Brand";
import AuthGate from "./AuthGate";
import { supabase } from "@/lib/supabase";
import { LogOut } from "lucide-react";
import Chatbot from "./Chatbot";
import CelebrationOverlay from "./CelebrationOverlay";
import ProfileBoostDialog from "./ProfileBoostDialog";

const STUDENT_NAV = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/jornada", label: "Minha Jornada", icon: Map },
  { href: "/cursos", label: "Cursos e Quizzes", icon: BookOpen },
  { href: "/mentoria", label: "Mentoria e Networking", icon: Users },
  { href: "/vagas", label: "Mural de Vagas", icon: Briefcase },
  { href: "/perfil", label: "Meu Perfil", icon: User },
];
const ADMIN_NAV = [
  { href: "/admin", label: "Painel de Impacto", icon: BarChart3 },
  { href: "/admin/conteudos", label: "Gerenciar conteúdos", icon: BookOpen },
  { href: "/vagas", label: "Curadoria de Vagas", icon: Briefcase },
  { href: "/mentoria", label: "Mentoras e Eventos", icon: Users },
];

/** Incentivo compacto no rodapé da sidebar enquanto o perfil profissional está incompleto. */
function ProfileBoostCard() {
  const { setProfileBoostOpen } = useStore();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[15px] font-bold leading-snug text-white">Complete seu perfil<br />e ganhe <span className="text-pink-400">+50 XP</span></p>
      <p className="mt-2 text-xs leading-relaxed text-white/60">Conecte seu LinkedIn ou envie seu currículo (opcional).</p>
      <div className="mt-4 flex items-center gap-2.5">
        <button onClick={() => setProfileBoostOpen(true)} aria-label="Conectar LinkedIn"
          className="grid h-10 w-10 place-items-center rounded-full bg-[#0A66C2] text-white shadow-lg shadow-[#0A66C2]/30 transition hover:brightness-110">
          <Linkedin size={18} />
        </button>
        <Link href="/perfil" aria-label="Enviar currículo"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/85 transition hover:bg-white/20">
          <FileText size={18} />
        </Link>
        <button onClick={() => setProfileBoostOpen(true)} aria-label="Completar perfil" className="ml-auto rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function LevelCard({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useStore();
  const lp = levelProgress(profile.xp);
  return (
    <Link href="/perfil" onClick={onNavigate} className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.08]">
      <div className="flex items-center justify-between text-xs text-white/65">
        <span className="flex items-center gap-1"><Star size={14} className="fill-solar-400 text-solar-400" /> Nível {lp.level}</span>
        <span>{profile.xp} XP</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-white">{LEVEL_NAMES[lp.level - 1]}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={lp.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso de nível">
        <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-pink-400 transition-all" style={{ width: `${lp.pct}%` }} />
      </div>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { view, setView, profile, isDemo, isAdmin } = useStore();
  const navMode = isAdmin ? view : "aluna";
  const nav = navMode === "admin" ? ADMIN_NAV : STUDENT_NAV;

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <div className="px-2 pt-2"><Brand light tagline /></div>

      <nav aria-label="Principal" className="mt-8 flex flex-col gap-1.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-3 text-[15px] font-medium transition ${
                active ? "bg-gradient-to-r from-pink-500 to-pink-400 text-white shadow-lg shadow-pink-500/30" : "text-white/80 hover:bg-white/[0.07] hover:text-white"}`}>
              <Icon size={20} strokeWidth={1.8} aria-hidden /> {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-6">
        {navMode === "aluna" ? (
          profile.linkedin_url ? <LevelCard onNavigate={onNavigate} /> : <ProfileBoostCard />
        ) : (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs text-white/80">
            <p className="flex items-center gap-2"><ShieldCheck size={16} className="text-solar-400" /> Área restrita: gestão e banca avaliadora</p>
            <button onClick={() => { setView("aluna"); router.push("/"); onNavigate?.(); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 font-semibold text-white hover:bg-white/20">
              <ArrowLeftRight size={14} /> Voltar à visão da aluna
            </button>
          </div>
        )}
        {!isDemo && <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10" onClick={async () => { await supabase?.auth.signOut(); router.replace("/login"); }}><LogOut size={16} /> Sair da conta</button>}
        {isDemo && (
          <p className="flex items-center gap-1.5 px-1 text-[11px] text-white/45"><Sparkles size={12} /> Modo demonstração (mock data)</p>
        )}
      </div>
    </div>
  );
}

const SIDEBAR_BG = "bg-[radial-gradient(120%_60%_at_0%_100%,rgba(236,72,153,0.22),transparent_60%),linear-gradient(180deg,#0A192F_0%,#101B45_55%,#1C1A4A_100%)]";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { view, isAdmin } = useStore();
  const publicPage = ["/login", "/cadastro", "/recuperar-senha", "/auth/callback", "/auth/reset"].includes(pathname);
  useEffect(() => setOpen(false), [pathname]);

  if (publicPage) return <AuthGate>{children}</AuthGate>;

  return (
    <AuthGate><div className="min-h-screen lg:pl-[264px]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Pular para o conteúdo
      </a>

      {/* Sidebar desktop */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden w-[264px] overflow-y-auto lg:block ${SIDEBAR_BG}`}>
        <SidebarContent />
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-navy-950 px-4 py-3 lg:hidden">
        <Brand light />
        <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="rounded-lg p-2 text-white hover:bg-white/10"><Menu /></button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <aside className={`absolute inset-y-0 left-0 w-[280px] animate-fade-in overflow-y-auto ${SIDEBAR_BG}`}>
            <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="absolute right-3 top-4 rounded-lg p-2 text-white hover:bg-white/10"><X size={20} /></button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main id="conteudo" className="mx-auto max-w-[1640px] px-4 py-5 sm:px-6 lg:px-7 lg:py-5">{children}</main>

      {(view === "aluna" || !isAdmin) && <Chatbot />}
      <ProfileBoostDialog />
      <CelebrationOverlay />
    </div></AuthGate>
  );
}
