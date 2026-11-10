"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, BookOpen, Briefcase, GraduationCap, HeartHandshake, Lock, RefreshCw, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { PageHeader, Stat } from "@/components/ui";

type Snapshot = {
  a: number; b: number; unclassified: number;
  progressCompleted: number; matched: number; applications: number; outcomes: number;
  courses: number; published: number;
};
const zero: Snapshot = { a:0,b:0,unclassified:0,progressCompleted:0,matched:0,applications:0,outcomes:0,courses:0,published:0 };
export default function Admin() {
  const { view, setView, isAdmin } = useStore();
  const [stats,setStats] = useState<Snapshot | null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [revision,setRevision] = useState(0);
  useEffect(() => {
    if (!isAdmin || view !== "admin" || !supabase) return;
    let alive=true;
    const client=supabase;
    async function load() {
      setLoading(true);setError("");
      const [profiles,completed,matches,applications,outcomes,catalog] = await Promise.all([
        client.from("profiles").select("track_type"),
        client.from("modules_progress").select("id",{count:"exact",head:true}).not("completed_at","is",null),
        client.from("mentorship_matches").select("id",{count:"exact",head:true}),
        client.from("applications").select("id",{count:"exact",head:true}),
        client.from("career_outcomes").select("id",{count:"exact",head:true}),
        client.from("learning_modules").select("published"),
      ]);
      if(!alive)return;
      const requests=[profiles,completed,matches,applications,outcomes,catalog];
      const err=requests.find(r=>r.error)?.error;
      if(err){setStats(null);setError("Não foi possível carregar os indicadores reais: "+err.message);setLoading(false);return;}
      const list=profiles.data??[],courses=catalog.data??[];
      setStats({
        a:list.filter(p=>p.track_type==="A").length,
        b:list.filter(p=>p.track_type==="B").length,
        unclassified:list.filter(p=>!p.track_type).length,
        progressCompleted:completed.count??0,matched:matches.count??0,
        applications:applications.count??0,outcomes:outcomes.count??0,
        courses:courses.length,published:courses.filter(c=>c.published).length,
      });setLoading(false);
    }
    void load();return()=>{alive=false};
  },[isAdmin,view,revision]);
  if(!isAdmin||view!=="admin")return <div className="card mx-auto mt-10 max-w-md p-8 text-center">
    <Lock className="mx-auto text-pink-500" size={40}/>
    <h1 className="mt-4 text-xl font-extrabold">Área restrita</h1>
    <p className="mt-2 text-sm text-slate-600">Apenas contas administradoras autorizadas podem consultar estes dados.</p>
    {isAdmin&&<button className="btn-primary mt-6" onClick={()=>setView("admin")}>Entrar na administração</button>}
  </div>;
  const S=stats??zero,total=S.a+S.b+S.unclassified;
  return <div className="space-y-6">
    <PageHeader title="Painel de Impacto" subtitle="Indicadores consultados no Supabase. Nenhuma estatística fictícia é exibida."/>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500">{loading?"Carregando indicadores...":error?"Dados indisponíveis":"Dados reais da plataforma · Atualizados ao recarregar"}</p>
      <button className="btn-secondary" disabled={loading} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={16}/> Atualizar dados</button>
    </div>
    {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {loading?<div className="card p-8 text-slate-500">Consultando a base de dados...</div>:
    stats&&<>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Contas cadastradas" value={total} hint={`Jornada A: ${S.a} · Jornada B: ${S.b} · Sem jornada: ${S.unclassified}`} icon={<Users size={18} className="text-navy-800"/>}/>
        <Stat label="Módulos concluídos" value={S.progressCompleted} hint="Total de registros de conclusão, não usuários únicos" icon={<GraduationCap size={18} className="text-pink-500"/>}/>
        <Stat label="Solicitações de mentoria" value={S.matched} hint="Registros de pareamento, não sessões realizadas" icon={<HeartHandshake size={18} className="text-pink-500"/>}/>
        <Stat label="Desfechos profissionais" value={S.outcomes} hint="Contratações, promoções ou estágios registrados" icon={<Briefcase size={18} className="text-navy-800"/>}/>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-6"><h2 className="flex items-center gap-2 font-bold"><BarChart3 size={18}/> Inscritas por jornada</h2>
          <div className="mt-5 space-y-3 text-sm">
            {[[ "Primeiros Passos",S.a ],["Novos Horizontes",S.b],["Ainda não escolheram",S.unclassified]].map(([label,n])=>
              <div key={label}><div className="mb-1 flex justify-between"><span>{label}</span><strong>{n}</strong></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-pink-500" style={{width:`${total?Number(n)/total*100:0}%`}}/></div></div>)}
          </div>{total===0&&<p className="mt-4 text-xs text-slate-500">Nenhuma conta encontrada.</p>}
        </section>
        <section className="card p-6"><h2 className="flex items-center gap-2 font-bold"><BookOpen size={18}/> Conteúdos educativos</h2>
          <p className="mt-4 text-3xl font-extrabold">{S.courses}</p><p className="text-sm text-slate-600">Módulos importados · {S.published} publicados</p>
          <Link href="/admin/conteudos" className="btn-primary mt-5">Gerenciar conteúdos</Link>
        </section>
        <section className="card p-6"><h2 className="flex items-center gap-2 font-bold"><Briefcase size={18}/> Candidaturas registradas</h2><p className="mt-4 text-3xl font-extrabold">{S.applications}</p><p className="text-sm text-slate-600">Registros no banco de dados; não equivalem a entrevistas ou contratações.</p></section>
        <section className="card p-6"><h2 className="flex items-center gap-2 font-bold"><HeartHandshake size={18}/> Mentorias</h2><p className="mt-4 text-3xl font-extrabold">{S.matched}</p><p className="text-sm text-slate-600">Solicitações registradas, sujeitas a confirmação pela equipe.</p></section>
      </div>
    </>}
  </div>;
}
