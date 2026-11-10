"use client";
import { Award, BarChart3, Check, Crown, Lock, PiggyBank, ShieldCheck, Wallet, type LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { COMPETENCIES, competencyProgress, type CompetencyId, type CompetencyStatus } from "@/lib/engine";
import { CardHeader } from "./shared";

const ICONS: Record<CompetencyId, LucideIcon> = {
  mercado: BarChart3, investimentos: PiggyBank, riscos: ShieldCheck, produtos: Wallet, lideranca: Crown,
};
const STATUS: Record<CompetencyStatus, { label: string; tile: string; icon: string; text: string }> = {
  concluida: { label: "Concluída", tile: "border-pink-200 bg-pink-50/60", icon: "bg-pink-500 text-white", text: "text-pink-600" },
  em_progresso: { label: "Em progresso", tile: "border-solar-400/40 bg-amber-50/40", icon: "bg-solar-400/20 text-solar-500", text: "text-solar-500" },
  bloqueada: { label: "Bloqueada", tile: "border-slate-200 bg-slate-50/60", icon: "bg-slate-100 text-slate-400", text: "text-slate-400" },
};

/** "Minhas competências": progresso real por competência (módulos aprovados da trilha). */
export default function CompetenciesSection() {
  const { modules, journey } = useStore();

  return (
    <section className="panel p-6">
      <CardHeader icon={Award} title="Minhas competências" href="/perfil" linkLabel="Ver todas as conquistas"
        aside={<p className="hidden text-sm text-slate-500 wide:block">Complete trilhas, desafios e quizzes para desenvolver novas competências.</p>} />
      <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 wide:grid-cols-5">
        {COMPETENCIES.map((c) => {
          const p = competencyProgress(c.moduleIds, modules, journey);
          const st = STATUS[p.status];
          const Icon = p.status === "bloqueada" ? Lock : ICONS[c.id];
          return (
            <li key={c.id} className={`flex items-center gap-3 rounded-2xl border p-3.5 ${st.tile}`}>
              <span className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full ${st.icon}`}>
                <Icon size={20} strokeWidth={2} aria-hidden />
                {p.status === "concluida" && (
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-white text-pink-500 shadow"><Check size={10} strokeWidth={3.5} /></span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy-950">{c.name}</p>
                <p className={`text-xs font-medium ${st.text}`}>{st.label}{p.total > 0 && p.status !== "bloqueada" && ` · ${p.done}/${p.total}`}</p>
                {p.status !== "bloqueada" && (
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200/80" role="progressbar" aria-label={`Progresso em ${c.name}`}
                    aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`h-full rounded-full ${p.status === "concluida" ? "bg-pink-500" : "bg-solar-400"}`} style={{ width: `${Math.max(p.pct, 6)}%` }} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
