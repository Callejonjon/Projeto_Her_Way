"use client";
import {useEffect,useState} from "react";
import {CheckCircle2,ClipboardCheck,FileText,RefreshCw,XCircle} from "lucide-react";
import {supabase} from "@/lib/supabase";
import {useStore} from "@/lib/store";

type Application={
 id:string;applicant_id:string;full_name:string;professional_role:string;specialty:string;
 experience_years:number;motivation:string;linkedin_url:string|null;
 resume_path:string;photo_path:string|null;mentor_id:string|null;status:string;review_notes:string|null;created_at:string;
};
export default function MentorApplicationReview(){
 const {isAdmin}=useStore();
 const [list,setList]=useState<Application[]>([]);
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [photos,setPhotos]=useState<Record<string,File|null>>({});
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 async function load(){
  if(!supabase||!isAdmin)return;
  setLoading(true);setError("");
  const {data,error:err}=await supabase.from("mentor_applications").select("id,applicant_id,full_name,professional_role,specialty,experience_years,motivation,linkedin_url,resume_path,photo_path,mentor_id,status,review_notes,created_at")
    .in("status",["pending","approved"]).order("created_at",{ascending:true}).limit(100);
  if(err)setError("Não foi possível consultar candidaturas: "+err.message);
  else setList(((data??[]) as Application[]).filter(a=>a.status==="pending"||(a.status==="approved"&&!a.mentor_id)));
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
 async function publishLegacy(item:Application){
  if(!supabase||busy)return;
  const photo=photos[item.id];
  if(!photo){setError("Selecione a foto profissional para publicar esta candidatura já aprovada.");return;}
  if(!["image/jpeg","image/png","image/webp"].includes(photo.type)||photo.size<1024||photo.size>2*1024*1024){
    setError("A foto deve ser JPG, PNG ou WebP de até 2 MB.");return;
  }
  setBusy(item.id);setError("");setNotice("");
  const ext=photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg";
  const path=`mentors/${crypto.randomUUID()}.${ext}`;
  try{
    const uploaded=await supabase.storage.from("profile-photos").upload(path,photo,{contentType:photo.type,upsert:false});
    if(uploaded.error)throw new Error("Falha ao enviar a foto: "+uploaded.error.message);
    const result=await supabase.rpc("mentor_publish_legacy_approval",{p_application_id:item.id,p_photo_path:path});
    if(result.error){
      await supabase.storage.from("profile-photos").remove([path]);
      throw new Error("Não foi possível publicar o perfil: "+result.error.message);
    }
    setNotice("Perfil da mentora publicado com sucesso!");
    await load();
    window.location.reload();
  }catch(e){
    setError(e instanceof Error?e.message:"Falha ao publicar mentora aprovada.");
  }finally{setBusy(null);}
 }
 async function decide(item:Application,status:"approved"|"rejected"){
  if(!supabase||busy)return;
  setBusy(item.id);setError("");setNotice("");
  try{
   let uploadPath:string|null=null;
   if(status==="approved"&&photos[item.id]){
    const photo=photos[item.id]!;
    if(!["image/jpeg","image/png","image/webp"].includes(photo.type)||photo.size>2*1024*1024||photo.size<1024)
      throw new Error("A foto deve ser JPG, PNG ou WebP de até 2 MB.");
    const ext=photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg";
    uploadPath=`mentors/${crypto.randomUUID()}.${ext}`;
    const uploaded=await supabase.storage.from("profile-photos").upload(uploadPath,photo,{contentType:photo.type,upsert:false});
    if(uploaded.error)throw new Error("Foto não enviada: "+uploaded.error.message);
   }
   const {error:err}=await supabase.rpc("mentor_review_application",{
    p_application_id:item.id,
    p_decision:status,
    p_notes:notes[item.id]?.trim()||null,
    p_photo_path:uploadPath,
   });
   if(err){
    if(uploadPath)await supabase.storage.from("profile-photos").remove([uploadPath]);
    throw new Error(err.message);
   }
   setNotice(status==="approved"
      ?"Candidatura aprovada e mentora cadastrada automaticamente! Ela já está ativa no catálogo. Atualize a página para vê-la."
      :"Candidatura recusada.");
   setPhotos(p=>({...p,[item.id]:null}));
   await load();
   if(status==="approved")window.location.reload();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível avaliar a candidatura.");}
  finally{setBusy(null);}
 
 }
 if(!isAdmin)return null;
 return <section className="card mt-8 p-6" aria-labelledby="mentor-review-title">
  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
   <h2 id="mentor-review-title" className="flex items-center gap-2 text-lg font-bold"><ClipboardCheck size={20} className="text-pink-500"/> Administração · Candidaturas de mentoras</h2>
   <button type="button" className="btn-secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> Atualizar</button>
  </div>
  <p className="mb-4 text-sm text-slate-600">Os currículos são privados. <strong>Ao aprovar, o perfil da mentora é criado e ativado automaticamente</strong> com os dados da candidatura. A agenda é configurada separadamente conforme os horários combinados. Candidaturas aprovadas antes desta atualização aparecem aqui para publicação com uma foto, sem novo cadastro.</p>
  {loading?<p className="text-sm text-slate-500">Consultando candidaturas...</p>:
   list.length===0?<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Nenhuma solicitação pendente.</p>:
   <div className="space-y-4">{list.map(item=><article key={item.id} className="rounded-xl border border-slate-200 p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
     <div className="flex items-center gap-3">
      {item.photo_path&&<img src={supabase?.storage.from("profile-photos").getPublicUrl(item.photo_path).data.publicUrl??""}
        alt={"Foto profissional de "+item.full_name} className="h-16 w-16 shrink-0 rounded-xl border border-pink-100 object-cover"/>}
      <div><h3 className="font-bold">{item.full_name}</h3><p className="text-xs text-slate-600">{item.professional_role} · {item.specialty} · {item.experience_years} ano(s)</p></div>
     </div>
     <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-800">{item.status==="approved"?"Aprovada · falta publicar":"Pendente"}</span>
    </div>
    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{item.motivation}</p>
    <div className="mt-3 flex flex-wrap gap-3 text-xs">
     <button className="inline-flex items-center gap-1 font-semibold text-pink-600 underline" type="button" onClick={()=>void openCv(item)}><FileText size={14}/> Abrir currículo (PDF)</button>
     {item.linkedin_url&&<a href={item.linkedin_url} target="_blank" rel="noreferrer noopener" className="font-semibold text-pink-600 underline">Ver LinkedIn</a>}
    </div>
    <label className="label mt-3" htmlFor={"mentor-review-photo-"+item.id}>Foto profissional {item.status==="approved"?"obrigatória para publicar":"adicional (caso a candidatura não tenha foto)"}</label>
    <input id={"mentor-review-photo-"+item.id} type="file" accept="image/jpeg,image/png,image/webp" className="input" onChange={e=>setPhotos(p=>({...p,[item.id]:e.target.files?.[0]??null}))}/>
    <label className="label mt-3" htmlFor={"mentor-review-"+item.id}>Observação administrativa (opcional)</label>
    <textarea id={"mentor-review-"+item.id} className="input min-h-16" maxLength={1000} value={notes[item.id]??""} onChange={e=>setNotes(n=>({...n,[item.id]:e.target.value}))}/>
    <div className="mt-3 flex flex-wrap gap-2">
     {item.status==="approved"?
       <button type="button" disabled={busy!==null||!photos[item.id]} className="btn-primary" onClick={()=>void publishLegacy(item)}>
        <CheckCircle2 size={16}/> Publicar mentora já aprovada
       </button>:
       <>
        <button type="button" disabled={busy!==null} className="btn-primary" onClick={()=>void decide(item,"approved")}><CheckCircle2 size={16}/> Aprovar e publicar mentora</button>
        <button type="button" disabled={busy!==null} className="btn-secondary" onClick={()=>void decide(item,"rejected")}><XCircle size={16}/> Recusar</button>
       </>}
    </div>
   </article>)}</div>}
  {error&&<p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
  {notice&&<p role="status" className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
 </section>;
}
