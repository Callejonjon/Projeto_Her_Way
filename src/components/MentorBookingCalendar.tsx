"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, X, CheckCircle2, AlertCircle, Camera } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import type { Mentor } from "@/lib/types";

type Slot={id:string;mentor_id:string;starts_at:string;ends_at:string};
type Booking={id:string;slot_id:string;status:string;created_at:string;mentor_slots:Slot&{mentorships:{mentor_name:string}|null}};
const zone="America/Sao_Paulo";
const datefmt=new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"});
const hm=new Intl.DateTimeFormat("pt-BR",{timeZone:zone,hour:"2-digit",minute:"2-digit",hour12:false});
const longDate=new Intl.DateTimeFormat("pt-BR",{timeZone:zone,weekday:"long",day:"numeric",month:"long"});
const weekDays=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
function dayKey(iso:string) {
 const p=Object.fromEntries(datefmt.formatToParts(new Date(iso)).map(v=>[v.type,v.value]));
 return `${p.year}-${p.month}-${p.day}`;
}
function futureDays(n=21):{key:string;day:string;dayOfMonth:string}[]{
 const now=new Date();
 // Noon UTC keeps day selection stable across Brazil timezone offset.
 const today=dayKey(now.toISOString());
 return Array.from({length:n},(_,i)=>{
  const noon=new Date(today+"T12:00:00Z");noon.setUTCDate(noon.getUTCDate()+i);
  const key=noon.toISOString().slice(0,10), weekday=noon.getUTCDay();
  return {key,day:weekDays[weekday],dayOfMonth:String(noon.getUTCDate()).padStart(2,"0")};
 });
}

export default function MentorBookingCalendar({mentor,onClose}:{mentor:Mentor;onClose:()=>void}){
 const {authUser,profile}=useStore();
 const [slots,setSlots]=useState<Slot[]>([]);
 const [bookings,setBookings]=useState<Booking[]>([]);
 const [selectedDay,setSelectedDay]=useState("");
 const [selectedSlot,setSelectedSlot]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const days=useMemo(()=>futureDays(),[]);
 const today=selectedDay||days[0].key;
 const ownActive=bookings.find(b=>b.status==="confirmed"&&new Date(b.mentor_slots?.ends_at??0).getTime()>Date.now());
 const photoReady=Boolean(profile.profile_photo_path);
 const ownThisMentor=ownActive?.mentor_slots?.mentor_id===mentor.id;
 const dateSlots=slots.filter(s=>dayKey(s.starts_at)===today);
 const reload=useCallback(async()=>{
  if(!supabase||!authUser)return;
  const [s,b]=await Promise.all([
   supabase.rpc("mentor_available_slots",{p_mentor:mentor.id}),
   supabase.from("mentor_bookings").select("id,slot_id,status,created_at,mentor_slots(id,mentor_id,starts_at,ends_at,mentorships(mentor_name))").eq("student_id",authUser.id).eq("status","confirmed"),
  ]);
  if(s.error)setError("Não foi possível carregar os horários: "+s.error.message);
  else setSlots((s.data??[]) as Slot[]);
  if(b.error)setError("Não foi possível consultar suas reservas: "+b.error.message);
  else setBookings((b.data??[]) as unknown as Booking[]);
  setLoading(false);
 },[mentor.id,authUser]);
 useEffect(()=>{void reload();const timer=setInterval(()=>void reload(),30000);return()=>clearInterval(timer)},[reload]);
 async function book(){
  if(!supabase||!selectedSlot||busy)return;
  if(!photoReady){setError("Adicione uma foto no Meu Perfil antes de confirmar a mentoria.");return;}
  setBusy(true);setError("");setSuccess("");
  const r=await supabase.rpc("mentor_book_session",{p_slot:selectedSlot});
  if(r.error)setError(r.error.message);
  else{setSuccess("Mentoria confirmada! Sua reserva foi registrada na Her Way.");setSelectedSlot(null);}
  await reload();setBusy(false);
 }
 async function cancel(){
  if(!supabase||!ownActive||busy)return;
  if(!window.confirm("Deseja cancelar sua mentoria? O horário voltará a ficar disponível para outras alunas."))return;
  setBusy(true);setError("");setSuccess("");
  const r=await supabase.rpc("mentor_cancel_session",{p_booking:ownActive.id});
  if(r.error)setError(r.error.message);else setSuccess("Reserva cancelada com sucesso.");
  await reload();setBusy(false);
 }

 return <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Agenda de ${mentor.mentor_name}`} onClick={onClose}>
  <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-7" onClick={e=>e.stopPropagation()}>
   <div className="mb-5 flex items-start justify-between gap-2">
    <div><p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pink-600"><CalendarDays size={16}/> Agenda de mentoria</p>
     <h2 className="text-xl font-extrabold text-navy-950">{mentor.mentor_name}</h2>
     <p className="mt-1 text-sm text-slate-600">{mentor.mentor_role} · Sessões gratuitas de 30 minutos</p></div>
    <button className="rounded-xl p-2 hover:bg-slate-100" aria-label="Fechar agenda" onClick={onClose}><X size={21}/></button>
   </div>
   <p className="mb-4 flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-sm text-navy-950"><Clock size={17} className="mt-0.5 shrink-0"/> Todos os horários estão no fuso de Brasília (America/Sao_Paulo). Reservas só ficam confirmadas após a validação no servidor.</p>
   {error&&<p role="alert" className="mb-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle size={16}/>{error}</p>}
   {success&&<p role="status" className="mb-3 flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-800"><CheckCircle2 size={16}/>{success}</p>}
   {ownActive&&<section className="mb-5 rounded-xl border border-pink-200 bg-pink-50 p-4">
    <p className="font-bold text-navy-950">Sua mentoria está confirmada</p>
    <p className="mt-1 text-sm text-slate-700">{ownActive.mentor_slots?.mentorships?.mentor_name||"Mentora Her Way"} · {ownActive.mentor_slots?.starts_at?longDate.format(new Date(ownActive.mentor_slots.starts_at)):""} às {ownActive.mentor_slots?.starts_at?hm.format(new Date(ownActive.mentor_slots.starts_at)):""}</p>
    <p className="mt-1 text-xs text-slate-600">A plataforma registra o horário; o link da chamada será combinado com a equipe de mentoria.</p>
    <button className="btn-secondary mt-3" disabled={busy} onClick={()=>void cancel()}>Cancelar minha reserva</button>
   </section>}
   {!photoReady&&!ownActive&&<div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
     <p className="flex items-center gap-2 font-semibold text-amber-900"><Camera size={18}/> Foto necessária para reservar mentoria</p>
     <p className="mt-1 text-sm text-amber-800">A foto é opcional no restante da Her Way. Ao cadastrar sua primeira foto, você também ganha +30 XP.</p>
     <Link href="/perfil" className="btn-secondary mt-3 inline-flex" onClick={onClose}>Adicionar foto em Meu Perfil</Link>
   </div>}
   <h3 className="mb-3 font-bold">Escolha o dia</h3>
   <div className="mb-5 flex gap-2 overflow-x-auto pb-2" aria-label="Selecionar dia">
    {days.map(d=><button key={d.key} type="button" onClick={()=>{setSelectedDay(d.key);setSelectedSlot(null)}} aria-pressed={today===d.key}
     className={`min-w-14 rounded-xl border px-3 py-2 text-center ${today===d.key?"border-pink-500 bg-pink-50 text-pink-700":"border-slate-200 hover:border-pink-300"}`}>
      <span className="block text-xs">{d.day}</span><span className="block text-lg font-extrabold">{d.dayOfMonth}</span>
     </button>)}
   </div>
   <h3 className="mb-3 font-bold">Horários disponíveis <span className="font-normal text-slate-500">· {today.split("-").reverse().join("/")}</span></h3>
   {loading?<p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Consultando disponibilidade...</p>:
    dateSlots.length===0?<p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Nenhum horário disponível neste dia. Escolha outra data ou consulte novamente depois.</p>:
    <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4">{dateSlots.map(slot=><button key={slot.id} type="button"
      onClick={()=>setSelectedSlot(slot.id)} aria-pressed={selectedSlot===slot.id}
      className={`rounded-xl border px-3 py-3 text-sm font-semibold ${selectedSlot===slot.id?"border-pink-500 bg-pink-500 text-white":"border-slate-200 text-navy-950 hover:border-pink-300"}`}>{hm.format(new Date(slot.starts_at))}</button>)}</div>}
   {!ownActive&&dateSlots.length>0&&<button className="btn-primary mt-2 w-full justify-center" disabled={!selectedSlot||busy||!photoReady} onClick={()=>void book()}>
    <CalendarDays size={17}/>{busy?"Confirmando...":"Confirmar horário escolhido"}
   </button>}
   {ownActive&&!ownThisMentor&&<p className="mt-3 text-xs text-slate-500">Para reservar com esta mentora, cancele primeiro sua outra reserva ativa.</p>}

  </div>
 </div>;
}
