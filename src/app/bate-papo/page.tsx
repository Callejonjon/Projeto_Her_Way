"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, Flag, MessageCircle, Send, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui";

type Message = {
  id:number; user_id:string; sender_name:string; body:string; created_at:string;
};
type Report = {
  id:number; reason:string; created_at:string; message_id:number;
  community_messages:{body:string;sender_name:string}|null;
};
type Block={blocked_id:string};
const LIMIT=100;
const maxLength=700;
const reasons=[
  {value:"assedio",label:"Assédio ou intimidação"},
  {value:"spam",label:"Spam ou publicidade"},
  {value:"conteudo_inadequado",label:"Conteúdo inadequado"},
  {value:"outro",label:"Outro motivo"},
];

function timeStamp(value:string):string {
  try{return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}
  catch{return "";}
}

export default function BatePapo(){
  const {authUser,isAdmin}=useStore();
  const [messages,setMessages]=useState<Message[]>([]);
  const [blocks,setBlocks]=useState<Set<string>>(new Set());
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [reportId,setReportId]=useState<number|null>(null);
  const [reason,setReason]=useState("assedio");
  const [reports,setReports]=useState<Report[]>([]);
  const [loading,setLoading]=useState(true);
  const [openRules,setOpenRules]=useState(false);
  const bottom=useRef<HTMLDivElement|null>(null);

  const refresh=useCallback(async()=>{
    if(!supabase||!authUser)return;
    const [msgs,blks]=await Promise.all([
      supabase.from("community_messages").select("id,user_id,sender_name,body,created_at").order("created_at",{ascending:false}).limit(LIMIT),
      supabase.from("community_blocks").select("blocked_id").eq("blocker_id",authUser.id),
    ]);
    if(msgs.error)setError("Não foi possível buscar as mensagens: "+msgs.error.message);
    else setMessages(((msgs.data??[]) as Message[]).reverse());
    if(!blks.error)setBlocks(new Set(((blks.data??[]) as Block[]).map(b=>b.blocked_id)));
    setLoading(false);
  },[authUser]);

  const loadReports=useCallback(async()=>{
    if(!supabase||!isAdmin)return;
    const {data,error}=await supabase.from("community_reports")
      .select("id,reason,created_at,message_id,community_messages(body,sender_name)")
      .order("created_at",{ascending:false}).limit(40);
    if(error){setError("Falha ao consultar denúncias: "+error.message);return;}
    // Supabase relation representation may differ between older client types.
    setReports((data??[]).map(d=>({
      id:d.id,reason:d.reason,created_at:d.created_at,message_id:d.message_id,
      community_messages:Array.isArray(d.community_messages)
        ? (d.community_messages[0]??null) : (d.community_messages??null),
    })) as Report[]);
  },[isAdmin]);

  useEffect(()=>{
    if(!supabase||!authUser)return;
    void refresh();
    if(isAdmin)void loadReports();
    const chan=supabase.channel("herway-community")
      .on("postgres_changes",{event:"*",schema:"public",table:"community_messages"},()=>{
        void refresh();
      }).subscribe();
    // Event fallback for blocked/reported events and unstable websockets.
    const interval=setInterval(()=>{void refresh();if(isAdmin)void loadReports();},20000);
    return()=>{clearInterval(interval);void supabase?.removeChannel(chan);};
  },[authUser,refresh,isAdmin,loadReports]);

  useEffect(()=>{
    if(messages.length)bottom.current?.scrollIntoView({behavior:"smooth",block:"nearest"});
  },[messages.length]);

  async function send(e:React.FormEvent){
    e.preventDefault();
    const text=message.trim();
    if(!supabase||!authUser||busy||!text)return;
    if(text.length>maxLength){setError("A mensagem excede 700 caracteres.");return;}
    if(/https?:\/\/|www\./i.test(text)){setError("Para proteger a comunidade, não é permitido enviar links.");return;}
    setBusy(true);setError("");setSuccess("");
    const {error}=await supabase.from("community_messages").insert({user_id:authUser.id,body:text});
    if(error)setError(error.message);
    else{setMessage("");await refresh();}
    setBusy(false);
  }

  async function toggleBlock(userId:string){
    if(!supabase||!authUser||userId===authUser.id)return;
    setError("");setSuccess("");
    if(blocks.has(userId)){
      const {error}=await supabase.from("community_blocks").delete().eq("blocker_id",authUser.id).eq("blocked_id",userId);
      if(error){setError(error.message);return;}
      setSuccess("Usuária desbloqueada.");
    }else{
      const {error}=await supabase.from("community_blocks").insert({blocker_id:authUser.id,blocked_id:userId});
      if(error){setError(error.message);return;}
      setSuccess("Usuária bloqueada. As mensagens dela ficam ocultas para você.");
    }
    await refresh();
  }

  async function report(){
    if(!supabase||!authUser||reportId===null)return;
    setBusy(true);setError("");
    const {error}=await supabase.from("community_reports")
      .insert({message_id:reportId,reporter_id:authUser.id,reason});
    if(error)setError(error.code==="23505"?"Você já denunciou esta mensagem.":error.message);
    else{setSuccess("Denúncia enviada à moderação da Her Way.");setReportId(null);if(isAdmin)void loadReports();}
    setBusy(false);
  }

  async function deleteMessage(id:number){
    if(!supabase)return;
    const ok=window.confirm("Excluir esta mensagem da comunidade?");
    if(!ok)return;
    const {error}=await supabase.from("community_messages").delete().eq("id",id);
    if(error)setError(error.message);
    else{setSuccess("Mensagem excluída.");await refresh();if(isAdmin)void loadReports();}
  }

  if(!authUser||!supabase)return <div className="card p-6 text-center">Entre na sua conta para acessar a comunidade.</div>;

  const available=messages.filter(m=>!blocks.has(m.user_id));
  return <div className="space-y-5">
    <PageHeader eyebrow="Comunidade Her Way" title="Bate-papo" subtitle="Um espaço para trocar experiências, dúvidas de carreira e oportunidades com outras mulheres da comunidade."/>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="card flex min-h-[520px] flex-col overflow-hidden p-0" aria-label="Conversa da comunidade">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2"><MessageCircle size={20} className="text-pink-500"/><h2 className="font-bold">Conversa geral</h2></div>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Users size={14}/> Somente usuárias cadastradas</span>
        </div>
        <div className="h-[460px] flex-1 space-y-4 overflow-y-auto bg-slate-50/70 px-4 py-5 sm:px-5" role="log" aria-label="Mensagens da comunidade" aria-live="polite" aria-relevant="additions">
          {loading&&<p className="text-center text-sm text-slate-500">Carregando conversas...</p>}
          {!loading&&available.length===0&&<div className="grid h-64 place-items-center text-center text-slate-500"><div><MessageCircle className="mx-auto mb-3 text-pink-400" size={30}/><p className="font-semibold">A conversa está começando!</p><p className="mt-1 text-sm">Compartilhe uma dúvida ou uma conquista da sua jornada.</p></div></div>}
          {available.map(m=>{
            const own=m.user_id===authUser.id;
            return <article key={m.id} className={`flex ${own?"justify-end":"justify-start"}`}>
              <div className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[80%] ${own?"bg-pink-500 text-white":"border border-slate-100 bg-white text-navy-950"}`}>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span className="text-xs font-bold">{own?"Você":m.sender_name}</span>
                  <time className={`text-[10px] ${own?"text-white/80":"text-slate-500"}`} dateTime={m.created_at}>{timeStamp(m.created_at)}</time>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{m.body}</p>
                <div className="mt-2 flex flex-wrap items-center justify-end gap-3 text-[11px]">
                  {!own&&<><button onClick={()=>{setReportId(m.id);setReason("assedio");setError("");}} className="inline-flex items-center gap-1 hover:underline"><Flag size={12}/> Denunciar</button>
                    <button onClick={()=>void toggleBlock(m.user_id)} className="inline-flex items-center gap-1 hover:underline"><Ban size={12}/> Bloquear</button></>}
                  {(own||isAdmin)&&<button onClick={()=>void deleteMessage(m.id)} className="inline-flex items-center gap-1 hover:underline"><Trash2 size={12}/> Excluir</button>}
                </div>
              </div>
            </article>;
          })}
          <div ref={bottom}/>
        </div>
        <form onSubmit={send} className="border-t border-slate-100 bg-white p-4">
          <label htmlFor="community-composer" className="sr-only">Escrever mensagem</label>
          <textarea id="community-composer" rows={2} maxLength={maxLength} className="input min-h-20 resize-y"
            value={message} onChange={e=>setMessage(e.target.value)} placeholder="Escreva para a comunidade... (sem links ou dados pessoais)" />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500">{message.length}/{maxLength} caracteres · até 5 mensagens/minuto</span>
            <button type="submit" className="btn-primary" disabled={busy||!message.trim()}><Send size={16}/>{busy?"Enviando...":"Enviar mensagem"}</button>
          </div>
          {error&&<p role="alert" className="mt-2 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
          {success&&<p role="status" className="mt-2 flex items-center gap-1 text-sm text-emerald-700"><CheckCircle2 size={15}/>{success}</p>}
        </form>
      </section>

      <aside className="space-y-4">
        <section className="card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-bold"><ShieldCheck size={19} className="text-pink-500"/> Segurança e convivência</h2>
          <p className="text-sm leading-6 text-slate-600">Este é um espaço comunitário: suas mensagens e seu primeiro nome de perfil ficarão visíveis para outras participantes.</p>
          <button className="text-sm font-semibold text-pink-600 hover:underline" aria-expanded={openRules} onClick={()=>setOpenRules(v=>!v)}> {openRules?"Ocultar regras":"Ler regras da comunidade"} </button>
          {openRules&&<ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>Respeite opiniões e trajetórias; assédio e discriminação não são permitidos.</li>
            <li>Não publique telefone, endereço, senhas, documentos ou dados financeiros pessoais.</li>
            <li>Não envie links, spam, publicidade ou promessas de investimento.</li>
            <li>Use Denunciar e Bloquear se uma conversa ficar desconfortável.</li>
            <li>A moderação pode retirar mensagens que violem as regras.</li>
          </ul>}
          <p className="text-xs text-slate-500">Não compartilhe informações sensíveis. A Her Way não monitora todas as mensagens em tempo real.</p>
        </section>
        {blocks.size>0&&<section className="card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-bold"><Ban size={18} className="text-pink-500"/> Contas bloqueadas ({blocks.size})</h2>
          <p className="text-xs text-slate-500">Você não verá mensagens destas contas. É possível desbloqueá-las quando quiser.</p>
          {[...blocks].map(id=><div key={id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-2 text-xs">
            <span className="text-slate-600">Conta …{id.slice(-6)}</span>
            <button className="font-semibold text-pink-600 hover:underline" onClick={()=>void toggleBlock(id)}>Desbloquear</button>
          </div>)}
        </section>}
        {isAdmin&&<section className="card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-bold"><Flag size={18} className="text-pink-500"/> Denúncias recebidas</h2>
          <p className="text-xs text-slate-500">Somente administradoras visualizam denúncias da comunidade.</p>
          {reports.length===0?<p className="text-sm text-slate-500">Nenhuma denúncia recente.</p>:
            reports.map(r=><div key={r.id} className="rounded-xl border border-slate-200 p-3 text-xs">
              <p className="font-semibold">{reasons.find(x=>x.value===r.reason)?.label??r.reason}</p>
              <p className="mt-1 break-words text-slate-600">{r.community_messages?.sender_name}: {r.community_messages?.body?.slice(0,120)}</p>
              <button className="mt-2 inline-flex items-center gap-1 text-rose-600 hover:underline" onClick={()=>void deleteMessage(r.message_id)}><Trash2 size={13}/> Excluir mensagem denunciada</button>
            </div>)}
        </section>}
      </aside>
    </div>
    {reportId!==null&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4" role="dialog" aria-modal="true" aria-label="Denunciar mensagem">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-bold"><AlertTriangle size={19} className="text-pink-500"/> Denunciar mensagem</h2><button onClick={()=>setReportId(null)} aria-label="Fechar denúncia"><X size={20}/></button></div>
        <p className="mb-4 text-sm text-slate-600">A moderação analisará a denúncia. A pessoa denunciada não recebe sua identidade.</p>
        <label htmlFor="report-reason" className="label">Motivo</label>
        <select id="report-reason" className="input" value={reason} onChange={e=>setReason(e.target.value)}>{reasons.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
        <div className="mt-5 flex justify-end gap-2"><button className="btn-secondary" onClick={()=>setReportId(null)}>Cancelar</button><button className="btn-primary" disabled={busy} onClick={()=>void report()}>Enviar denúncia</button></div>
        {error&&<p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      </div>
    </div>}
  </div>;
}
