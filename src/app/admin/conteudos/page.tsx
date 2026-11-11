"use client";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import LearningMediaManager from "@/components/admin/LearningMediaManager";
import CourseVideoBulkUploader from "@/components/admin/CourseVideoBulkUploader";

type Course = {
  id:string; title:string; track:"A"|"B"|"all"; stage:2|4|5; order:number;
  durationMin:number; skillsGranted:string[];
  slides:{order:number;title:string;body:string}[];
  quiz:{q:string;options:string[];answer:number;explain:string}[];
  source:string;quizSource?:string|null;reviewRequired:boolean;
};
function validCourse(c: Course) {
  return !!c.id && !!c.title && ["A","B","all"].includes(c.track) &&
    Array.isArray(c.slides) && Array.isArray(c.quiz) &&
    c.quiz.every(q=>q.q && q.options.length===4 && Number.isInteger(q.answer) && q.answer>=0 && q.answer<4);
}
export default function Conteudos() {
  const { isAdmin } = useStore();
  const [courses,setCourses]=useState<Course[]>([]);
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  if (!isAdmin) return <div className="card p-8"><h1 className="text-xl font-bold">Acesso restrito</h1><p>Esta página é exclusiva da administração.</p></div>;
  async function read(file?:File) {
    if (!file) return;
    setStatus("");
    try {
      const parsed:unknown=JSON.parse(await file.text());
      if (!Array.isArray(parsed) || !parsed.every(validCourse)) throw Error("Formato incorreto. Selecione o arquivo catalog.json extraído do pacote.");
      setCourses(parsed);
      setStatus(`${parsed.length} conteúdos verificados e prontos para importação.`);
    } catch(e) {setCourses([]);setStatus(e instanceof Error ? e.message : "Erro ao ler o arquivo.");}
  }
  async function upload() {
    if (!supabase || courses.length===0) return;
    setBusy(true);
    let success=0, fail=0;
    try {
      for (const course of courses) {
        const { error } = await supabase.from("learning_modules").upsert({
          id:course.id,title:course.title,track:course.track,
          stage:course.stage,sort_order:course.order,duration_min:course.durationMin,
          skills_granted:course.skillsGranted,slides:course.slides,quiz:course.quiz,
          source_filename:course.source,quiz_filename:course.quizSource??null,
          review_required:course.reviewRequired,
          published: !course.reviewRequired,
          updated_at:new Date().toISOString(),
        },{onConflict:"id"});
        if(error) { console.error("[import]",course.id,error.message);fail++; }
        else success++;
        setStatus(`Importação: ${success} concluídos, ${fail} erros, ${courses.length-success-fail} restantes.`);
      }
    } finally {setBusy(false);}
    if(fail===0) setStatus(`Importação concluída: ${success} conteúdos no Supabase. Materiais sensíveis a alterações normativas ficam em revisão.`);
  }
  return <div className="mx-auto max-w-3xl">
    <div className="mb-6"><Link href="/admin" className="text-sm text-pink-600">Voltar ao painel</Link><h1 className="mt-2 text-3xl font-extrabold">Gerenciar conteúdos</h1><p className="mt-2 text-sm text-slate-600">Importe o catálogo preparado a partir dos materiais originais da equipe Her Way. Somente administradoras autorizadas podem gravar.</p></div>
    <section className="card space-y-5 p-6">
      <div><h2 className="text-lg font-bold">Importação de cursos e quizzes</h2><p className="text-sm text-slate-600">Extraia o arquivo <strong>catalog.json</strong> do ZIP de importação e selecione-o abaixo.</p></div>
      <input type="file" accept=".json,application/json" className="input" onChange={e=>void read(e.target.files?.[0])}/>
      {courses.length>0 && <div className="rounded-xl bg-slate-50 p-4 text-sm"><p><strong>{courses.length}</strong> cursos · <strong>{courses.reduce((n,c)=>n+c.slides.length,0)}</strong> páginas · <strong>{courses.reduce((n,c)=>n+c.quiz.length,0)}</strong> perguntas</p><p className="mt-2 text-amber-700">Materiais de certificação e tributos sinalizados ficam ocultos até revisão editorial.</p></div>}
      {status && <p role="status" className="rounded-lg bg-pink-50 p-3 text-sm text-navy-950">{status}</p>}
      <button className="btn-primary" disabled={busy || !courses.length} onClick={()=>void upload()}>{busy ? "Importando..." : "Importar para o Supabase"}</button>
    </section>
    <CourseVideoBulkUploader />
    <LearningMediaManager />
  </div>;
}
