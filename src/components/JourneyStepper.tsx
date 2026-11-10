"use client";
import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { useStore } from "@/lib/store";

export const STAGES = [
  { n: 1, title: "Inscrição e diagnóstico", desc: "Cadastro, questionário e definição da trilha", href: "/onboarding" },
  { n: 2, title: "Formação básica", desc: "Conceitos técnicos, áreas do mercado e soft skills", href: "/cursos" },
  { n: 3, title: "Mentoria e networking", desc: "Match com mentora, eventos e comunidade", href: "/mentoria" },
  { n: 4, title: "Preparação para processos", desc: "Currículo, LinkedIn e simulação de entrevistas", href: "/cursos" },
  { n: 5, title: "Conclusão e oportunidades", desc: "Plano de carreira, vagas ou novo ciclo", href: "/vagas" },
] as const;

/** Trilha horizontal das 5 etapas (Dashboard): concluída · em andamento · em breve. */
export default function JourneyStepper() {
  const { journey } = useStore();
  const current = journey.stagesDone[5] ? 6 : journey.currentStage;

  return (
    <>
      <ol className="relative grid grid-cols-5" aria-label="Progresso nas 5 etapas">
        {STAGES.map((s) => {
          const done = journey.stagesDone[s.n];
          const isCurrent = s.n === current;
          const status = done ? "Concluída" : isCurrent ? "Em andamento" : "Em breve";
          return (
            <li key={s.n} className="relative flex flex-col items-center text-center">
              {/* Conector até a próxima etapa (rosa quando esta etapa já foi concluída) */}
              {s.n < 5 && (
                <span aria-hidden className={`absolute left-1/2 top-[22px] h-0.5 w-full -translate-y-1/2 ${done ? "bg-gradient-to-r from-pink-500 to-pink-300" : "bg-slate-200"}`} />
              )}
              <Link href={s.href} aria-label={`Etapa ${s.n}: ${s.title} — ${status}`}
                className={`relative grid h-11 w-11 place-items-center rounded-full text-base font-bold transition hover:scale-105 ${
                  done ? "bg-pink-500 text-white ring-[6px] ring-pink-100"
                    : isCurrent ? "bg-pink-500 text-white ring-[6px] ring-pink-100 shadow-lg shadow-pink-500/30"
                    : "border border-slate-200 bg-slate-100 text-slate-600"}`}>
                {done ? <Check size={20} strokeWidth={3} /> : s.n}
                {!done && s.n === current + 1 && (
                  <span className="absolute -bottom-1 -right-2 grid h-5 w-5 place-items-center rounded-full bg-white text-slate-500 shadow-sm"><Lock size={11} strokeWidth={2.5} /></span>
                )}
              </Link>
              <span className={`mt-3 hidden text-sm font-medium sm:block ${isCurrent ? "text-pink-600" : "text-navy-950"}`}>{s.n}. {s.title}</span>
              <span className={`mt-0.5 hidden text-xs sm:block ${isCurrent ? "text-pink-500" : "text-slate-500"}`}>{status}</span>
            </li>
          );
        })}
      </ol>
      {current <= 5 && (
        <p className="mt-4 text-center text-sm sm:hidden">
          <span className="font-semibold text-pink-600">{current}. {STAGES[current - 1].title}</span>
          <span className="text-slate-500"> · Em andamento</span>
        </p>
      )}
    </>
  );
}
