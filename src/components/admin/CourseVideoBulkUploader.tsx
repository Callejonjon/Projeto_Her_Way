"use client";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Film, UploadCloud, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

const mappedCourses:Record<string,{id:string;name:string}>={
 "videoaula_areas_do_mercado_financeiro.mp4":{id:"areas-mercado",name:"Áreas do Mercado Financeiro"},
 "videoaula_matematica_financeira.mp4":{id:"matematica-financeira",name:"Matemática Financeira"},
 "videoaula_microeconomia.mp4":{id:"microeconomia",name:"Microeconomia"},
 "videoaula_macroeconomia.mp4":{id:"macroeconomia",name:"Macroeconomia"},
 "videoaula_contabilidade_e_analise_financeira.mp4":{id:"contabilidade-analise",name:"Contabilidade e Análise Financeira"},
 "videoaula_produtos_bancarios_e_derivativos.mp4":{id:"produtos-derivativos",name:"Produtos Bancários e Derivativos"},
};
type QueueItem={file:File;id:string;name:string};
type Result={id:string;name:string;state:"ok"|"error";info:string};
const MAX_SIZE=50*1024*1024;
export default function CourseVideoBulkUploader(){
 const [queue,setQueue]=useState<QueueItem[]>([]);
 const [errors,setErrors]=useState<string[]>([]);
 const [results,setResults]=useState<Result[]>([]);
 const [busy,setBusy]=useState(false);
 const [current,setCurrent]=useState("");
 const [uploaded,setUploaded]=useState<string[]>([]);
 const completed=useMemo(()=>new Set(uploaded),[uploaded]);
 useEffect(()=>{
  if(!supabase)return;
  void supabase.from("learning_assets").select("module_id")
   .eq("asset_kind","avatar_video").then(({data})=>setUploaded((data??[]).map(x=>x.module_id)));
 },[]);
 function pick(files:FileList|null){
  const next:QueueItem[]=[];const issues:string[]=[];const seen=new Set<string>();
  for(const file of Array.from(files??[])){
   const lookup=mappedCourses[file.name.toLowerCase()];
   if(!lookup){issues.push(file.name+": não corresponde aos seis cursos. Nenhum envio será feito.");continue;}
   if(!file.name.toLowerCase().endsWith(".mp4")){issues.push(file.name+": formato inválido.");continue;}
   if(file.size>MAX_SIZE){issues.push(file.name+": arquivo maior que 50 MB. É necessária a versão comprimida antes de enviar.");continue;}
   if(file.size<1024){issues.push(file.name+": arquivo vazio ou inválido.");continue;}
   if(seen.has(lookup.id)){issues.push(file.name+": curso duplicado na seleção.");continue;}
   seen.add(lookup.id);next.push({file,id:lookup.id,name:lookup.name});
  }
  setQueue(next);setErrors(issues);setResults([]);
 }
 async function upload(){
  if(!supabase||busy||!queue.length)return;
  setBusy(true);setResults([]);const successes:string[]=[];
  for(const item of queue){
   setCurrent(item.name);
   try{
    const path=`${item.id}/avatar_video/${item.file.name}`;
    const upload=await supabase.storage.from("learning-materials").upload(path,item.file,{
      contentType:"video/mp4",upsert:true,cacheControl:"3600",
    });
    if(upload.error)throw new Error("Armazenamento: "+upload.error.message);
    // Link is recorded only after Storage confirms the upload.
    const saved=await supabase.from("learning_assets").upsert({
      module_id:item.id,asset_kind:"avatar_video",original_filename:item.file.name,
      storage_path:path,external_url:null,content_type:"video/mp4",
    },{onConflict:"module_id,asset_kind"});
    if(saved.error)throw new Error("Vídeo enviado, mas vínculo com o curso não pôde ser salvo: "+saved.error.message);
    const updated=await supabase.from("learning_modules").update({video_status:"ready"}).eq("id",item.id);
    if(updated.error)throw new Error("Vídeo vinculado, mas o status do módulo não pôde ser atualizado: "+updated.error.message);
    successes.push(item.id);
    setResults(p=>[...p,{id:item.id,name:item.name,state:"ok",info:"MP4 enviado e associado ao curso."}]);
   }catch(e){
    const message=e instanceof Error?e.message:"Falha desconhecida";
    setResults(p=>[...p,{id:item.id,name:item.name,state:"error",info:message}]);
   }
  }
  setUploaded(p=>[...new Set([...p,...successes])]);
  setBusy(false);setCurrent("");
 }
 return <section className="card mt-6 space-y-4 p-5 sm:p-6" aria-labelledby="bulk-videos-heading">
  <div><h2 id="bulk-videos-heading" className="flex items-center gap-2 text-lg font-bold"><Film className="text-pink-500" size={20}/> Publicar as seis videoaulas</h2>
   <p className="mt-1 text-sm text-slate-600">Selecione os MP4. O nome do arquivo determina automaticamente o curso correto. Apenas administradoras têm permissão de envio.</p>
  </div>
  <div className="grid gap-2 sm:grid-cols-2">{Object.entries(mappedCourses).map(([file,course])=>
   <div key={course.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs">
    {completed.has(course.id)?<CheckCircle2 size={15} className="shrink-0 text-green-600"/>:<Film size={15} className="shrink-0 text-slate-400"/>}
    <span className="min-w-0"><strong>{course.name}</strong><span className="block break-all text-slate-500">{file}</span></span>
   </div>)}</div>
  <label htmlFor="herway-6-videos" className="label">Arquivos de videoaula (.mp4)</label>
  <input id="herway-6-videos" type="file" accept="video/mp4,.mp4" multiple className="input" disabled={busy} onChange={e=>pick(e.target.files)}/>
  {errors.length>0&&<div role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><p className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle size={16}/> Arquivos que precisam de ajuste</p>{errors.map(e=><p key={e}>{e}</p>)}</div>}
  <p className="text-xs text-slate-600">{queue.length} vídeos válidos selecionados. Limite: 50 MB por arquivo. Nenhum curso será vinculado antes de confirmar o upload.</p>
  <button type="button" className="btn-primary" onClick={()=>void upload()} disabled={busy||queue.length===0}>
   <UploadCloud size={17}/>{busy?"Enviando "+current+"...":"Enviar e associar videoaulas"}
  </button>
  {results.length>0&&<div className="space-y-2" aria-live="polite">{results.map(r=><div key={r.id} className={`rounded-lg p-3 text-sm ${r.state==="ok"?"bg-green-50 text-green-800":"bg-rose-50 text-rose-800"}`}><strong>{r.name}:</strong> {r.info}</div>)}</div>}
  <p className="text-xs text-slate-500">A reprodução aparece em Cursos e Quizzes → curso correspondente → Aula em vídeo. Vídeos ficam em armazenamento privado, com acesso temporário autenticado.</p>
 </section>;
}
