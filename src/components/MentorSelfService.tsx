"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Camera, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";

type OwnedMentor = { id:string; mentor_name:string; photo_path:string|null; photo_url:string|null };
type Slot = { id:string; starts_at:string; ends_at:string };
const zone = "America/Sao_Paulo";
const dateFormat = new Intl.DateTimeFormat("pt-BR",{timeZone:zone,day:"2-digit",month:"2-digit",year:"numeric"});
const timeFormat = new Intl.DateTimeFormat("pt-BR",{timeZone:zone,hour:"2-digit",minute:"2-digit",hour12:false});

export default function MentorSelfService() {
 const {authUser} = useStore();
 const [mentor,setMentor] = useState<OwnedMentor|null>(null);
 const [slots,setSlots] = useState<Slot[]>([]);
 const [date,setDate] = useState("");
 const [time,setTime] = useState("14:00");
 const [photo,setPhoto] = useState<File|null>(null);
 const [loading,setLoading] = useState(true);
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState("");
 const [notice,setNotice] = useState("");

 const reload = useCallback(async () => {
  if(!supabase || !authUser) {setLoading(false);return;}
  const m = await supabase.from("mentorships").select("id,mentor_name,photo_path,photo_url")
   .eq("user_id",authUser.id).eq("active",true).maybeSingle();
  if(m.error){setError("Não foi possível consultar seu cadastro de mentora: "+m.error.message);setLoading(false);return;}
  const owned=(m.data??null) as OwnedMentor|null;
  setMentor(owned);
  if(owned){
   const s=await supabase.from("mentor_slots").select("id,starts_at,ends_at")
    .eq("mentor_id",owned.id).gte("starts_at",new Date().toISOString()).order("starts_at").limit(150);
   if(s.error)setError("Não foi possível consultar sua agenda: "+s.error.message);
   else setSlots((s.data??[]) as Slot[]);
  }
  setLoading(false);
 },[authUser]);
 useEffect(()=>{void reload();},[reload]);

 async function savePhoto(){
  if(!supabase||!authUser||!mentor||!photo||busy)return;
  if(!["image/jpeg","image/png","image/webp"].includes(photo.type)||photo.size<1024||photo.size>2*1024*1024){
   setError("Selecione uma foto JPG, PNG ou WebP de até 2 MB.");return;
  }
  setBusy(true);setError("");setNotice("");
  const ext=photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg";
  const path=`students/${authUser.id}/mentor-profile-${crypto.randomUUID()}.${ext}`;
  try{
   const upload=await supabase.storage.from("profile-photos").upload(path,photo,{contentType:photo.type,upsert:false});
   if(upload.error)throw upload.error;
   const saved=await supabase.rpc("mentor_set_own_photo",{p_photo_path:path});
   if(saved.error){await supabase.storage.from("profile-photos").remove([path]);throw saved.error;}
   setPhoto(null);
   setNotice("Foto profissional salva! Seu perfil já pode aparecer no catálogo.");
   await reload();
   window.location.reload();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar a foto.");}
  finally{setBusy(false);}
 }
 async function createSlot(){
  if(!supabase||!mentor||!mentor.photo_path||!date||busy)return;
  setBusy(true);setError("");setNotice("");
  const r=await supabase.rpc("mentor_create_slot",{p_mentor:mentor.id,p_brasilia:`${date}T${time}:00`});
  if(r.error)setError(r.error.message);
  else{setNotice("Horário publicado para agendamento.");await reload();}
  setBusy(false);
 }
 async function removeSlot(id:string){
  if(!supabase||busy||!window.confirm("Remover este horário? Horários reservados não podem ser removidos."))return;
  setBusy(true);setError("");setNotice("");
  const r=await supabase.rpc("mentor_remove_slot",{p_slot:id});
  if(r.error)setError(r.error.message);
  else{setNotice("Horário removido.");await reload();}
  setBusy(false);
 }
 if(loading)return <div className="card mt-6 p-5 text-sm text-slate-600">Verificando seu perfil de mentora...</div>;
 if(!mentor)return null;
 return <section className="card mt-8 border border-pink-200 p-5 sm:p-7" aria-labelledby="mentor-self-title">
  <h2 id="mentor-self-title" className="flex items-center gap-2 text-lg font-extrabold"><CalendarDays size={20} className="text-pink-500"/> Minha área de mentora</h2>
  <p className="mt-2 text-sm text-slate-600">Olá, {mentor.mentor_name}. Sua foto profissional é obrigatória para publicar seu perfil e abrir horários. Você gerencia sua própria agenda.</p>
  {error&&<p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
  {notice&&<p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
  <div className="mt-5 rounded-xl border border-slate-200 p-4">
   <h3 className="flex items-center gap-2 font-bold"><Camera size={17}/> Foto profissional obrigatória</h3>
   {mentor.photo_path&&mentor.photo_url?
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mentor.photo_url} alt="Sua foto profissional" className="mt-3 h-20 w-20 rounded-full object-cover"/>:
    <p className="mt-2 text-sm text-amber-700">Seu perfil não será exibido no catálogo nem poderá abrir horários até você adicionar uma foto.</p>}
   <label htmlFor="mentor-own-photo" className="label mt-3"> {mentor.photo_path?"Atualizar foto":"Adicionar foto *"}</label>
   <input id="mentor-own-photo" type="file" accept="image/jpeg,image/png,image/webp" className="input" onChange={e=>setPhoto(e.target.files?.[0]??null)}/>
   <p className="mt-1 text-xs text-slate-500">JPG, PNG ou WebP, até 2 MB.</p>
   <button type="button" className="btn-primary mt-3" onClick={()=>void savePhoto()} disabled={!photo||busy}>{busy?"Salvando...":"Salvar foto profissional"}</button>
  </div>
  <div className="mt-5 rounded-xl border border-slate-200 p-4">
   <h3 className="font-bold">Disponibilizar horários de mentoria</h3>
   <p className="mt-1 text-sm text-slate-600">Sessões de 30 minutos, no horário de Brasília. Cadastre horários entre 2 horas e 60 dias no futuro.</p>
   <div className="mt-3 grid gap-3 sm:grid-cols-2">
    <div><label htmlFor="mentor-self-date" className="label">Data</label><input id="mentor-self-date" type="date" className="input" value={date} onChange={e=>setDate(e.target.value)}/></div>
    <div><label htmlFor="mentor-self-time" className="label">Horário</label><select id="mentor-self-time" className="input" value={time} onChange={e=>setTime(e.target.value)}>
     {Array.from({length:28},(_,i)=>{const v=`${String(Math.floor(i/2)+7).padStart(2,"0")}:${i%2?"30":"00"}`;return <option key={v} value={v}>{v}</option>;})}
    </select></div>
   </div>
   <button type="button" className="btn-primary mt-3" disabled={!mentor.photo_path||!date||busy} onClick={()=>void createSlot()}><CalendarDays size={16}/> Publicar horário</button>
   <h4 className="mt-5 font-bold">Meus horários cadastrados</h4>
   {slots.length===0?<p className="mt-2 text-sm text-slate-500">Você ainda não cadastrou horários futuros.</p>:
    <div className="mt-2 space-y-2">{slots.map(s=><div key={s.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
     <span>{dateFormat.format(new Date(s.starts_at))} às {timeFormat.format(new Date(s.starts_at))}</span>
     <button type="button" className="inline-flex items-center gap-1 text-rose-700 hover:underline" disabled={busy} onClick={()=>void removeSlot(s.id)}><Trash2 size={15}/> Remover se livre</button>
    </div>)}</div>}
  </div>
 </section>;
}
