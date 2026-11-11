"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, BookOpen, Check, Clock, ExternalLink, FileText, PlayCircle, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import Quiz from "@/components/Quiz";
import type { LessonAsset, Module } from "@/lib/types";

const stages: Record<number,string> = { 2:"Conhecimentos e fundamentos",4:"Carreira e especialização",5:"Consolidação" };
type Filter = "all" | "A" | "B" | "shared";
const filters: {id:Filter;label:string}[]=[
  {id:"all",label:"Todos os cursos"},
  {id:"A",label:"Primeiros Passos"},
  {id:"B",label:"Novos Horizontes"},
  {id:"shared",label:"Ambas as jornadas"},
];

function LessonDetail({module,onClose}:{module:Module;onClose:()=>void}) {
  const {progress}=useStore();
  const [activeTab,setActiveTab]=useState<"pdf" | "quiz">("pdf");
  const [links,setLinks]=useState<Record<string,string>>({});
  const [assetError,setAssetError]=useState("");
  const finished=progress.some(p=>p.module_id===module.id&&p.quiz_score>=70);
  const assets=module.assets??[];
  const assetFor=(kind:LessonAsset["asset_kind"])=>assets.find(a=>a.asset_kind===kind);
  const pdf=assetFor("pdf"),video=assetFor("avatar_video");
  const videoUrl=video?.external_url??(video?links[video.id]:undefined);

  useEffect(()=>{
    let active=true;
    async function sign() {
      if(!supabase)return;
      const signed:Record<string,string>={};
      for(const asset of assets){
        if(!asset.storage_path)continue;
        const {data,error}=await supabase.storage.from("learning-materials").createSignedUrl(asset.storage_path,3600);
        if(error){if(active)setAssetError("Um dos materiais ainda não pôde ser carregado. Tente novamente após a publicação.");continue;}
        if(data?.signedUrl)signed[asset.id]=data.signedUrl;
      }
      if(active)setLinks(signed);
    }
    void sign();return()=>{active=false};
  },[module.id,assets]);

  const href=(asset?:LessonAsset)=>asset ? (asset.external_url??links[asset.id]) : undefined;
  // The lesson PDF is the single in-platform presentation viewer.
  const pdfUrl=href(pdf);
  const quizAvailable=module.quiz.length>0;

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={module.title} onClick={onClose}>
    <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl sm:p-8" onClick={e=>e.stopPropagation()}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold text-pink-600">{stages[module.stage]}</p><h2 className="mt-1 text-xl font-extrabold">{module.title}</h2></div>
        <button className="rounded-lg p-2 hover:bg-slate-100" onClick={onClose} aria-label="Fechar aula"><X size={21}/></button>
      </div>
      {module.reviewRequired&&<p className="mb-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={18}/> Material sujeito à revisão de informações normativas e certificações.</p>}
      <section className="mb-5 space-y-3">
        <h3 className="font-bold">Aula em vídeo</h3>
        {videoUrl ? (
          /\.(mp4|webm)(\?|$)/i.test(videoUrl.split("#")[0]) || video?.storage_path
            ? <video className="aspect-video w-full rounded-xl bg-navy-950" src={videoUrl} controls preload="metadata" playsInline />
            : <a href={videoUrl} rel="noopener noreferrer" target="_blank" className="btn-primary inline-flex items-center gap-2"><PlayCircle size={18}/> Assistir aula com avatar <ExternalLink size={14}/></a>
        ):<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600"><PlayCircle className="mb-2 text-pink-500"/> Vídeo-aula em preparação. O material e os quizzes já podem ser acessados abaixo.</div>}
        {videoUrl&&module.videoSummary&&<p className="rounded-xl bg-pink-50 p-4 text-sm text-slate-700">{module.videoSummary}</p>}
        {videoUrl&&module.videoTranscript&&<details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold">Transcrição do vídeo</summary><p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{module.videoTranscript}</p></details>}
      </section>

      <section className="space-y-4">
        <h3 className="font-bold">Materiais e avaliação</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="tablist" aria-label="Tipo de material">
          <button type="button" role="tab" aria-selected={activeTab==="pdf"} disabled={!pdf} className={activeTab==="pdf"?"btn-primary justify-center":"btn-secondary justify-center"} onClick={()=>setActiveTab("pdf")}><FileText size={17}/> Ver material da aula</button>
          <button type="button" role="tab" aria-selected={activeTab==="quiz"} disabled={!quizAvailable} className={activeTab==="quiz"?"btn-primary justify-center":"btn-secondary justify-center"} onClick={()=>setActiveTab("quiz")}><BookOpen size={17}/> Fazer quiz {quizAvailable?`(${module.quiz.length})`:""}</button>
        </div>

        {activeTab==="pdf"&&<div role="tabpanel" className="space-y-2">
          {pdfUrl ? <iframe title={`Material PDF: ${module.title}`} src={`${pdfUrl}#toolbar=0&navpanes=0`} className="h-[68vh] min-h-80 w-full rounded-xl border border-slate-200 bg-white" /> :
            <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">O arquivo PDF desta aula ainda não está disponível.</p>}
        </div>}

        {activeTab==="quiz"&&<div role="tabpanel">
          {quizAvailable ? <Quiz module={module} onClose={()=>setActiveTab("pdf")} /> :
            <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Este conteúdo não possui quiz interativo cadastrado.</p>}
        </div>}
        {assetError&&<p role="alert" className="text-sm text-amber-700">{assetError}</p>}
      </section>
    </div>
  </div>;
}

function CourseList(){
  const {catalogModules,progress}=useStore();
  const router=useRouter();
  const params=useSearchParams();
  const [filter,setFilter]=useState<Filter>("all");
  const visible=useMemo(()=>catalogModules.filter(m=>filter==="all"||(filter==="shared"?m.track==="all":m.track===filter||m.track==="all")),[catalogModules,filter]);
  const selected=catalogModules.find(m=>m.id===params.get("m"));
  return <div>
    <PageHeader title="Cursos e Quizzes" subtitle="Explore todas as áreas do mercado financeiro no seu ritmo. Os desbloqueios da Minha Jornada continuam independentes."/>
    <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filtrar cursos por jornada">
      {filters.map(f=><button key={f.id} type="button" aria-pressed={filter===f.id} className={filter===f.id?"btn-primary":"btn-secondary"} onClick={()=>setFilter(f.id)}>{f.label}</button>)}
    </div>
    {!visible.length&&<section className="card p-7 text-center"><h2 className="font-bold">Nenhum curso publicado nesta seleção</h2><p className="mt-2 text-sm text-slate-600">Os materiais em revisão editorial não aparecem para as alunas.</p></section>}
    {([2,4,5] as const).map(stage=>{
      const items=visible.filter(m=>m.stage===stage);
      if(!items.length)return null;
      return <section key={stage} className="mb-9">
        <h2 className="mb-4 text-lg font-bold">{stages[stage]}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(m=>{
          const done=progress.some(p=>p.module_id===m.id&&p.quiz_score>=70);
          const score=progress.find(p=>p.module_id===m.id)?.quiz_score;
          return <article key={m.id} className="card flex flex-col p-5">
            <div className="flex items-center justify-between">
              <span className={`rounded-xl p-3 ${done?"bg-amber-100":"bg-pink-100"}`}>{done?<Check size={20}/>:<BookOpen size={20}/>}</span>
              <span className="chip bg-slate-100 text-slate-600">{m.track==="all"?"Ambas as jornadas":m.track==="A"?"Primeiros Passos":"Novos Horizontes"}</span>
            </div>
            <h3 className="mt-4 font-bold">{m.title}</h3><p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-600">{m.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><Clock size={14}/>{m.durationMin} min</span>
              {(m.assets??[]).some(a=>a.asset_kind==="pdf")&&<span>PDF</span>}
              {(m.assets??[]).some(a=>a.asset_kind==="pptx")&&<span>PowerPoint</span>}
              {m.quiz.length>0&&<span>{m.quiz.length} questões</span>}
              {(m.assets??[]).some(a=>a.asset_kind==="avatar_video")&&<span>Aula em vídeo</span>}
            </div>
            {score!==undefined&&m.quiz.length>0&&<p className="mt-2 text-xs text-slate-500">Melhor nota: {score}%</p>}
            <button className="btn-primary mt-4 justify-center" onClick={()=>router.push(`/cursos?m=${encodeURIComponent(m.id)}`,{scroll:false})}>{done?"Revisar":"Acessar conteúdo"}</button>
          </article>;
        })}</div>
      </section>;
    })}
    {selected&&<LessonDetail key={selected.id} module={selected} onClose={()=>router.push("/cursos",{scroll:false})}/>}
  </div>;
}
export default function Cursos(){return <Suspense fallback={<p className="p-8">Carregando biblioteca...</p>}><CourseList/></Suspense>}
