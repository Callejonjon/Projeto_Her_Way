"use client";
import {useEffect,useState} from "react";
import {CheckCircle2,ClipboardCheck,FileText,RefreshCw,XCircle} from "lucide-react";
import {supabase} from "@/lib/supabase";
import {useStore} from "@/lib/store";

type Application={
 id:string;applicant_id:string;full_name:string;professional_role:string;specialty:string;
 experience_years:number;motivation:string;linkedin_url:string|null;
 resume_path:string;status:string;review_notes:string|null;created_at:string;
};
export default function MentorApplicationReview(){
 const {isAdmin}=useStore();
 const [list,setList]=useState<Application[]>([]);
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 async function load(){
  if(!supabase||!isAdmin)return;
  setLoading(true);setError("");
  const {data,error:err}=await supabase.from("mentor_applications").select("id,applicant_id,full_name,professional_role,specialty,experience_years,motivation,linkedin_url,resume_path,status,review_notes,created_at")
    .eq("status","pending").order("created_at",{ascending:true}).limit(100);
  if(err)setError("Não foi possível consultar candidaturas: "+err.message);
  else setList((data??[]) as Application[]);
  setLoading(false);
 }
 useEffect(()=>{void load()},[isAdmin]);
 async function openCv(item:Application){
  if(!supabase)return;
  setError("");
  const {data,error:err}=await supabase.storage.from("mentor-cvs").createSignedUrl(item.resume_path,60);
  if(err||!data?.signedUrl){setError("Não foi possível abrir o currículo: "+(err?.message??"URL indisponível"));return;}
  window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }
 async function decide(item:Application,status:"approved"|"rejected"){
  if(!supabase||busy)return;
  setBusy(item.id);setError("");setNotice("");
  const {data}=await supabase.auth.getUser();
  if(!data.user){setError("Faça login novamente para revisar candidaturas.");setBusy(null);return;}
  const {error:err}=await supabase.from("mentor_applications").update({
   status,review_notes:notes[item.id]?.trim()||null,
   reviewed_at:new Date().toISOString(),reviewed_by:data.user.id,
  }).eq("id",item.id).eq("status","pending");
  if(err)setError(err.message);
  else{
   setNotice(status==="approved"?"Candidatura aprovada para cadastro manual. Use o formulário administrativo abaixo para verificar foto e ativar a mentora.":"Candidatura recusada e removida da fila.");
   await load();
  }
  setBusy(null);
 }
 if(!isAdmin)return null;
 return <section className="card mt-8 p-6" aria-labelledby="mentor-review-title">
  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
   <h2 id="mentor-review-title" className="flex items-center gap-2 text-lg font-bold"><ClipboardCheck size={20} className="text-pink-500"/> Administração · Candidaturas de mentoras</h2>
   <button type="button" className="btn-secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> Atualizar</button>
  </div>
  <p className="mb-4 text-sm text-slate-600">Os currículos são privados. Aprovar uma solicitação <strong>não publica a mentora</strong>: depois da avaliação, cadastre-a no formulário administrativo, com foto verificada e agenda.</p>
  {loading?<p className="text-sm text-slate-500">Consultando candidaturas...</p>:
   list.length===0?<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Nenhuma solicitação pendente.</p>:
   <div className="space-y-4">{list.map(item=><article key={item.id} className="rounded-xl border border-slate-200 p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
     <div><h3 className="font-bold">{item.full_name}</h3><p className="text-xs text-slate-600">{item.professional_role} · {item.specialty} · {item.experience_years} ano(s)</p></div>
     <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-800">Pendente</span>
    </div>
    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{item.motivation}</p>
    <div className="mt-3 flex flex-wrap gap-3 text-xs">
     <button className="inline-flex items-center gap-1 font-semibold text-pink-600 underline" type="button" onClick={()=>void openCv(item)}><FileText size={14}/> Abrir currículo (PDF)</button>
     {item.linkedin_url&&<a href={item.linkedin_url} target="_blank" rel="noreferrer noopener" className="font-semibold text-pink-600 underline">Ver LinkedIn</a>}
    </div>
    <label className="label mt-3" htmlFor={"mentor-review-"+item.id}>Observação administrativa (opcional)</label>
    <textarea id={"mentor-review-"+item.id} className="input min-h-16" maxLength={1000} value={notes[item.id]??""} onChange={e=>setNotes(n=>({...n,[item.id]:e.target.value}))}/>
    <div className="mt-3 flex flex-wrap gap-2">
     <button type="button" disabled={busy!==null} className="btn-primary" onClick={()=>void decide(item,"approved")}><CheckCircle2 size={16}/> Aprovar candidatura</button>
     <button type="button" disabled={busy!==null} className="btn-secondary" onClick={()=>void decide(item,"rejected")}><XCircle size={16}/> Recusar</button>
    </div>
   </article>)}</div>}
  {error&&<p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
  {notice&&<p role="status" className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
 </section>;
}
