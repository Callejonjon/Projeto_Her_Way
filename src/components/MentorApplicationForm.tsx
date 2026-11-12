"use client";

import {useEffect,useState} from "react";
import {FileText,Send,CheckCircle2,ShieldCheck} from "lucide-react";
import {supabase} from "@/lib/supabase";
import {useStore} from "@/lib/store";

const SPECIALTIES=["Asset Management","Investment Banking","Crédito","Research","Tech & Dados"] as const;
type Pending={id:string;status:string;created_at:string};
export default function MentorApplicationForm(){
 const {authUser}=useStore();
 const [fullName,setFullName]=useState("");
 const [role,setRole]=useState("");
 const [specialty,setSpecialty]=useState<string>(SPECIALTIES[0]);
 const [years,setYears]=useState("2");
 const [motivation,setMotivation]=useState("");
 const [linkedin,setLinkedin]=useState("");
 const [resume,setResume]=useState<File|null>(null);
 const [photo,setPhoto]=useState<File|null>(null);
 const [consent,setConsent]=useState(false);
 const [current,setCurrent]=useState<Pending|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [sent,setSent]=useState(false);
 useEffect(()=>{
  if(!supabase||!authUser){setLoading(false);return;}
  let alive=true;
  const client=supabase;
  void client.from("mentor_applications").select("id,status,created_at").eq("applicant_id",authUser.id)
   .eq("status","pending").order("created_at",{ascending:false}).limit(1).maybeSingle()
   .then(({data,error:err})=>{
    if(!alive)return;
    if(err)setError("Não foi possível verificar sua candidatura: "+err.message);
    else setCurrent(data as Pending|null);
    setLoading(false);
   });
  return()=>{alive=false};
 },[authUser]);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!supabase||!authUser||busy||current||!consent)return;
  setError("");setBusy(true);
  try{
   if(!resume||resume.type!=="application/pdf"||resume.size>5*1024*1024||resume.size<1024)
    throw new Error("Anexe um currículo PDF válido de até 5 MB.");
   if(!photo||!["image/jpeg","image/png","image/webp"].includes(photo.type)||photo.size>2*1024*1024||photo.size<1024)
    throw new Error("Anexe uma foto profissional JPG, PNG ou WebP de até 2 MB.");
   if(fullName.trim().length<5||role.trim().length<4||motivation.trim().length<30)
    throw new Error("Confira o nome, cargo e a apresentação (mínimo de 30 caracteres).");
   if(linkedin.trim()&&!/^https:\/\/(www\.)?linkedin\.com\//i.test(linkedin.trim()))
    throw new Error("Informe um endereço válido do LinkedIn ou deixe em branco.");
   const path=`${authUser.id}/${crypto.randomUUID()}.pdf`;
   const ext=photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg";
   const photoPath=`students/${authUser.id}/mentor-application-${crypto.randomUUID()}.${ext}`;
   const uploaded=await supabase.storage.from("mentor-cvs").upload(path,resume,{
    contentType:"application/pdf",upsert:false,
   });
   if(uploaded.error)throw new Error("Falha ao enviar o currículo: "+uploaded.error.message);
   const uploadedPhoto=await supabase.storage.from("profile-photos").upload(photoPath,photo,{
    contentType:photo.type,upsert:false,
   });
   if(uploadedPhoto.error){
    await supabase.storage.from("mentor-cvs").remove([path]);
    await supabase.storage.from("profile-photos").remove([photoPath]);
    throw new Error("Falha ao enviar a foto profissional: "+uploadedPhoto.error.message);
   }
   const result=await supabase.from("mentor_applications").insert({
    applicant_id:authUser.id,
    full_name:fullName.trim(),professional_role:role.trim(),
    specialty,experience_years:Number(years),
    motivation:motivation.trim(),linkedin_url:linkedin.trim()||null,
    resume_path:path,photo_path:photoPath,status:"pending",
   }).select("id,status,created_at").single();
   if(result.error){
    await supabase.storage.from("mentor-cvs").remove([path]);
    throw new Error("Não foi possível cadastrar a solicitação: "+result.error.message);
   }
   setCurrent(result.data as Pending);setSent(true);setResume(null);setPhoto(null);
  }catch(err){setError(err instanceof Error?err.message:"Não foi possível enviar sua candidatura.");}
  finally{setBusy(false);}
 }
 return <section id="quero-ser-mentora" className="card scroll-mt-24 border border-pink-100 p-5 sm:p-7" aria-labelledby="become-mentor-title">
  <div className="mb-4 flex items-center gap-2"><ShieldCheck className="text-pink-500" size={22}/><h2 id="become-mentor-title" className="text-lg font-extrabold">Quero ser mentora</h2></div>
  <p className="mb-5 text-sm text-slate-600">Compartilhe sua experiência com outras mulheres do mercado financeiro. Toda candidatura é avaliada pela equipe da Her Way antes da publicação de qualquer perfil.</p>
  {loading?<p className="text-sm text-slate-500">Verificando sua candidatura...</p>:current?
   <div role="status" className="rounded-xl border border-pink-200 bg-pink-50 p-5">
    <p className="flex items-center gap-2 font-bold text-navy-950"><CheckCircle2 size={18} className="text-pink-600"/>{sent?"Candidatura enviada!":"Sua candidatura está em análise"}</p>
    <p className="mt-2 text-sm text-slate-700">Recebemos sua solicitação. Ela está pendente de avaliação pela administração. Enviar o formulário não cria automaticamente um perfil público de mentora.</p>
   </div>:
  <form onSubmit={e=>void submit(e)} className="grid gap-4 sm:grid-cols-2">
   <div><label htmlFor="mentor-apply-name" className="label">Nome completo *</label><input id="mentor-apply-name" className="input" required minLength={5} maxLength={120} autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)}/></div>
   <div><label htmlFor="mentor-apply-role" className="label">Cargo e empresa atual *</label><input id="mentor-apply-role" className="input" required minLength={4} maxLength={160} placeholder="Ex.: Analista de investimentos" value={role} onChange={e=>setRole(e.target.value)}/></div>
   <div><label htmlFor="mentor-apply-specialty" className="label">Área de especialidade *</label><select id="mentor-apply-specialty" className="input" value={specialty} onChange={e=>setSpecialty(e.target.value)}>{SPECIALTIES.map(k=><option key={k} value={k}>{k}</option>)}</select></div>
   <div><label htmlFor="mentor-apply-years" className="label">Anos de experiência *</label><input id="mentor-apply-years" className="input" type="number" min={0} max={60} required value={years} onChange={e=>setYears(e.target.value)}/></div>
   <div className="sm:col-span-2"><label htmlFor="mentor-apply-linkedin" className="label">LinkedIn (opcional)</label><input id="mentor-apply-linkedin" className="input" type="url" placeholder="https://www.linkedin.com/in/..." value={linkedin} onChange={e=>setLinkedin(e.target.value)}/></div>
   <div className="sm:col-span-2"><label htmlFor="mentor-apply-intro" className="label">Por que você quer ser mentora? *</label><textarea id="mentor-apply-intro" className="input min-h-28" required minLength={30} maxLength={1500} placeholder="Conte sobre sua trajetória e como gostaria de apoiar outras mulheres..." value={motivation} onChange={e=>setMotivation(e.target.value)}/><p className="mt-1 text-xs text-slate-500">{motivation.trim().length}/1500 caracteres</p></div>
   <div className="sm:col-span-2"><label htmlFor="mentor-apply-photo" className="label">Foto de perfil profissional *</label>
    <input id="mentor-apply-photo" type="file" accept="image/jpeg,image/png,image/webp" className="input" required onChange={e=>setPhoto(e.target.files?.[0]??null)}/>
    <p className="mt-1 text-xs text-slate-500">JPG, PNG ou WebP de até 2 MB. A foto será publicada no perfil da mentora somente após aprovação.</p>
   </div>
   <div className="sm:col-span-2"><label htmlFor="mentor-apply-cv" className="label">Currículo em PDF *</label><input id="mentor-apply-cv" type="file" accept=".pdf,application/pdf" className="input" required onChange={e=>setResume(e.target.files?.[0]??null)}/><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><FileText size={13}/> PDF de até 5 MB; acessível apenas à candidata e à administração.</p></div>
   <label className="flex items-start gap-2 text-xs text-slate-600 sm:col-span-2"><input type="checkbox" className="mt-0.5 accent-pink-500" checked={consent} onChange={e=>setConsent(e.target.checked)} required/><span>Autorizo o uso das informações e do currículo exclusivamente para avaliação da candidatura de mentoria pela equipe Her Way. *</span></label>
   <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
    <span className="text-xs text-slate-500">Sua candidatura não será publicada automaticamente.</span>
    <button type="submit" className="btn-primary" disabled={busy||!consent||!resume||!photo}><Send size={16}/>{busy?"Enviando currículo e candidatura...":"Enviar candidatura"}</button>
   </div>
  </form>}
  {error&&<p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
 </section>;
}
