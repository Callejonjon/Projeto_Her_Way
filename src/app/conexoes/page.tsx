"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Ban, Check, CheckCheck, Flag, Lock, MessageCircle, Plus, Search,
  Send, ShieldCheck, Trash2, UserPlus, Users, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui";

type NetworkProfile={user_id:string;display_name:string;headline:string;discoverable:boolean};
type Participant={user_id:string;status:"invited"|"accepted"|"declined"};
type Room={id:string;kind:"direct"|"group";title:string;created_by:string;created_at:string;network_participants:Participant[]};
type Message={id:number;conversation_id:string;user_id:string;body:string;created_at:string};
type Report={report_id:number;message_id:number;reason:string;sender_id:string;body:string;created_at:string};
const reasons=[
  {value:"assedio",label:"Assédio ou intimidação"},
  {value:"spam",label:"Spam ou publicidade"},
  {value:"conteudo_inadequado",label:"Conteúdo inadequado"},
  {value:"outro",label:"Outro"},
];
const fmt=(s:string)=>new Date(s).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});

export default function Conexoes(){
 const {authUser,isAdmin,profile}=useStore();
 const [myNetwork,setMyNetwork]=useState<NetworkProfile|null>(null);
 const [directory,setDirectory]=useState<NetworkProfile[]>([]);
 const [rooms,setRooms]=useState<Room[]>([]);
 const [blocked,setBlocked]=useState<string[]>([]);
 const [selected,setSelected]=useState<string[]>([]);
 const [activeId,setActiveId]=useState<string|null>(null);
 const [messages,setMessages]=useState<Message[]>([]);
 const [composer,setComposer]=useState("");
 const [search,setSearch]=useState("");
 const [groupTitle,setGroupTitle]=useState("");
 const [pane,setPane]=useState<"chats"|"people"|"newgroup">("chats");
 const [myName,setMyName]=useState("");
 const [headline,setHeadline]=useState("");
 const [discoverable,setDiscoverable]=useState(false);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [reportId,setReportId]=useState<number|null>(null);
 const [reportReason,setReportReason]=useState("assedio");
 const [reports,setReports]=useState<Report[]>([]);
 const [rules,setRules]=useState(false);
 const uid=authUser?.id;
 const ready=Boolean(myNetwork?.discoverable);

 const loadRooms=useCallback(async()=>{
  if(!supabase||!uid)return;
  const [c,b]=await Promise.all([
   supabase.from("network_conversations").select("id,kind,title,created_by,created_at,network_participants(user_id,status)").order("created_at",{ascending:false}).limit(70),
   supabase.from("community_blocks").select("blocked_id").eq("blocker_id",uid),
  ]);
  if(c.error)setError(c.error.message);
  else setRooms((c.data??[]) as Room[]);
  if(!b.error)setBlocked((b.data??[]).map(v=>v.blocked_id));
 },[uid]);

 const loadDirectory=useCallback(async()=>{
  if(!supabase)return;
  const {data,error}=await supabase.from("network_profiles").select("user_id,display_name,headline,discoverable").eq("discoverable",true).order("display_name").limit(150);
  if(error)setError(error.message);
  else setDirectory((data??[]) as NetworkProfile[]);
 },[]);

 const loadMessages=useCallback(async(cid:string)=>{
  if(!supabase)return;
  const {data,error}=await supabase.from("network_messages").select("id,conversation_id,user_id,body,created_at")
    .eq("conversation_id",cid).order("created_at",{ascending:false}).limit(100);
  if(error)setError(error.message);
  else setMessages(((data??[]) as Message[]).reverse());
 },[]);

 const loadReports=useCallback(async()=>{
  if(!supabase||!isAdmin)return;
  const {data,error}=await supabase.rpc("network_moderation_queue");
  if(error)setError(error.message);
  else setReports((data??[]) as Report[]);
 },[isAdmin]);

 useEffect(()=>{
  if(!supabase||!uid)return;
  let current=true;
  const load=async()=>{
   const {data}=await supabase!.from("network_profiles").select("*").eq("user_id",uid).maybeSingle();
   if(!current)return;
   const net=(data??null) as NetworkProfile|null;
   setMyNetwork(net);
   setMyName(net?.display_name||profile.name?.split(" ")[0]||"");
   setHeadline(net?.headline||"");
   setDiscoverable(Boolean(net?.discoverable));
   await Promise.all([loadRooms(),loadDirectory(),loadReports()]);
   if(current)setLoading(false);
  };
  void load();
  return()=>{current=false};
 },[uid,profile.name,loadRooms,loadDirectory,loadReports]);

 useEffect(()=>{
  if(!activeId||!supabase)return;
  void loadMessages(activeId);
  const client=supabase;
  const channel=client.channel("herway-conexoes-"+activeId)
   .on("postgres_changes",{event:"INSERT",schema:"public",table:"network_messages",filter:"conversation_id=eq."+activeId},
     ()=>void loadMessages(activeId)).subscribe();
  const timer=setInterval(()=>void loadMessages(activeId),20000);
  return()=>{clearInterval(timer);void client.removeChannel(channel)};
 },[activeId,loadMessages]);

 useEffect(()=>{
  if(!uid||!supabase)return;
  const timer=setInterval(()=>{void loadRooms();if(isAdmin)void loadReports();},15000);
  return()=>clearInterval(timer);
 },[uid,loadRooms,loadReports,isAdmin]);

 async function saveVisibility(){
  if(!supabase||!uid||busy)return;
  const display=myName.trim();
  if(display.length<2||display.length>55){setError("Seu nome de exibição precisa ter de 2 a 55 caracteres.");return;}
  setBusy(true);setError("");setNotice("");
  const {data,error}=await supabase.from("network_profiles").upsert({
   user_id:uid,display_name:display,headline:headline.trim().slice(0,100),
   discoverable,updated_at:new Date().toISOString(),
  },{onConflict:"user_id"}).select().single();
  if(error)setError(error.message);
  else {setMyNetwork(data as NetworkProfile);setNotice(discoverable?"Seu perfil está visível no diretório de Conexões.":"Sua conta não aparece mais nas buscas.");await loadDirectory();}
  setBusy(false);
 }

 async function createRoom(targets:string[]){
  if(!supabase||busy)return;
  setBusy(true);setError("");setNotice("");
  const {data,error}=await supabase.rpc("network_new_conversation",{targets,group_title:targets.length>1?groupTitle.trim():""});
  if(error)setError(error.message);
  else {
   setActiveId(String(data));setPane("chats");setSelected([]);setGroupTitle("");
   setNotice(targets.length>1?"Convites enviados. Cada participante precisa aceitar.":"Convite enviado. A conversa ficará disponível quando a outra participante aceitar.");
   await loadRooms();
  }
  setBusy(false);
 }

 async function respond(cid:string,status:"accepted"|"declined"){
  if(!supabase||!uid||busy)return;
  setBusy(true);setError("");
  const {error}=await supabase.from("network_participants").update({status})
   .eq("conversation_id",cid).eq("user_id",uid).eq("status","invited");
  if(error)setError(error.message);
  else {setNotice(status==="accepted"?"Convite aceito!":"Convite recusado.");await loadRooms();}
  setBusy(false);
 }

 async function send(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!supabase||!activeId||!uid||busy||!composer.trim())return;
  setBusy(true);setError("");
  const {error}=await supabase.from("network_messages").insert({
   conversation_id:activeId,user_id:uid,body:composer.trim(),
  });
  if(error)setError(error.message);
  else {setComposer("");await loadMessages(activeId);}
  setBusy(false);
 }

 async function block(target:string){
  if(!supabase||!uid||target===uid)return;
  const {error}=await supabase.from("community_blocks").insert({blocker_id:uid,blocked_id:target});
  if(error){setError(error.message);return;}
  setNotice("Conta bloqueada. A pessoa não poderá enviar novos convites para você.");
  await loadRooms();await loadDirectory();
 }

 async function unblock(target:string){
  if(!supabase||!uid)return;
  const {error}=await supabase.from("community_blocks").delete().eq("blocker_id",uid).eq("blocked_id",target);
  if(error)setError(error.message);else{setNotice("Conta desbloqueada.");await loadRooms();}
 }

 async function reportMessage(){
  if(!supabase||!uid||reportId===null)return;
  setBusy(true);setError("");
  const {error}=await supabase.from("network_reports").insert({message_id:reportId,reporter_id:uid,reason:reportReason});
  if(error)setError(error.code==="23505"?"Esta mensagem já foi denunciada por você.":error.message);
  else{setReportId(null);setNotice("Denúncia encaminhada à equipe de moderação.");}
  setBusy(false);
 }

 async function deleteMessage(id:number,moderate=false){
  if(!supabase||!window.confirm("Excluir esta mensagem?"))return;
  const {error}=moderate
   ? await supabase.rpc("network_moderate_delete",{mid:id})
   : await supabase.from("network_messages").delete().eq("id",id);
  if(error)setError(error.message);
  else{setNotice("Mensagem removida.");if(activeId)await loadMessages(activeId);if(isAdmin)await loadReports();}
 }

 const active=rooms.find(r=>r.id===activeId);
 const membership=active?.network_participants.find(p=>p.user_id===uid)?.status;
 const accepted=active?.network_participants.filter(p=>p.status==="accepted")??[];
 const invited=rooms.filter(r=>r.network_participants.some(p=>p.user_id===uid&&p.status==="invited"));
 const available=directory.filter(p=>p.user_id!==uid&&!blocked.includes(p.user_id)&&
   (p.display_name+" "+p.headline).toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")));
 const nameFor=(id:string)=>id===uid?"Você":directory.find(p=>p.user_id===id)?.display_name||"Participante";
 const titleFor=(room:Room)=>room.kind==="group"?room.title:
   nameFor(room.network_participants.find(p=>p.user_id!==uid)?.user_id||"");
 const safeMessages=messages.filter(m=>!blocked.includes(m.user_id));
 const nowVisible=Boolean(active&&membership==="accepted");
 const displayRooms=rooms.filter(r=>r.network_participants.some(p=>p.user_id===uid&&p.status!=="declined"));

 return <div className="space-y-5">
  <PageHeader eyebrow="Networking Her Way" title="Conexões"
   subtitle="Encontre participantes da comunidade, faça networking e converse em particular ou em grupos por convite."/>
  {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}<button className="ml-3 underline" onClick={()=>setError("")}>Fechar</button></div>}
  {notice&&<div role="status" className="rounded-xl bg-pink-50 px-4 py-3 text-sm text-navy-950">{notice}</div>}
  <div className="grid gap-4 lg:grid-cols-[315px_minmax(0,1fr)]">
   <aside className="space-y-4">
    <section className="card space-y-3 p-5">
     <div className="flex items-center gap-2"><ShieldCheck className="text-pink-500" size={18}/><h2 className="font-bold">Meu perfil na comunidade</h2></div>
     <p className="text-xs text-slate-600">Por padrão você não aparece nas buscas. Ative a visibilidade para enviar e receber convites.</p>
     <label className="label" htmlFor="network-name">Nome exibido</label>
     <input id="network-name" className="input" maxLength={55} value={myName} onChange={e=>setMyName(e.target.value)}/>
     <label className="label" htmlFor="network-headline">Apresentação profissional (opcional)</label>
     <input id="network-headline" className="input" maxLength={100} placeholder="Ex.: Estudante de Economia | Interesse em Research" value={headline} onChange={e=>setHeadline(e.target.value)}/>
     <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-pink-500" checked={discoverable} onChange={e=>setDiscoverable(e.target.checked)}/> Quero aparecer no diretório de Conexões</label>
     <button className="btn-primary w-full justify-center" onClick={()=>void saveVisibility()} disabled={busy||!myName.trim()}>{busy?"Salvando...":"Salvar preferências"}</button>
    </section>
    <section className="card space-y-3 p-4">
     <div className="flex flex-wrap gap-2">
      <button className={pane==="chats"?"btn-primary":"btn-secondary"} onClick={()=>setPane("chats")}><MessageCircle size={16}/> Conversas</button>
      <button className={pane==="people"?"btn-primary":"btn-secondary"} onClick={()=>{setPane("people");void loadDirectory();}}><Search size={16}/> Pessoas</button>
      <button className={pane==="newgroup"?"btn-primary":"btn-secondary"} onClick={()=>{setPane("newgroup");void loadDirectory();}}><Plus size={16}/> Grupo</button>
     </div>
     {pane==="chats"&&<>
      <h3 className="text-sm font-bold">Minhas conversas {loading?"(carregando…)":`(${displayRooms.length})`}</h3>
      {displayRooms.length===0&&<p className="py-6 text-center text-sm text-slate-500">Nenhuma conversa. Encontre alguém no diretório para começar!</p>}
      {displayRooms.map(room=>{
       const status=room.network_participants.find(p=>p.user_id===uid)?.status;
       return <button key={room.id} onClick={()=>setActiveId(room.id)}
        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${activeId===room.id?"border-pink-300 bg-pink-50":"border-slate-100 hover:bg-slate-50"}`}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-950/10">{room.kind==="group"?<Users size={18}/>:<MessageCircle size={18}/>}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{titleFor(room)}</span>
         <span className="text-xs text-slate-500">{status==="invited"?"Convite recebido":status==="accepted"?"Conversa privada":"Aguardando convite"}</span>
        </span>
       </button>;
      })}
     </>}
     {(pane==="people"||pane==="newgroup")&&<>
       {!ready&&<p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Para convidar outras participantes, ative a visibilidade no seu perfil acima.</p>}
       <label htmlFor="person-search" className="sr-only">Buscar pessoas da comunidade</label>
       <input id="person-search" className="input" placeholder="Buscar pelo nome ou interesse..." value={search} onChange={e=>setSearch(e.target.value)}/>
       {pane==="newgroup"&&<><label htmlFor="group-name" className="label">Nome do grupo</label><input id="group-name" className="input" maxLength={70} placeholder="Ex.: Mulheres em Investment Banking" value={groupTitle} onChange={e=>setGroupTitle(e.target.value)}/><p className="text-xs text-slate-500">Selecione entre 2 e 8 pessoas; cada uma decide aceitar ou não.</p></>}
       <div className="max-h-80 space-y-2 overflow-y-auto">
        {available.length===0&&<p className="py-4 text-center text-sm text-slate-500">Nenhuma participante encontrada. Cada pessoa precisa ativar sua visibilidade.</p>}
        {available.map(person=><div key={person.user_id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3">
          <div className="min-w-0"><p className="truncate text-sm font-bold">{person.display_name}</p><p className="line-clamp-2 text-xs text-slate-500">{person.headline||"Participante da Her Way"}</p></div>
          {pane==="people"?<button className="btn-secondary shrink-0 !px-2 !py-2" disabled={!ready||busy} onClick={()=>void createRoom([person.user_id])} aria-label={`Convidar ${person.display_name}`}><UserPlus size={17}/></button>:
           <input type="checkbox" className="h-4 w-4 shrink-0 accent-pink-500" disabled={!ready} checked={selected.includes(person.user_id)} onChange={e=>setSelected(v=>e.target.checked?[...v,person.user_id].slice(0,8):v.filter(x=>x!==person.user_id))}/>}
        </div>)}
       </div>
       {pane==="newgroup"&&<button className="btn-primary w-full justify-center" disabled={!ready||busy||selected.length<2||groupTitle.trim().length<3} onClick={()=>void createRoom(selected)}><Users size={16}/> Criar grupo e convidar ({selected.length})</button>}
     </>}
    </section>
    {blocked.length>0&&<section className="card space-y-2 p-4"><h3 className="text-sm font-bold">Contas bloqueadas</h3>{blocked.map(id=><div key={id} className="flex items-center justify-between text-xs"><span>Conta …{id.slice(-6)}</span><button className="text-pink-600 underline" onClick={()=>void unblock(id)}>Desbloquear</button></div>)}</section>}
   </aside>
   <section className="card flex min-h-[630px] flex-col overflow-hidden p-0">
    {!active?<div className="grid min-h-[540px] flex-1 place-items-center p-6 text-center text-slate-600">
     <div><MessageCircle className="mx-auto mb-3 text-pink-500" size={36}/><h2 className="text-xl font-bold text-navy-950">Suas conversas em um só lugar</h2>
      <p className="mt-2 max-w-md text-sm">Procure uma participante, envie um convite e converse após ela aceitar. Você também pode criar grupos privados.</p>
      <button className="btn-primary mx-auto mt-5" onClick={()=>setPane("people")}><Search size={17}/> Encontrar pessoas</button>
     </div>
    </div>:<>
     <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
       <div className="flex min-w-0 items-center gap-3"><button onClick={()=>setActiveId(null)} aria-label="Voltar às conversas" className="lg:hidden"><ArrowLeft size={18}/></button><span className="rounded-full bg-pink-50 p-2">{active.kind==="group"?<Users size={18}/>:<Lock size={18}/>}</span>
        <div className="min-w-0"><h2 className="truncate font-bold">{titleFor(active)}</h2><p className="text-xs text-slate-500">{active.kind==="group"?`Grupo por convite · ${accepted.length} membros ativos`:"Conversa privada entre duas pessoas"}</p></div>
       </div>
       <span className="flex items-center gap-1 text-xs text-slate-500"><ShieldCheck size={15}/> Privado</span>
     </div>
     {membership==="invited"?<div className="grid flex-1 place-items-center p-5 text-center"><div><UserPlus className="mx-auto mb-3 text-pink-500" size={34}/><h3 className="font-bold">Você recebeu um convite</h3><p className="mt-2 text-sm text-slate-600">Aceite para participar desta conversa. Nada será enviado em seu nome.</p><div className="mt-4 flex justify-center gap-2"><button className="btn-secondary" disabled={busy} onClick={()=>void respond(active.id,"declined")}>Recusar</button><button className="btn-primary" disabled={busy} onClick={()=>void respond(active.id,"accepted")}><Check size={16}/> Aceitar convite</button></div></div></div>:
      <><div className="h-[460px] flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
       {safeMessages.length===0&&<p className="py-16 text-center text-sm text-slate-500">Esta conversa ainda não tem mensagens.</p>}
       {safeMessages.map(m=>{
        const own=m.user_id===uid;
        return <div key={m.id} className={`flex ${own?"justify-end":"justify-start"}`}><div className={`max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[78%] ${own?"bg-pink-500 text-white":"bg-white text-navy-950 shadow-sm"}`}>
         <div className="flex justify-between gap-4"><span className="text-xs font-semibold">{nameFor(m.user_id)}</span><time className="text-[10px] opacity-70">{fmt(m.created_at)}</time></div>
         <p className="mt-2 whitespace-pre-wrap break-words text-sm">{m.body}</p>
         <div className="mt-2 flex justify-end gap-3 text-[11px]">{!own&&<><button onClick={()=>{setReportId(m.id);setError("");}} className="inline-flex items-center gap-1 hover:underline"><Flag size={12}/> Denunciar</button><button className="inline-flex items-center gap-1 hover:underline" onClick={()=>void block(m.user_id)}><Ban size={12}/> Bloquear</button></>}
           {own&&<button className="inline-flex items-center gap-1 hover:underline" onClick={()=>void deleteMessage(m.id)}><Trash2 size={12}/> Apagar</button>}
         </div>
        </div></div>;
       })}
      </div>
      <form onSubmit={send} className="border-t border-slate-100 p-4">
       {active.kind==="direct"&&accepted.length<2&&<p className="mb-2 text-xs text-amber-700">Aguardando a outra participante aceitar o convite.</p>}
       <label className="sr-only" htmlFor="connections-message">Mensagem privada</label>
       <textarea id="connections-message" rows={2} className="input resize-y" maxLength={700} placeholder="Escreva sua mensagem (sem links ou dados sensíveis)..." value={composer} onChange={e=>setComposer(e.target.value)} disabled={!nowVisible||busy||(active.kind==="direct"&&accepted.length<2)}/>
       <div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-slate-500">{composer.length}/700 · 5 mensagens/min</span><button className="btn-primary" type="submit" disabled={!nowVisible||busy||!composer.trim()||(active.kind==="direct"&&accepted.length<2)}><Send size={16}/> Enviar</button></div>
      </form></>}
    </>}
   </section>
  </div>
  <div className="grid gap-4 lg:grid-cols-2">
   <section className="card p-5"><button className="flex w-full items-center justify-between font-bold" onClick={()=>setRules(!rules)} aria-expanded={rules}><span className="flex items-center gap-2"><ShieldCheck size={18} className="text-pink-500"/> Segurança e privacidade</span>{rules?<X size={16}/>:<Plus size={16}/>}</button>
    {rules&&<p className="mt-3 text-sm leading-6 text-slate-600">Só quem aceitar um convite pode ler ou enviar mensagens naquela conversa. Seu e-mail e currículo não aparecem no diretório. Não envie dados pessoais, links, promessas de investimentos ou conteúdo ofensivo. Denúncias são analisadas por administradoras e não existe monitoramento 24 horas.</p>}
   </section>
   {isAdmin&&<section className="card space-y-3 p-5"><h2 className="flex items-center gap-2 font-bold"><Flag size={17} className="text-pink-500"/> Denúncias à moderação</h2>
    {reports.length===0?<p className="text-sm text-slate-500">Nenhuma denúncia pendente.</p>:reports.map(r=><div key={r.report_id} className="rounded-xl border p-3 text-sm"><p className="text-xs text-slate-500">{reasons.find(x=>x.value===r.reason)?.label||r.reason} · {fmt(r.created_at)}</p><p className="mt-2 break-words">{r.body}</p><button className="mt-2 text-xs font-semibold text-rose-700 underline" onClick={()=>void deleteMessage(r.message_id,true)}>Excluir mensagem denunciada</button></div>)}
   </section>}
  </div>
  {reportId!==null&&<div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/70 p-4" role="dialog" aria-modal="true" aria-label="Denunciar mensagem"><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-center justify-between"><h3 className="font-bold">Denunciar mensagem</h3><button onClick={()=>setReportId(null)} aria-label="Fechar"><X size={18}/></button></div><p className="mt-2 text-sm text-slate-600">A equipe de moderação poderá analisar somente a mensagem denunciada.</p><label htmlFor="reason" className="label mt-4">Motivo</label><select className="input" id="reason" value={reportReason} onChange={e=>setReportReason(e.target.value)}>{reasons.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select><div className="mt-5 flex justify-end gap-2"><button className="btn-secondary" onClick={()=>setReportId(null)}>Cancelar</button><button className="btn-primary" disabled={busy} onClick={()=>void reportMessage()}>Enviar denúncia</button></div></div></div>}
 </div>;
}
