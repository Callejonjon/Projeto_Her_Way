"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Check, Clock, Lock, X, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import Quiz from "@/components/Quiz";
import type { Module } from "@/lib/types";

const stages: Record<number, string> = { 2: "Formação e conhecimentos", 4: "Carreira e especialização", 5: "Consolidação" };
function Detail({ module, onClose }: { module: Module; onClose: () => void }) {
  const { journey, completeReading } = useStore();
  const [index, setIndex] = useState(0);
  const [quiz, setQuiz] = useState(false);
  const slides = module.slides ?? [];
  const slide = slides[index];
  const finished = journey.passed.has(module.id);

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={module.title} onClick={onClose}>
    <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl sm:p-8" onClick={(e) => e.stopPropagation()}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold text-pink-600">{stages[module.stage]}</p><h2 className="mt-1 text-xl font-extrabold">{module.title}</h2></div>
        <button className="rounded-lg p-2 hover:bg-slate-100" onClick={onClose} aria-label="Fechar aula"><X size={21}/></button>
      </div>
      {module.reviewRequired && <p className="mb-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={18}/> Material sujeito a revisão normativa antes de utilização como referência atualizada.</p>}
      {quiz ? <Quiz module={module} onClose={() => setQuiz(false)} /> : <>
        <div className="mb-3 flex justify-between text-xs font-medium text-slate-500"><span>Material da equipe Her Way</span><span>{slides.length ? `Página ${index+1} de ${slides.length}` : "Material em preparação"}</span></div>
        <article className="min-h-[320px] rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7">
          <h3 className="mb-4 text-xl font-bold text-navy-950">{slide?.title ?? module.title}</h3>
          <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{slide?.body || "Esta aula ainda não tem texto publicado."}</div>
        </article>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button className="btn-secondary" disabled={index===0} onClick={() => setIndex(i=>Math.max(0,i-1))}><ChevronLeft size={16}/> Anterior</button>
          {index < slides.length-1
            ? <button className="btn-primary" onClick={() => setIndex(i=>i+1)}>Próxima página <ChevronRight size={16}/></button>
            : module.quiz.length
              ? <button className="btn-primary" onClick={() => setQuiz(true)}>{finished ? "Refazer quiz" : `Fazer quiz (${module.quiz.length} questões)`}</button>
              : <button className="btn-primary" disabled={finished || !slides.length} onClick={() => completeReading(module.id)}>{finished ? "Material concluído" : "Concluir leitura (+30 XP)"}</button>}
        </div>
      </>}
    </div>
  </div>;
}
function CourseList() {
  const { modules, journey, progress, profile } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("m");
  const selected = modules.find(m=>m.id===id);
  const available = selected && journey.unlocked.has(selected.id);
  return <div>
    <PageHeader title="Formação na prática" subtitle="Conteúdos desenvolvidos pela equipe Her Way, organizados conforme a sua jornada." />
    {modules.length === 0 && <section className="card p-7 text-center"><h2 className="text-lg font-bold">Catálogo em preparação</h2><p className="mt-2 text-sm text-slate-600">Os cursos serão exibidos assim que a equipe publicar o conteúdo no Supabase.</p></section>}
    {([2,4,5] as const).map(stage => {
      const items=modules.filter(m=>m.stage===stage);
      if(!items.length)return null;
      return <section key={stage} className="mb-9">
        <h2 className="mb-4 text-lg font-bold">{stages[stage]}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(m=>{
          const done=journey.passed.has(m.id),unlocked=journey.unlocked.has(m.id);
          const score=progress.find(p=>p.module_id===m.id)?.quiz_score;
          return <article key={m.id} className={`card flex flex-col p-5 ${!unlocked?"opacity-65":""}`}>
            <div className="flex items-center justify-between"><span className={`rounded-xl p-3 ${done?"bg-amber-100":unlocked?"bg-pink-100":"bg-slate-100"}`}>{done?<Check size={20}/>:unlocked?<BookOpen size={20}/>:<Lock size={20}/>}</span>{m.track==="all"&&<span className="chip bg-violet-50 text-violet-700">Ambas as jornadas</span>}</div>
            <h3 className="mt-4 font-bold">{m.title}</h3><p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-600">{m.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Clock size={14}/>{m.durationMin} min</span><span>{m.slides?.length ?? 0} páginas</span>{m.quiz.length>0&&<span>{m.quiz.length} questões</span>}</div>
            {m.quiz.length>0&&score!==undefined&&<p className="mt-2 text-xs text-slate-500">Melhor nota: {score}%</p>}
            <button className={`mt-4 ${unlocked?"btn-primary":"btn-secondary"} justify-center`} disabled={!unlocked} onClick={()=>router.push(`/cursos?m=${m.id}`,{scroll:false})}>{done?"Revisar":unlocked?"Estudar":"Bloqueado"}</button>
          </article>;
        })}</div>
      </section>;
    })}
    {selected && available && <Detail key={selected.id} module={selected} onClose={()=>router.push("/cursos",{scroll:false})}/>}
    {selected && !available && <p className="sr-only">Aula bloqueada nesta etapa.</p>}
  </div>;
}
export default function Cursos(){return <Suspense fallback={<p className="p-8">Carregando cursos...</p>}><CourseList/></Suspense>}
