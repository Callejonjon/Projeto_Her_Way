"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { unpackCourseZip } from "@/lib/unzip-client";

type CourseRow = {id:string;title:string;source_filename:string|null;quiz_filename:string|null;published:boolean};
type Match = {file:File; module:CourseRow; kind:"pdf"|"pptx"|"quiz_pdf"};
const mime:Record<Match["kind"],string>={
  pdf:"application/pdf",
  pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation",
  quiz_pdf:"application/pdf",
};
const normalized=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
function matchFiles(files:File[],courses:CourseRow[]){
  const mapped:Match[]=[];
  const unmatched:string[]=[];
  for(const file of files){
    const name=normalized(file.name);
    let found:Match|undefined;
    for(const course of courses){
      const origin=normalized(course.source_filename??"");
      const quiz=normalized(course.quiz_filename??"");
      const pdfName=origin.endsWith(".pptx")?origin.slice(0,-5)+".pdf":"";
      if(file.name.toLowerCase().endsWith(".pptx")&&name===origin){found={file,module:course,kind:"pptx"};break;}
      if(file.name.toLowerCase().endsWith(".pdf")&&name===pdfName){found={file,module:course,kind:"pdf"};break;}
      if(file.name.toLowerCase().endsWith(".pdf")&&name===quiz){found={file,module:course,kind:"quiz_pdf"};break;}
    }
    if(found)mapped.push(found);else unmatched.push(file.name);
  }
  return {mapped,unmatched};
}
export default function LearningMediaManager(){
  const [courses,setCourses]=useState<CourseRow[]>([]);
  const [files,setFiles]=useState<File[]>([]);
  const [readingZip,setReadingZip]=useState(false);
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  const [moduleId,setModuleId]=useState("");
  const [videoUrl,setVideoUrl]=useState("");
  const [videoSummary,setVideoSummary]=useState("");
  const [transcript,setTranscript]=useState("");
  const [script,setScript]=useState("");
  const [videoBusy,setVideoBusy]=useState(false);
  const {mapped,unmatched}=matchFiles(files,courses);
  useEffect(()=>{
    if(!supabase)return;
    void supabase.from("learning_modules").select("id,title,source_filename,quiz_filename,published").order("title")
      .then(({data,error})=>{
        if(error)setStatus("Não foi possível consultar o catálogo: "+error.message);
        else {setCourses(data??[]);if(data?.length)setModuleId(data[0].id);}
      });
  },[]);
  async function selectZip(file?: File) {
    if (!file) return;
    setReadingZip(true);
    setStatus("Lendo o pacote ZIP...");
    try {
      const unpacked = await unpackCourseZip(file);
      setFiles(unpacked);
      setStatus(`Pacote aberto: ${unpacked.length} PDFs/PowerPoints encontrados. Confira a correspondência antes de importar.`);
    } catch (e) {
      setFiles([]);
      setStatus(e instanceof Error ? e.message : "Não foi possível abrir o ZIP.");
    } finally { setReadingZip(false); }
  }
  async function importAssets(){
    if(!supabase||!mapped.length)return;
    setBusy(true);
    let ok=0,fail=0;
    for(const {file,module,kind} of mapped){
      try{
        if(file.size>50*1024*1024)throw Error("Arquivo excede 50 MB");
        const cleanName=file.name.replace(/[^a-zA-Z0-9._()-]/g,"_");
        const storagePath=`${module.id}/${kind}/${cleanName}`;
        const {error:storeError}=await supabase.storage.from("learning-materials")
          .upload(storagePath,file,{contentType:mime[kind],upsert:true});
        if(storeError)throw storeError;
        const {error:metaError}=await supabase.from("learning_assets").upsert({
          module_id:module.id,asset_kind:kind,original_filename:file.name,
          storage_path:storagePath,external_url:null,content_type:mime[kind],
        },{onConflict:"module_id,asset_kind"});
        if(metaError)throw metaError;
        ok++;
      }catch(e){fail++;console.error("[learning assets]",file.name,e);}
      setStatus(`Arquivos enviados: ${ok} · falhas: ${fail} · restantes: ${mapped.length-ok-fail}`);
    }
    setBusy(false);
    if(!fail){setFiles([]);setStatus(`Importação finalizada: ${ok} arquivos anexados aos respectivos cursos.`);}
  }
  async function saveVideo(){
    if(!supabase||!moduleId)return;
    const trimmed=videoUrl.trim();
    if(trimmed&&!/^https:\/\//i.test(trimmed)){setStatus("O vídeo deve ter endereço https:// válido.");return;}
    setVideoBusy(true);setStatus("");
    try{
      const {error:scriptError}=await supabase.from("learning_modules").update({
        video_script:script.trim()||null,
        video_summary:videoSummary.trim()||null,
        video_transcript:transcript.trim()||null,
        video_status:trimmed?"ready":script.trim()?"script_ready":"not_started",
      }).eq("id",moduleId);
      if(scriptError)throw scriptError;
      if(trimmed){
        const {error:assetError}=await supabase.from("learning_assets").upsert({
          module_id:moduleId,asset_kind:"avatar_video",original_filename:"Aula com avatar",
          storage_path:null,external_url:trimmed,content_type:"video/mp4",
        },{onConflict:"module_id,asset_kind"});
        if(assetError)throw assetError;
      }
      setStatus("Aula com avatar salva. O vídeo aparecerá quando o módulo estiver publicado.");
    }catch(e){setStatus(e instanceof Error?e.message:"Erro ao salvar vídeo");}
    finally{setVideoBusy(false);}
  }
  return <section className="card mt-6 space-y-6 p-6">
    <div><h2 className="text-lg font-bold">Materiais originais e vídeos-avatar</h2><p className="mt-1 text-sm text-slate-600">Envie os PDFs convertidos, os PowerPoints originais e os quizzes PDF. Os arquivos serão vinculados ao curso pelo nome original.</p></div>
    <div className="space-y-3 rounded-xl bg-slate-50 p-4">
      <label htmlFor="media-zip" className="label">Opção recomendada: enviar o ZIP inteiro, sem extrair as pastas</label>
      <input id="media-zip" type="file" accept=".zip,application/zip,application/x-zip-compressed" className="input"
        disabled={readingZip || busy} onChange={e=>void selectZip(e.target.files?.[0])} />
      {readingZip && <p className="text-sm text-slate-600">Abrindo o ZIP...</p>}
      <p className="text-xs text-slate-500">Se você tiver o arquivo herway_materiais_para_upload.zip, selecione-o aqui. A Her Way extrairá os documentos e fará a associação com os cursos.</p>
      <div className="border-t border-slate-200 pt-3">
      <label htmlFor="media-files" className="label">Alternativa: selecionar vários PDF ou PPTX</label>
      <input id="media-files" type="file" accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" multiple
        onChange={e=>setFiles(Array.from(e.target.files??[]))} className="input" />
      </div>
      {files.length>0&&<p className="text-sm text-slate-700">{mapped.length} arquivos reconhecidos de {files.length} selecionados.</p>}
      {unmatched.length>0&&<details className="text-sm text-amber-700"><summary>{unmatched.length} arquivos sem associação automática (não serão enviados)</summary><ul className="mt-2 list-disc pl-5">{unmatched.map(f=><li key={f}>{f}</li>)}</ul></details>}
      <button className="btn-primary" onClick={()=>void importAssets()} disabled={busy||readingZip||!mapped.length}>{busy?"Enviando arquivos...":"Enviar materiais ao Supabase"}</button>
    </div>
    <div className="space-y-3">
      <h3 className="font-bold">Adicionar aula com avatar (vídeo pronto)</h3>
      <p className="text-sm text-slate-600">Gere o vídeo fora da Her Way; cole um link HTTPS de reprodução. Para vídeo MP4 hospedado, a aula exibirá player integrado.</p>
      <label className="label" htmlFor="video-course">Curso</label>
      <select id="video-course" value={moduleId} onChange={e=>setModuleId(e.target.value)} className="input">{courses.map(c=><option key={c.id} value={c.id}>{c.title}{!c.published?" (em revisão)":""}</option>)}</select>
      <label className="label" htmlFor="avatar-url">URL HTTPS do vídeo (MP4 ou página do provedor)</label>
      <input id="avatar-url" className="input" type="url" placeholder="https://..." value={videoUrl} onChange={e=>setVideoUrl(e.target.value)}/>
      <label className="label" htmlFor="avatar-script">Roteiro didático</label>
      <textarea id="avatar-script" className="input min-h-24" value={script} onChange={e=>setScript(e.target.value)} placeholder="Texto para gerar a fala do avatar..." />
      <label className="label" htmlFor="avatar-summary">Resumo da aula</label>
      <textarea id="avatar-summary" className="input min-h-20" value={videoSummary} onChange={e=>setVideoSummary(e.target.value)}/>
      <label className="label" htmlFor="avatar-transcript">Transcrição</label>
      <textarea id="avatar-transcript" className="input min-h-24" value={transcript} onChange={e=>setTranscript(e.target.value)}/>
      <button className="btn-primary" disabled={videoBusy||!moduleId} onClick={()=>void saveVideo()}>{videoBusy?"Salvando...":"Salvar roteiro e vídeo"}</button>
    </div>
    {status&&<p role="status" className="rounded-xl bg-pink-50 p-3 text-sm text-navy-950">{status}</p>}
  </section>;
}
