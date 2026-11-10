"use client";
import Link from "next/link";
import { ArrowRight, ChevronRight, Star, Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { LEVEL_NAMES, levelProgress, TRACK_NAMES } from "@/lib/engine";
import { STAGES } from "@/components/JourneyStepper";

const STAGE_COPY: Record<number, string> = {
  1: "Faça seu diagnóstico para descobrirmos juntas o melhor caminho para a sua carreira no mercado financeiro.",
  2: "Continue desenvolvendo seus conhecimentos sobre o mercado financeiro e construa as bases para a sua carreira.",
  3: "Conecte-se com mentoras e com a comunidade: quem já trilhou esse caminho acelera o seu.",
  4: "Prepare-se para os processos seletivos com currículo, LinkedIn, cases e simulações de entrevista.",
  5: "Você está pronta para as oportunidades: explore as vagas e planeje o seu próximo ciclo.",
};
/** A jornada exibida vem do diagnóstico; a alteração é feita apenas em Meu Perfil. */
function TrackTitle() {
  const { profile } = useStore();
  const track = profile.track_type;
  return <h1 className="mt-2 text-[40px] font-extrabold leading-[1.05] tracking-tight text-navy-950 sm:text-[52px]">
    {track ? TRACK_NAMES[track] : "Sua jornada"}
  </h1>;
}

/** Card escuro de nível/XP com incentivo de completar o perfil. */
export function XPCard() {
  const { profile, journey, setProfileBoostOpen } = useStore();
  const lp = levelProgress(profile.xp);
  return (
    <div className="rounded-3xl bg-gradient-to-br from-navy-950 to-[#16224F] p-5 text-white shadow-2xl shadow-navy-950/25 ring-1 ring-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10"><Star size={24} className="fill-solar-400 text-solar-400" /></span>
          <div>
            <p className="text-lg font-semibold leading-tight">Nível <span className="text-2xl font-bold">{lp.level}</span></p>
            <p className="text-sm text-white/65">{LEVEL_NAMES[lp.level - 1]}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold leading-tight">{profile.xp} XP</p>
          <p className="text-sm text-white/65">{lp.isMax ? "nível máximo" : `de ${lp.next} XP`}</p>
        </div>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Progresso para o próximo nível"
        aria-valuenow={lp.pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-pink-400 transition-all duration-700" style={{ width: `${lp.pct}%` }} />
      </div>
      {profile.linkedin_url ? (
        <Link href="/perfil" className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 transition hover:bg-white/10">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-solar-400/15"><Trophy size={20} className="text-solar-400" /></span>
          <span className="flex-1 text-sm leading-snug">Ver minhas conquistas<br /><span className="text-solar-400">{journey.passed.size} {journey.passed.size === 1 ? "módulo concluído" : "módulos concluídos"}</span></span>
          <ChevronRight size={18} className="text-white/70" />
        </Link>
      ) : (
        <button onClick={() => setProfileBoostOpen(true)}
          className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-left transition hover:bg-white/10">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-solar-400/15"><Trophy size={20} className="text-solar-400" /></span>
          <span className="flex-1 text-sm leading-snug">Complete seu perfil<br /><span className="font-semibold text-solar-400">e ganhe +50 XP</span></span>
          <ChevronRight size={18} className="text-white/70" />
        </button>
      )}
    </div>
  );
}

export default function JourneyHero() {
  const { modules, journey } = useStore();
  const stage = STAGES[journey.currentStage - 1];
  const nextModule = modules.find((m) => journey.unlocked.has(m.id) && !journey.passed.has(m.id));
  const cta = journey.currentStage === 1 ? "/onboarding"
    : nextModule ? `/cursos?m=${nextModule.id}`
    : journey.currentStage === 3 ? "/mentoria" : "/vagas";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-[linear-gradient(90deg,#FFFFFF_0%,#FFFFFF_38%,#FCEFF6_58%,#F3E3F1_80%,#E9DDF3_100%)] shadow-soft">
      <div className="relative grid gap-6 p-6 sm:p-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(180px,0.7fr)_330px] xl:items-center xl:py-7 xl:pr-6">
        <div className="max-w-[520px]">
          <TrackTitle />
          <p className="mt-3 text-lg font-semibold text-navy-950 sm:text-xl">
            Você está na <span className="text-pink-500">Etapa {journey.currentStage}: {stage.title}</span>
          </p>
          <p className="mt-2 max-w-[490px] text-[15px] leading-relaxed text-slate-600">{STAGE_COPY[journey.currentStage]}</p>
          <Link href={cta} className="btn-primary mt-6 px-6 py-3 text-base shadow-lg shadow-pink-500/25">
            Continuar minha jornada <ArrowRight size={18} />
          </Link>
        </div>
        <figure className="flex max-w-[300px] flex-col justify-center border-l-2 border-pink-300/70 pl-5 xl:mx-auto">
          <blockquote className="text-lg font-semibold italic leading-relaxed text-navy-800 sm:text-xl">
            “Mais mulheres no mercado financeiro transformam o mercado e a sociedade.”
          </blockquote>
          <span aria-hidden className="mt-4 h-1 w-16 rounded-full bg-pink-500" />
        </figure>
        <XPCard />
      </div>
    </section>
  );
}
