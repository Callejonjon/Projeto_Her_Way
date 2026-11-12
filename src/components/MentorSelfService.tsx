"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {CalendarDays,Camera,CheckCircle2,Clock,Plus,Trash2,Upload,ShieldCheck} from "lucide-react";
import {supabase} from "@/lib/supabase";
import {useStore} from "@/lib/store";

type MentorRecord={id:string;user_id:string;mentor_name:string;photo_path:string|null;active:boolean};
type Slot={id:string;mentor_id:string;starts_at:string;ends_at:string;is_booked:boolean};
const zone="America/Sao_Paulo";
const hm=new Intl.DateTimeFormat("pt-BR",{timeZone:zone,hour:"2-digit",minute:"2-digit",hour12:false});
const dateFormatter=new Intl.DateTimeFormat("en-CA",{timeZone:zone,day:"2-digit",month:"2-digit",year:"numeric"});
const prettyDate=new Intl.DateTimeFormat("pt-BR",{timeZone:zone,weekday:"short",day:"2-digit",month:"short"});
const weekdayFmt=new Intl.DateTimeFormat("pt-BR",{timeZone:zone,weekday:"short"});
function dayKey(d:Date){
 const parts=Object.fromEntries(dateFormatter.formatToParts(d).map(x=>[x.type,x.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
}
function shiftKey(key:string,n:number){
 const x=new Date(key+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+n);
 return x.toISOString().slice(0,10);
}
function isoDay(key:string){return new Date(key+"T12:00:00Z");}
const hours=Array.from({length:26},(_,i)=>String(8+Math.floor(i/2)).padStart(2,"0")+":"+(i%2?"30":"00"));

export default function MentorSelfService(){
 const {authUser,profile,refreshProfile}=useStore();
 const [mentor,setMentor]=useState<MentorRecord|null>(null);
 const [loading,setLoading]=useState(true);
 const [schedule,setSchedule]=useState<Slot[]>([]);
 const [day,setDay]=useState("");
 const [chosen,setChosen]=useState<string[]>([]);
 const [repeat,setRepeat]=useState(false);
 const [file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const today=dayKey(new Date());
 const dates=useMemo(()=>Array.from({length:7},(_,i)=>shiftKey(today,i)),[today]);
 const selectedDate=day||today;
 const slotsForDate=schedule.filter(s=>dayKey(new Date(s.starts_at))===selectedDate);
 const hasPhoto=Boolean(mentor?.photo_path);

 const reload=useCallback(async()=>{
  if(!supabase||!authUser)return;
  const client=supabase;
  const [m,slots]=await Promise.all([
   client.from("mentorships").select("id,user_id,mentor_name,photo_path,active")
      .eq("user_id",authUser.id).eq("active",true).maybeSingle(),
   client.rpc("mentor_my_schedule"),
  ]);
  if(m.error){setError("Não foi possível carregar sua conta de mentora: "+m.error.message);setLoading(false);return;}
  setMentor((m.data??null) as MentorRecord|null);
  if(m.data){
   if(slots.error)setError("Não foi possível consultar sua agenda: "+slots.error.message);
   else setSchedule((slots.data??[]) as Slot[]);
  }
  setLoading(false);
 },[authUser]);

 useEffect(()=>{void reload()},[reload]);

 // A previously uploaded profile photo can be reused without asking for a second upload.
 async function useProfilePhoto(){
  if(!supabase||!profile.profile_photo_path||busy)return;
  setBusy(true);setError("");setSuccess("");
  const {error:err}=await supabase.rpc("mentor_set_my_photo",{p_storage_path:profile.profile_photo_path});
  if(err)setError(err.message);else{setSuccess("Sua foto do Meu Perfil agora aparece também no seu perfil de mentora.");await reload();}
  setBusy(false);
 }
 async function uploadPhoto(){
  if(!supabase||!authUser||!file||busy)return;
  setBusy(true);setError("");setSuccess("");
  try{
   if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size<1024||file.size>2*1024*1024)
    throw new Error("Selecione uma foto JPG, PNG ou WebP de até 2 MB.");
   const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
   const path=`students/${authUser.id}/mentor-${crypto.randomUUID()}.${ext}`;
   const up=await supabase.storage.from("profile-photos").upload(path,file,{upsert:false,contentType:file.type});
   if(up.error)throw new Error(up.error.message);
   const link=await supabase.rpc("mentor_set_my_photo",{p_storage_path:path});
   if(link.error)throw new Error(link.error.message);
   // Reuse the platform's photo-registration path and its one-time XP award.
   const profilePhoto=await supabase.rpc("profile_register_photo",{p_storage_path:path});
   if(profilePhoto.error)throw new Error("Foto da mentora salva; não foi possível atualizar Meu Perfil: "+profilePhoto.error.message);
   await refreshProfile();
   setSuccess("Foto salva! Seu perfil de mentora foi atualizado.");setFile(null);
   await reload();
  }catch(e){setError(e instanceof Error?e.message:"Falha ao atualizar sua foto");}
  setBusy(false);
 }
 async function addSlots(){
  if(!supabase||!mentor||busy||chosen.length===0)return;
  setBusy(true);setError("");setSuccess("");
  const datesToAdd=repeat?[0,7,14,21].map(n=>shiftKey(selectedDate,n)):[selectedDate];
  let ok=0;const failures:string[]=[];
  for(const date of datesToAdd)for(const time of chosen){
   const {error:err}=await supabase.rpc("mentor_create_slot",{
    p_mentor:mentor.id,p_brasilia:date+"T"+time+":00",
   });
   if(err)failures.push(`${date} ${time}: ${err.message}`);
   else ok++;
  }
  setChosen([]);
  setSuccess(ok>0?`${ok} horário(s) de 30 minutos publicado(s) na sua agenda.`:"");
  if(failures.length)setError(failures.slice(0,3).join(" • ")+(failures.length>3?` (+${failures.length-3} outros)`:""));
  await reload();setBusy(false);
 }
 async function removeSlot(slot:Slot){
  if(!supabase||busy||slot.is_booked)return;
  if(!window.confirm("Remover este horário livre da sua agenda?"))return;
  setBusy(true);setError("");setSuccess("");
  const {error:err}=await supabase.rpc("mentor_remove_slot",{p_slot:slot.id});
  if(err)setError(err.message);else setSuccess("Horário removido da sua agenda.");
  await reload();setBusy(false);
 }

 if(loading)return <section className="card mt-6 p-6 text-sm text-slate-500">Carregando sua área de mentora...</section>;
 if(!mentor)return null;

 return <section id="minha-agenda-mentora" className="card mt-6 scroll-mt-24 overflow-hidden border border-pink-200 p-5 sm:p-7" aria-labelledby="own-mentor-title">
  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-pink-600"><CheckCircle2 size={16}/> Candidatura aprovada</p>
  <h2 id="own-mentor-title" className="mt-1 text-2xl font-extrabold text-navy-950">Você agora é mentora da Her Way!</h2>
  <p className="mt-2 text-sm text-slate-600">Seu perfil profissional está aprovado. Aqui você atualiza sua foto e controla pessoalmente sua disponibilidade. As alunas só poderão reservar horários que você publicar.</p>
  {error&&<p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
  {success&&<p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{success}</p>}

  <div className="mt-5 rounded-2xl border border-pink-100 bg-pink-50/50 p-4">
   <h3 className="mb-2 flex items-center gap-2 font-bold"><Camera size={18}/> Sua foto de mentora</h3>
   {hasPhoto?<p className="text-sm text-green-800">Foto profissional cadastrada. Você pode alterá-la quando quiser.</p>:
     <p className="text-sm text-slate-700">Você já foi aprovada, mas ainda precisa vincular uma foto para liberar os horários de atendimento.</p>}
   {profile.profile_photo_path&&<button type="button" className="btn-secondary mt-3" disabled={busy} onClick={()=>void useProfilePhoto()}>
     <CheckCircle2 size={16}/> Usar a foto que já tenho em Meu Perfil
   </button>}
   <div className="mt-3 flex flex-wrap items-center gap-2">
    <input type="file" className="input min-w-0 flex-1" accept="image/jpeg,image/png,image/webp"
      aria-label="Enviar foto profissional" onChange={e=>setFile(e.target.files?.[0]??null)}/>
    <button className="btn-secondary shrink-0" disabled={!file||busy} onClick={()=>void uploadPhoto()}><Upload size={16}/> Salvar foto</button>
   </div>
   <p className="mt-1 text-xs text-slate-500">Formatos JPG, PNG e WebP · até 2 MB. Não é necessário pedir aprovação novamente.</p>
  </div>

  <div className="mt-6 border-t border-slate-200 pt-6">
   <h3 className="flex items-center gap-2 text-lg font-extrabold"><CalendarDays size={20} className="text-pink-500"/> Faça sua agenda</h3>
   <p className="mt-2 text-sm text-slate-600">Escolha o dia e marque um ou vários horários. Sessões gratuitas de 30 minutos. Fuso horário: <strong>Brasília (America/Sao_Paulo)</strong>.</p>
   {!hasPhoto&&<p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Associe sua foto acima para liberar a publicação dos horários.</p>}
   <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Dias disponíveis">
    {dates.map(d=><button key={d} type="button" onClick={()=>{setDay(d);setChosen([])}}
      aria-pressed={selectedDate===d}
      className={`min-w-[74px] rounded-xl border px-3 py-2 text-center ${selectedDate===d?"border-pink-500 bg-pink-50":"border-slate-200 hover:border-pink-300"}`}>
       <span className="block text-xs capitalize">{weekdayFmt.format(isoDay(d))}</span>
       <span className="block text-lg font-extrabold">{d.slice(-2)}</span>
      </button>)}
   </div>
   <div className="mt-3 flex flex-wrap items-end gap-3">
    <div><label className="label" htmlFor="mentor-custom-day">Ou selecione outra data</label>
      <input id="mentor-custom-day" type="date" className="input" value={selectedDate}
       min={today} max={shiftKey(today,59)} onChange={e=>{setDay(e.target.value);setChosen([])}}/>
    </div>
    <p className="pb-2 text-xs text-slate-600">Atendimentos entre 8h e 21h30</p>
   </div>
   <div className="mt-4">
    <p className="mb-2 text-sm font-bold">Escolha os horários disponíveis</p>
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
     {hours.map(time=>{
      const taken=slotsForDate.some(s=>hm.format(new Date(s.starts_at))===time);
      const chosenNow=chosen.includes(time);
      return <button key={time} type="button" disabled={!hasPhoto||taken||busy}
       aria-pressed={chosenNow} onClick={()=>setChosen(c=>c.includes(time)?c.filter(v=>v!==time):[...c,time].sort())}
       className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${taken?"border-slate-100 bg-slate-100 text-slate-400":chosenNow?"border-pink-500 bg-pink-500 text-white":"border-slate-200 hover:border-pink-300"} disabled:cursor-not-allowed`}>
       {time}{taken?" ✓":""}
      </button>;
     })}
    </div>
   </div>
   <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
    <input type="checkbox" className="mt-1 accent-pink-500" checked={repeat} onChange={e=>setRepeat(e.target.checked)}/>
    Repetir nos mesmos dias e horários por 4 semanas (se estiverem disponíveis)
   </label>
   <button type="button" className="btn-primary mt-4" disabled={!hasPhoto||chosen.length===0||busy}
     onClick={()=>void addSlots()}><Plus size={17}/>{busy?"Salvando horários...":`Publicar ${chosen.length*(repeat?4:1)} horário(s)`}</button>
  </div>

  <div className="mt-7 border-t border-slate-200 pt-5">
   <h3 className="mb-3 flex items-center gap-2 font-bold"><Clock size={18}/> Seus próximos horários</h3>
   {schedule.length===0?<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Você ainda não disponibilizou horários. Selecione datas e horários acima.</p>:
    <div className="max-h-72 space-y-2 overflow-y-auto">{schedule.map(slot=><div key={slot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
      <span><strong>{prettyDate.format(new Date(slot.starts_at))}</strong> às {hm.format(new Date(slot.starts_at))}</span>
      {slot.is_booked?<span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">Reservado</span>:
       <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700" disabled={busy}
          onClick={()=>void removeSlot(slot)}><Trash2 size={14}/> Remover horário livre</button>}
    </div>)}</div>}
  </div>
 </section>;
}
