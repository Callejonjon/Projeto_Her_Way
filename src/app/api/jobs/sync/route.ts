import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { isFinanceJob } from "@/lib/engine";
import type { Area, Job, JobLevel } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =============================================================================
   /api/jobs/sync — Automação híbrida de vagas
   1. Busca vagas via APIs abertas Himalayas e Jobicy
   2. Filtra por relevância (somente finanças; vagas de dados/tecnologia são descartadas) e PADRONIZA no formato da tabela `jobs`
   3. Faz upsert no Supabase (dedupe por source_url) quando a SERVICE_ROLE_KEY existe
   Disparo: Vercel Cron (GET diário, vercel.json) ou botão "Sincronizar feeds" (POST).
   Escrita no banco exige CRON_SECRET (se configurado) para evitar abuso.
   ============================================================================= */

const API_SOURCES = [
  {name:"himalayas",url:"https://himalayas.app/jobs/api/search?country=BR&q=finance&sort=recent"},
  {name:"himalayas",url:"https://himalayas.app/jobs/api/search?country=BR&q=investment&sort=recent"},
  {name:"jobicy",url:"https://jobicy.com/api/jobs?count=50&industry=finance"},
];

const RELEVANT = /(financ|finance|invest|asset|credit|crédito|credito|risk|risco|bank|banc|treasury|tesour|research|equity|analyst|analista|accounting|contab|fp&a|controller|quant)/i;

const AREA_RULES: [RegExp, Area][] = [
  [/(credit|crédito|credito|risk|risco|loan|underwrit)/i, "Crédito"],
  [/(m&a|investment bank|ib\b|corporate finance|capital markets)/i, "Investment Banking"],
  [/(research|equity analyst|economist)/i, "Research"],
  [/(asset|portfolio|wealth|invest|fund|private)/i, "Asset Management"],
];
const SKILL_RULES: [RegExp, string][] = [
  [/excel/i, "Excel"], [/python/i, "Python"], [/power\s?bi/i, "Power BI"], [/\bsql\b/i, "SQL"],
  [/cpa-?20|anbima/i, "CPA-20"], [/english|inglês|ingles/i, "Inglês"], [/valuation|dcf/i, "Valuation"],
  [/financial statements|balance sheet|balanço|accounting/i, "Análise de Balanço"],
];

const stripHtml = (s = "") => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

function normalize(raw: { title: string; company: string; description: string; url: string; location?: string; date?: string }, source: string): Job {
  const text = `${raw.title} ${raw.description}`;
  const area = AREA_RULES.find(([r]) => r.test(text))?.[1] ?? "Asset Management";
  const level: JobLevel = /intern|estágio|estagio|trainee/i.test(raw.title) ? "Estágio"
    : /senior|sênior|sr\.?|lead|manager|pleno|mid/i.test(raw.title) ? "Pleno" : "Júnior";
  return {
    id: `sync-${Buffer.from(raw.url).toString("base64url").slice(-16)}`,
    title: raw.title.trim(),
    company: raw.company?.trim() || "Empresa não informada",
    area,
    modality: "Remoto",
    level_required: level,
    skills_tags: SKILL_RULES.filter(([r]) => r.test(text)).map(([, s]) => s),
    description: stripHtml(raw.description).slice(0, 400),
    location: raw.location || "Remoto",
    source,
    source_url: raw.url,
    is_exclusive: false,
    created_at: raw.date ? new Date(raw.date).toISOString() : new Date().toISOString(),
  };
}


async function fromApis(): Promise<Job[]> {
  const out: Job[] = [];
  for(const src of API_SOURCES){
    try{
      const headers: Record<string,string> = {"User-Agent":"HerWay-JobSync/1.0"};
      if(src.name==="himalayas" && process.env.HIMALAYAS_API_KEY)
        headers.Authorization="Bearer "+process.env.HIMALAYAS_API_KEY;
      const response=await fetch(src.url,{headers,signal:AbortSignal.timeout(9500),cache:"no-store"});
      if(!response.ok){ console.warn("[jobs/sync]",src.name,response.status); continue; }
      const data=await response.json() as {jobs?:Record<string,unknown>[]};
      for(const j of data.jobs??[]){
        let raw: {title:string;company:string;description:string;url:string;location?:string;date?:string};
        if(src.name==="himalayas"){
          const expiry=typeof j.expiryDate==="number"?j.expiryDate:0;
          if(expiry && expiry*1000<Date.now())continue;
          const restrictions=Array.isArray(j.locationRestrictions)?j.locationRestrictions:[];
          const codes=restrictions.map((v: {alpha2?:string})=>String(v.alpha2??""));
          if(codes.length&&!codes.includes("BR"))continue;
          raw={
            title:String(j.title??""),company:String(j.companyName??""),
            description:String(j.description??j.excerpt??""),
            url:String(j.applicationLink??""),
            location:codes.length?"Brasil · remoto":"Remoto internacional (verificar elegibilidade)",
            date:typeof j.pubDate==="number"?new Date(j.pubDate*1000).toISOString():undefined,
          };
        }else{
          raw={
            title:String(j.jobTitle??""),company:String(j.companyName??""),
            description:String(j.jobDescription??j.jobExcerpt??""),
            url:String(j.url??""),
            location:String(j.jobGeo??"Remoto"),
            date:typeof j.pubDate==="string"?j.pubDate:undefined,
          };
        }
        if(raw.title && raw.company && raw.url.startsWith("https://")) out.push(normalize(raw,src.name));
      }
    }catch(err){console.warn("[jobs/sync]",src.name,(err as Error).message)}
  }
  return out;
}


async function handler(req: Request) {
  const db=createServiceClient();
  if(!db)return NextResponse.json({error:"Configure SUPABASE_SERVICE_ROLE_KEY no servidor."},{status:503});
  const authorization=req.headers.get("authorization")??"";
  const secret=process.env.CRON_SECRET;
  const byCron=req.method==="GET" && !!secret && authorization==="Bearer "+secret;
  let byAdmin=false;
  if(req.method==="POST" && authorization.startsWith("Bearer ")){
    const token=authorization.slice(7);
    const {data:{user},error}=await db.auth.getUser(token);
    if(user&&!error){
      const result=await db.from("profiles").select("is_admin").eq("id",user.id).maybeSingle();
      byAdmin=result.data?.is_admin===true;
    }
  }
  if(!byCron&&!byAdmin)return NextResponse.json({error:"Acesso restrito à administração."},{status:403});
  const all=await fromApis();
  const unique=[...new Map(all.filter(j=>
    j.source_url && RELEVANT.test(j.title+" "+j.description) && isFinanceJob(j)
  ).map(j=>[j.source_url,j] as const)).values()];
  if(!unique.length)return NextResponse.json({fetched:0,saved:0,sources:[],jobs:[]});
  const rows=unique.map(({id:_id,...rest})=>rest);
  const {error,count}=await db.from("jobs").upsert(rows,{onConflict:"source_url",count:"exact"});
  if(error){
    console.error("[jobs/sync] upsert",error.message);
    return NextResponse.json({error:"Falha ao salvar vagas no Supabase.",fetched:unique.length,saved:0},{status:502});
  }
  return NextResponse.json({fetched:unique.length,saved:count??rows.length,sources:[...new Set(unique.map(j=>j.source))],jobs:unique.slice(0,30)});
}

export const GET = handler;
export const POST = handler;
